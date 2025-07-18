// Test script to verify OpenAI API key works
require('dotenv').config();
const { OpenAI } = require('openai');

// Read from environment variable
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function testOpenAIKey() {
    try {
        // Check if API key is provided
        if (!OPENAI_API_KEY) {
            console.error('❌ ERROR: OPENAI_API_KEY not found!');
            console.error('💡 Please add your OpenAI API key to the .env file');
            console.error('📝 Format: OPENAI_API_KEY=your-actual-api-key-here');
            return;
        }
        
        console.log('🔍 Testing OpenAI API key...');
        console.log('🔑 API Key:', OPENAI_API_KEY.substring(0, 7) + '...' + OPENAI_API_KEY.slice(-4));
        
        // Initialize OpenAI client
        const openai = new OpenAI({
            apiKey: OPENAI_API_KEY,
        });
        
        // First, let's see what models are available
        console.log('📋 Checking available models...');
        let modelToUse = 'gpt-3.5-turbo'; // Default fallback
        
        try {
            const models = await openai.models.list();
            const chatModels = models.data.filter(model => 
                model.id.includes('gpt') || model.id.includes('chat')
            ).sort((a, b) => a.id.localeCompare(b.id));
            
            console.log('🤖 Available chat models:');
            chatModels.forEach(model => {
                console.log(`   - ${model.id}`);
            });
            console.log('');
            
            // Try to find the best available model
            if (chatModels.find(m => m.id === 'gpt-4o')) {
                modelToUse = 'gpt-4o';
            } else if (chatModels.find(m => m.id === 'gpt-4o-mini')) {
                modelToUse = 'gpt-4o-mini';
            } else if (chatModels.find(m => m.id === 'gpt-4')) {
                modelToUse = 'gpt-4';
            } else if (chatModels.find(m => m.id === 'gpt-3.5-turbo')) {
                modelToUse = 'gpt-3.5-turbo';
            } else if (chatModels.length > 0) {
                modelToUse = chatModels[0].id;
            }
            
            console.log(`🎯 Using model: ${modelToUse}`);
            
        } catch (modelError) {
            console.log('⚠️  Could not list models, but will try with gpt-3.5-turbo');
        }
        
        // Make a test chat completion
        console.log('💬 Testing chat completion...');
        const completion = await openai.chat.completions.create({
            model: modelToUse,
            messages: [
                {
                    role: 'user',
                    content: 'Say "Hello! Your API key is working correctly." in exactly that phrase.'
                }
            ],
            max_tokens: 50,
            temperature: 0.1,
        });
        
        const response = completion.choices[0].message.content.trim();
        
        console.log('✅ SUCCESS! OpenAI API key is working!');
        console.log('📝 Response:', response);
        console.log('🎯 Model used:', completion.model);
        console.log('💰 Tokens used:', completion.usage?.total_tokens || 'N/A');
        
        console.log('\n🎉 Your API key is ready to use in your Twilio virtual agent!');
        console.log(`💡 Recommended model for your virtual agent: ${modelToUse}`);
        
    } catch (error) {
        console.error('❌ ERROR: OpenAI API key test failed');
        
        if (error.code === 'invalid_api_key') {
            console.error('🔑 The API key you provided is invalid.');
            console.error('💡 Make sure you copied the key correctly from https://platform.openai.com/api-keys');
        } else if (error.code === 'insufficient_quota') {
            console.error('💳 Your OpenAI account has insufficient quota/credits.');
            console.error('💡 Add billing information at https://platform.openai.com/account/billing');
        } else if (error.status === 429) {
            console.error('⏱️  Rate limit exceeded. Try again in a moment.');
        } else if (error.code === 'model_not_found') {
            console.error('🤖 Model not found or not accessible to your account.');
            console.error('💡 Try with gpt-3.5-turbo or check your OpenAI plan.');
        } else {
            console.error('🔍 Error details:', error.message);
        }
        
        console.error('\n📋 Troubleshooting steps:');
        console.error('1. Check your API key at https://platform.openai.com/api-keys');
        console.error('2. Ensure billing is set up at https://platform.openai.com/account/billing');
        console.error('3. Verify you have available credits/quota');
        console.error('4. Check your usage limits at https://platform.openai.com/account/usage');
    }
}

// Run the test
testOpenAIKey(); 