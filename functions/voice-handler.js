const { OpenAI } = require('openai');

// Simple conversation history for current session
let conversationHistory = [];
let currentCallSid = null;

// Cache system prompt and knowledge base per deployment (static assets)
let cachedSystemPrompt = null;
let cachedKnowledgeBase = null;
let isDataLoaded = false;

// Track recording attempts per call
let recordingAttempts = new Map();

// Retry recording with exponential backoff
async function attemptRecording(context, callSid, attempt = 1, maxAttempts = 3) {
    const client = context.getTwilioClient();
    const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s delays
    
    try {
        console.log(`📹 Recording attempt ${attempt}/${maxAttempts} for call ${callSid}`);
        
        if (attempt > 1) {
            console.log(`⏱️  Waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        const recording = await client.calls(callSid).recordings.create({
            recordingChannels: 'dual',
            recordingTrack: 'both',
            recordingStatusCallback: '/recording-handler'
        });
        
        console.log('✅ Recording started successfully:', recording.sid);
        recordingAttempts.delete(callSid); // Clean up tracking
        return recording;
        
    } catch (error) {
        console.error(`❌ Recording attempt ${attempt} failed:`, error.message);
        
        // Don't retry if it's a permanent limitation
        if (error.message.includes('not eligible for recording') || 
            error.code === 21218 || 
            error.code === 21219) {
            console.error('💡 Permanent recording limitation - stopping retries');
            recordingAttempts.delete(callSid);
            return null;
        }
        
        // Retry if we haven't exceeded max attempts
        if (attempt < maxAttempts) {
            console.log(`🔄 Will retry recording (${attempt + 1}/${maxAttempts})`);
            return attemptRecording(context, callSid, attempt + 1, maxAttempts);
        } else {
            console.error('❌ Max recording attempts reached');
            recordingAttempts.delete(callSid);
            return null;
        }
    }
}

// Start recording on first speech (delayed approach)
async function startRecordingOnFirstSpeech(context, callSid) {
    // Check if we've already attempted recording for this call
    if (recordingAttempts.has(callSid)) {
        console.log('📹 Recording already active for this call');
        return;
    }
    
    recordingAttempts.set(callSid, true);
    console.log('🎙️  Starting delayed recording on first speech input...');
    
    // Attempt recording with retries
    await attemptRecording(context, callSid);
}

// Helper function to ensure static data is loaded once per deployment
async function ensureDataLoaded(context) {
    if (!isDataLoaded) {
        console.log('📥 Loading system prompt and knowledge base (first time this deployment)...');
        
        try {
            cachedSystemPrompt = await loadSystemPrompt(context);
            cachedKnowledgeBase = await loadKnowledgeBase(context);
            
            isDataLoaded = true;
            console.log('✅ Static data loaded and cached for deployment');
        } catch (error) {
            console.error('❌ Error loading static data:', error);
            // Set fallback values
            cachedSystemPrompt = 'You are a helpful phone assistant. Keep responses brief and conversational.';
            cachedKnowledgeBase = {};
            isDataLoaded = true; // Mark as loaded even with fallback to avoid retrying
        }
    }
}



// Helper function to get voice configuration
function getVoiceConfig(context) {
    return {
        voice: context.VOICE || 'Google.en-AU-Neural2-C',
        language: context.LANGUAGE || 'en-AU'
    };
}

exports.handler = async function(context, event, callback) {
    // Create TwiML response object
    const twiml = new Twilio.twiml.VoiceResponse();
    
    try {
        // Get environment variables
        const openaiApiKey = context.OPENAI_API_KEY;
        const speechTimeout = parseInt(context.SPEECH_TIMEOUT) || 60;
        const speechEndTimeout = parseInt(context.SPEECH_END_TIMEOUT) || 1;
        const voiceConfig = getVoiceConfig(context);
        
        // Check if OpenAI API key is available
        if (!openaiApiKey) {
            console.error('OpenAI API key not found in environment variables');
            twiml.say(voiceConfig, 'AI service not configured');
            callback(null, twiml);
            return;
        }
        
        // Initialize OpenAI client
        const openai = new OpenAI({
            apiKey: openaiApiKey,
        });
        
        // Check what type of input we received
        const speechResult = event.SpeechResult;
        const confidence = event.Confidence;
        
        // Log basic call information
        console.log('Processing call:', event.CallSid);
        
        // More robust initial call detection - only true for very first call
        const isInitialCall = !speechResult && 
                              !event.Digits && 
                              !event.DialCallStatus;
        
        console.log('Initial call detected:', isInitialCall);
        
        if (speechResult) {
            // User has spoken - process with OpenAI
            console.log(`User input received (Confidence: ${confidence})`);
            
            // Start recording on first speech (delayed recording approach)
            await startRecordingOnFirstSpeech(context, event.CallSid);
            
            // Ensure static data is loaded (once per deployment)
            await ensureDataLoaded(context);
            
            // Reset conversation history for new calls
            if (currentCallSid !== event.CallSid) {
                currentCallSid = event.CallSid;
                conversationHistory = [];
            }
            
            // Generate response using OpenAI with conversation history
            const aiResponse = await generateAIResponse(
                openai, 
                speechResult,
                cachedSystemPrompt,
                conversationHistory,
                context
            );
            
            // Update conversation history
            conversationHistory.push({
                role: 'user',
                content: speechResult
            });
            conversationHistory.push({
                role: 'assistant',
                content: aiResponse
            });
            
            // Limit conversation history to last 10 exchanges (20 messages) to avoid token limits
            if (conversationHistory.length > 20) {
                conversationHistory = conversationHistory.slice(-20);
            }
            
            console.log(`AI response generated successfully (${conversationHistory.length / 2} exchanges remembered)`);
            
            // Check if AI response indicates a transfer request
            if (aiResponse.includes('Transferring to Yello customer service team')) {
                console.log('Transfer request detected - connecting to Yello customer service');
                
                // Inform the caller about the transfer
                twiml.say(voiceConfig, 'I\'ll transfer you to our customer service team now. Please hold.');
                
                // Transfer the call to the specified number
                twiml.dial({
                    timeout: 30,
                    record: 'record-from-ringing-dual',
                    action: '/transfer-status',
                    method: 'POST'
                }, '+18655516860');
                
                // Fallback message if transfer fails
                twiml.say(voiceConfig, 'Sorry, I was unable to connect you. Please try calling our customer service directly at 865-551-6860.');
                
            } else {
                // Normal conversation flow - provide AI response and continue
                twiml.say(voiceConfig, aiResponse);
                
                // Continue listening for more input
                twiml.gather({
                    input: 'speech',
                    timeout: speechTimeout,
                    speechTimeout: speechEndTimeout,
                    action: '/voice-handler',
                    method: 'POST'
                });
                
                // Fallback if no more input
                twiml.say(voiceConfig, 'Thank you for calling. Goodbye!');
            }
            
        } else if (isInitialCall) {
            // True initial call - welcome message with conversation start
            console.log('Initial call - starting welcome sequence');
            
            // Welcome message (starts immediately)
            twiml.say(voiceConfig, 'Welcome To Yello Rewards');
            
            // Small pause to let call stabilize
            twiml.pause({ length: 1 });
            
            console.log('📞 Initial call setup complete - recording will start on first speech input');
            
            // Gather for speech input
            const gather = twiml.gather({
                input: 'speech',
                timeout: speechTimeout,
                speechTimeout: speechEndTimeout,
                action: '/voice-handler',
                method: 'POST'
            });
            
            // Add the prompt inside the gather
            gather.say(voiceConfig, 'How may I help you today?');
            
            console.log('TwiML prepared - waiting for user input');
            
            // Fallback if no input
            twiml.say(voiceConfig, 'I did not hear anything for a while. Thank you for calling. Goodbye!');
            
        } else {
            // Any other case - continue conversation without repeating welcome
            console.log('Continuing conversation flow');
            
            // Gather for speech input
            const gather = twiml.gather({
                input: 'speech',
                timeout: speechTimeout,
                speechTimeout: speechEndTimeout,
                action: '/voice-handler',
                method: 'POST'
            });
            
            // Add the prompt inside the gather
            gather.say(voiceConfig, 'I would be happy to assist you today. How may I help you?');
            
            twiml.say(voiceConfig, 'I did not hear anything for a while. Thank you for calling. Goodbye!');
        }
        
    } catch (error) {
        console.error('Error in voice handler:', error);
        twiml.say(getVoiceConfig(context), 'An error occurred');
    }
    
    callback(null, twiml);
};



// AI response function with proper prompts
async function generateAIResponse(openai, userInput, systemPrompt, conversationHistory = [], context) {
    try {
        // Build enhanced prompt with context (using cached compressed data)
        const knowledgeBaseJson = JSON.stringify(cachedKnowledgeBase);
        const enhancedPrompt = `${systemPrompt}\n\nKnowledge Base for reference:\n${knowledgeBaseJson}\n\nImportant: Keep responses to 1-2 sentences maximum for voice conversation.`;
        
        console.log('Processing AI request for user input:', userInput);
        
        // Build messages with conversation history
        const messages = [
            {
                role: 'system',
                content: enhancedPrompt
            },
            ...conversationHistory,  // Include previous conversation
            {
                role: 'user',
                content: userInput
            }
        ];
        
        const completion = await openai.chat.completions.create({
            model: context.OPENAI_MODEL || 'gpt-3.5-turbo',
            messages: messages,
            max_tokens: 150,
            temperature: 0.3,
        });
        
        const response = completion.choices[0].message.content.trim();
        console.log('OpenAI response received:', response);
        return response;
        
    } catch (error) {
        console.error('Error generating AI response:', error);
        return 'I am having trouble right now';
    }
}

// Load system prompt from assets
async function loadSystemPrompt(context) {
    try {
        const response = await fetch(`https://${context.DOMAIN_NAME}/prompts/system-prompt.txt`);
        const prompt = await response.text();
        console.log('System prompt loaded successfully');
        return prompt;
    } catch (error) {
        console.error('Error loading system prompt:', error);
        return 'You are a helpful phone assistant. Keep responses brief and conversational.';
    }
}

// Load compressed knowledge base from single file
async function loadKnowledgeBase(context) {
    try {
        console.log('Loading compressed knowledge base...');
        const response = await fetch(`https://${context.DOMAIN_NAME}/data/knowledge-base.json`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const knowledgeBase = await response.json();
        
        // Log what was loaded
        const sections = Object.keys(knowledgeBase);
        const totalItems = Object.values(knowledgeBase)
            .filter(Array.isArray)
            .reduce((sum, arr) => sum + arr.length, 0);
        
        console.log(`✅ Compressed knowledge base loaded: ${sections.length} sections, ${totalItems} items`);
        console.log(`📋 Sections: ${sections.join(', ')}`);
        
        return knowledgeBase;
        
    } catch (error) {
        console.error('❌ Error loading compressed knowledge base:', error.message);
        return {};
    }
}
