const { OpenAI } = require('openai');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

// Colors for terminal output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
};

// Mock context object for local testing
function createMockContext() {
    // Load environment variables from a .env file or environment
    require('dotenv').config({ path: '.env' });
    
    return {
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        DOMAIN_NAME: 'localhost:3000' // This won't work for file loading, so we'll override the load functions
    };
}

// Local version of generateAIResponse that works without Twilio context
async function generateAIResponse(openai, userInput, context, conversationHistory = []) {
    try {
        // Load system prompt and knowledge base locally
        const systemPrompt = await loadSystemPromptLocal();
        const knowledgeBase = await loadKnowledgeBaseLocal();
        
        // Build enhanced prompt with context
        const enhancedPrompt = `${systemPrompt}\n\nKnowledge Base for reference:\n${JSON.stringify(knowledgeBase, null, 2)}\n\nImportant: Keep responses to 1-2 sentences maximum for voice conversation.`;
        
        console.log(colors.dim + 'Processing AI request...' + colors.reset);
        
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
        return response;
        
    } catch (error) {
        console.error(colors.red + 'Error generating AI response:' + colors.reset, error);
        return 'I am having trouble right now';
    }
}

// Load system prompt from local file
async function loadSystemPromptLocal() {
    try {
        const promptPath = path.join(__dirname, 'assets', 'prompts', 'system-prompt.txt');
        const prompt = fs.readFileSync(promptPath, 'utf8');
        console.log(colors.dim + 'System prompt loaded successfully' + colors.reset);
        return prompt;
    } catch (error) {
        console.error(colors.yellow + 'Warning: Could not load system prompt, using default' + colors.reset);
        return 'You are a helpful phone assistant. Keep responses brief and conversational.';
    }
}

// Load knowledge base from local file
async function loadKnowledgeBaseLocal() {
    try {
        const kbPath = path.join(__dirname, 'assets', 'data', 'knowledge-base.json');
        const knowledgeBase = JSON.parse(fs.readFileSync(kbPath, 'utf8'));
        console.log(colors.dim + `Knowledge base loaded successfully: ${knowledgeBase.length} items` + colors.reset);
        return knowledgeBase;
    } catch (error) {
        console.error(colors.yellow + 'Warning: Could not load knowledge base, using empty array' + colors.reset);
        return [];
    }
}

// Main interactive function
async function startLocalTesting() {
    console.log(colors.cyan + colors.bright + '🤖 AI Response Local Tester' + colors.reset);
    console.log(colors.dim + 'Type your messages and press Enter to get AI responses' + colors.reset);
    console.log(colors.dim + 'Type "exit" or "quit" to stop, "clear" to reset conversation' + colors.reset);
    console.log(colors.dim + '─'.repeat(50) + colors.reset + '\n');
    
    // Create mock context and OpenAI client
    const context = createMockContext();
    
    if (!context.OPENAI_API_KEY) {
        console.error(colors.red + 'Error: OPENAI_API_KEY not found in environment variables' + colors.reset);
        console.log(colors.yellow + 'Please set your OpenAI API key in a .env file or environment variable' + colors.reset);
        process.exit(1);
    }
    
    const openai = new OpenAI({
        apiKey: context.OPENAI_API_KEY,
    });
    
    // Initialize conversation history
    let conversationHistory = [];
    
    // Set up readline interface
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: colors.blue + '👤 You: ' + colors.reset
    });
    
    rl.prompt();
    
    rl.on('line', async (input) => {
        const userInput = input.trim();
        
        // Check for exit commands
        if (userInput.toLowerCase() === 'exit' || userInput.toLowerCase() === 'quit') {
            console.log(colors.cyan + '\nGoodbye! 👋' + colors.reset);
            rl.close();
            return;
        }
        
        // Check for clear command
        if (userInput.toLowerCase() === 'clear') {
            conversationHistory = [];
            console.log(colors.yellow + '🧹 Conversation history cleared!\n' + colors.reset);
            rl.prompt();
            return;
        }
        
        // Skip empty input
        if (!userInput) {
            rl.prompt();
            return;
        }
        
        try {
            // Get AI response with conversation history
            const aiResponse = await generateAIResponse(openai, userInput, context, conversationHistory);
            
            // Add both messages to conversation history
            conversationHistory.push({
                role: 'user',
                content: userInput
            });
            conversationHistory.push({
                role: 'assistant',
                content: aiResponse
            });
            
            // Limit conversation history to last 10 exchanges (20 messages) to avoid token limits
            if (conversationHistory.length > 20) {
                conversationHistory = conversationHistory.slice(-20);
            }
            
            // Display AI response with clear formatting
            const exchangeCount = conversationHistory.length / 2;
            console.log(colors.green + '🤖 AI: ' + colors.reset + aiResponse);
            console.log(colors.dim + `💭 (${exchangeCount} exchanges remembered)\n` + colors.reset);
            
        } catch (error) {
            console.error(colors.red + '❌ Error: ' + colors.reset + error.message + '\n');
        }
        
        rl.prompt();
    });
    
    rl.on('close', () => {
        console.log(colors.cyan + '\nSession ended.' + colors.reset);
        process.exit(0);
    });
}

// Handle process interruption gracefully
process.on('SIGINT', () => {
    console.log(colors.cyan + '\n\nGoodbye! 👋' + colors.reset);
    process.exit(0);
});

// Start the testing session
if (require.main === module) {
    startLocalTesting().catch(error => {
        console.error(colors.red + 'Failed to start local testing:' + colors.reset, error);
        process.exit(1);
    });
}

module.exports = {
    generateAIResponse,
    startLocalTesting
}; 