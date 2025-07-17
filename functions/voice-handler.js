const { OpenAI } = require('openai');

// Simple conversation history for current session
let conversationHistory = [];

exports.handler = async function(context, event, callback) {
    // Create TwiML response object
    const twiml = new Twilio.twiml.VoiceResponse();
    
    try {
        // Get environment variables
        const openaiApiKey = context.OPENAI_API_KEY;
        const speechTimeout = parseInt(context.SPEECH_TIMEOUT) || 60;
        const speechEndTimeout = parseInt(context.SPEECH_END_TIMEOUT) || 1;
        
        // Check if OpenAI API key is available
        if (!openaiApiKey) {
            console.error('OpenAI API key not found in environment variables');
            twiml.say({
                voice: 'Polly.Joanna',
                language: 'en-US'
            }, 'AI service not configured');
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
        
        // More robust initial call detection - only true for very first call
        const isInitialCall = !speechResult && 
                              !event.Digits && 
                              event.CallStatus === 'ringing';
        
        if (speechResult) {
            // User has spoken - process with OpenAI
            console.log(`User input received (Confidence: ${confidence})`);
            
            // Generate response using OpenAI with conversation history
            const aiResponse = await generateAIResponse(
                openai, 
                speechResult,
                context,
                conversationHistory
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
            
            // Provide the response and continue conversation
            twiml.say({
                voice: 'Polly.Joanna',
                language: 'en-US'
            }, aiResponse);
            
            // Continue listening for more input
            twiml.gather({
                input: 'speech',
                timeout: speechTimeout,
                speechTimeout: speechEndTimeout,
                action: '/voice-handler',
                method: 'POST'
            });
            
            // Fallback if no more input
            twiml.say({
                voice: 'Polly.Joanna',
                language: 'en-US'
            }, 'Thank you for calling. Goodbye!');
            
        } else if (isInitialCall) {
            // True initial call - welcome message with delayed recording
            console.log('Initial call - starting welcome sequence');
            
            // Welcome message (starts immediately)
            twiml.say({
                voice: 'Polly.Joanna',
                language: 'en-US'
            }, 'Hello! I am your virtual assistant.');
            
            // Small pause to let call stabilize
            twiml.pause({ length: 1 });
            
            // Start recording after delay using a redirect to ensure timing
            twiml.redirect('/start-recording-and-continue');
            
        } else {
            // Any other case - continue conversation without repeating welcome
            console.log('Continuing conversation flow');
            
            twiml.say({
                voice: 'Polly.Joanna',
                language: 'en-US'
            }, 'Please tell me how I can help you.');
            
            // Gather for speech input
            twiml.gather({
                input: 'speech',
                timeout: speechTimeout,
                speechTimeout: speechEndTimeout,
                action: '/voice-handler',
                method: 'POST'
            });
            
            twiml.say({
                voice: 'Polly.Joanna',
                language: 'en-US'
            }, 'I did not hear anything for a while. Thank you for calling. Goodbye!');
        }
        
    } catch (error) {
        console.error('Error in voice handler:', error);
        twiml.say({
            voice: 'Polly.Joanna',
            language: 'en-US'
        }, 'An error occurred');
    }
    
    callback(null, twiml);
};

// AI response function with proper prompts
async function generateAIResponse(openai, userInput, context, conversationHistory = []) {
    try {
        // Load system prompt and knowledge base
        const systemPrompt = await loadSystemPrompt(context);
        const knowledgeBase = await loadKnowledgeBase(context);
        
        // Build enhanced prompt with context
        const enhancedPrompt = `${systemPrompt}\n\nKnowledge Base for reference:\n${JSON.stringify(knowledgeBase, null, 2)}\n\nImportant: Keep responses to 1-2 sentences maximum for voice conversation.`;
        
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

// Load knowledge base from assets
async function loadKnowledgeBase(context) {
    try {
        const response = await fetch(`https://${context.DOMAIN_NAME}/data/knowledge-base.json`);
        const knowledgeBase = await response.json();
        console.log('Knowledge base loaded successfully:', knowledgeBase.length, 'items');
        return knowledgeBase;
    } catch (error) {
        console.error('Error loading knowledge base:', error);
        return [];
    }
}
