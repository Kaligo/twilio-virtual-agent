const { OpenAI } = require('openai');

exports.handler = async function(context, event, callback) {
    // Create TwiML response object
    const twiml = new Twilio.twiml.VoiceResponse();
    
    try {
        console.log('Voice handler called:', JSON.stringify(event, null, 2));
        
        // Get environment variables
        const openaiApiKey = context.OPENAI_API_KEY;
        const speechTimeout = parseInt(context.SPEECH_TIMEOUT) || 60;
        const speechEndTimeout = parseInt(context.SPEECH_END_TIMEOUT) || 1;
        
        console.log('Environment check:', {
            hasOpenAIKey: !!openaiApiKey,
            speechTimeout: speechTimeout + 's',
            speechEndTimeout: speechEndTimeout + 's'
        });
        
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
        
        // Check if this is the initial call or a response to a Gather
        const speechResult = event.SpeechResult;
        const confidence = event.Confidence;
        
        console.log('Speech detection:', { speechResult, confidence });
        
        if (speechResult) {
            // User has spoken - process with OpenAI
            console.log(`User said: ${speechResult} (Confidence: ${confidence})`);
            
            // Generate response using OpenAI
            const aiResponse = await generateAIResponse(
                openai, 
                speechResult,
                context
            );
            
            console.log('AI Response generated:', aiResponse);
            
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
            
        } else {
            // Initial call - this works for you
            console.log('Initial call or no speech detected');
            
            twiml.say({
                voice: 'Polly.Joanna',
                language: 'en-US'
            }, 'Hello! I am your virtual assistant. Please tell me how I can help you.');
            
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
    
    console.log('TwiML Response:', twiml.toString());
    callback(null, twiml);
};

// AI response function with proper prompts
async function generateAIResponse(openai, userInput, context) {
    try {
        // Load system prompt and knowledge base
        const systemPrompt = await loadSystemPrompt(context);
        const knowledgeBase = await loadKnowledgeBase(context);
        
        // Build enhanced prompt with context
        const enhancedPrompt = `${systemPrompt}\n\nKnowledge Base for reference:\n${JSON.stringify(knowledgeBase, null, 2)}\n\nImportant: Keep responses to 1-2 sentences maximum for voice conversation.`;
        
        console.log('Processing AI request for user input:', userInput);
        
        const completion = await openai.chat.completions.create({
            model: context.OPENAI_MODEL || 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: enhancedPrompt
                },
                {
                    role: 'user',
                    content: userInput
                }
            ],
            max_tokens: 50,
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
