# Twilio Virtual Agent

A serverless virtual agent powered by OpenAI that handles voice calls through Twilio. The agent provides intelligent, conversational responses using custom prompts and knowledge base data, with conversation history tracking and optional call recording capabilities.

## Features

- 🤖 **AI-Powered Conversations**: Uses OpenAI GPT models for natural language understanding and response generation
- 📞 **Voice Interaction**: Handles incoming voice calls with speech-to-text and text-to-speech
- 💬 **Conversation History**: Maintains context within each call session (up to 10 exchanges)
- 🎙️ **Call Recording**: Optional dual-channel recording for conversation analysis
- 🎯 **Customizable Content**: Load custom prompts and knowledge base from project files
- 🧪 **Local Testing**: Built-in tools for testing AI responses without making actual calls
- ⚡ **Fast Response**: 1-second speech detection for quick conversation flow
- ☁️ **Serverless**: Runs on Twilio's serverless platform for automatic scaling

## Project Structure

```
twilio-virtual-agent/
├── functions/
│   ├── voice-handler.js                    # Main voice call handler (with conversation history)
│   ├── start-recording-and-continue.js     # Recording initiation handler
│   └── recording-handler.js                # Recording status webhook
├── assets/
│   ├── prompts/
│   │   ├── system-prompt.txt               # AI system prompt (loyalty program context)
│   │   └── welcome-message.txt             # Call greeting message
│   └── data/
│       └── knowledge-base.json             # FAQ and user data for responses
├── test-ai-response.js                     # Interactive local testing tool
├── test-openai-key.js                      # OpenAI API key validation tool
├── package.json                            # Dependencies and scripts
├── env-template.txt                        # Environment variable template
└── README.md                              # This file
```

## Setup Instructions

### 1. Prerequisites

- Node.js 18+ installed
- Twilio account with a phone number
- OpenAI API account

### 2. Install Twilio CLI

```bash
npm install -g twilio-cli
twilio login
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Environment Configuration

Copy the template and add your OpenAI API key:

```bash
cp env-template.txt .env
```

Edit `.env` with your actual API key:

```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-3.5-turbo
```

### 5. Customize Your Agent

#### System Prompt
Edit `assets/prompts/system-prompt.txt` to customize how your AI agent behaves and responds. The current prompt is configured for a loyalty program customer service context with user verification capabilities.

#### Welcome Message
Modify `assets/prompts/welcome-message.txt` to change the greeting callers hear.

#### Knowledge Base
Update `assets/data/knowledge-base.json` with your FAQ data and user information. The current structure includes:
- **FAQ sections**: Organized by topics (e.g., "Earning and Managing Points")
- **User data**: For identity verification and account lookup
- **Partner information**: For loyalty program transfers and redemptions

### 6. Local Testing

Before deploying, test your AI agent locally:

#### Test OpenAI Connection
```bash
node test-openai-key.js
```

#### Interactive AI Testing
```bash
npm run try-conversation
```

The interactive testing tool allows you to:
- Test AI responses in a conversational format
- Verify conversation history is working
- Test different user inputs and scenarios
- Clear conversation history between tests
- Exit with `/quit` or `/exit`

### 7. Deploy to Twilio

```bash
npm run deploy
```

After deployment, note the function URL:
`https://your-service-xxxx-dev.twil.io/voice-handler`

### 8. Configure Twilio Phone Number

1. Log into the Twilio Console
2. Go to Phone Numbers > Manage > Active numbers
3. Click on your phone number
4. In the Voice section, set the webhook URL to your deployed function URL
5. Set HTTP method to POST
6. Save the configuration

## Usage

### Call Flow

1. **Initial Call**: Welcome message plays immediately
2. **Recording Start**: After 1-second delay, conversation recording begins (if eligible)
3. **User Input**: Caller speaks their question or request
4. **AI Processing**: OpenAI generates intelligent response based on prompts, knowledge base, and conversation history
5. **Response**: AI agent responds with natural voice
6. **Continue**: Conversation continues with full context until timeout or goodbye

### Conversation History

The system maintains conversation context within each call:

- **Session Memory**: Remembers up to 10 exchanges (20 messages) per call
- **Context Awareness**: AI responses consider previous conversation turns
- **Automatic Management**: History is automatically trimmed to avoid token limits
- **Session Scope**: History resets between different calls

### Call Recording

The system automatically attempts to record conversations:

- **Dual-channel recording**: Customer and agent voices in separate audio channels
- **Graceful fallback**: Conversation continues normally if recording fails
- **Recording URL**: Provided via webhook when recording completes
- **Format**: WAV format with dual audio channels

## Voice Configuration

- **Voice**: Amazon Polly's Joanna voice for natural-sounding responses
- **Speech Detection**: 1-second end-of-speech detection for fast responses
- **Call Timeout**: 60 seconds of inactivity before auto-hangup
- **Response Length**: Optimized ~50 tokens for voice conversations

## Monitoring and Debugging

### Available Scripts
- `npm run deploy` - Deploy to Twilio serverless
- `npm run try-conversation` - Test AI responses locally
- `npm run logs` - View live function logs (if configured)
- `node test-openai-key.js` - Validate OpenAI API configuration

### Local Testing Tips
- Use `test-openai-key.js` to verify API connection before deployment
- Use `test-ai-response.js` for interactive conversation testing
- Test different scenarios including user verification flows
- Verify conversation history is maintained correctly

### Debugging Tips
- Check Twilio Console for call logs and errors
- Monitor OpenAI usage in OpenAI dashboard
- Test with your phone number before going live
- Review function logs for recording status
- Use local testing tools to debug AI responses

## Technical Details

### Conversation History Implementation
- Stored in-memory for the duration of each call session
- Limited to 10 exchanges (20 messages) to manage token usage
- Includes both user inputs and AI responses
- Automatically passed to OpenAI for context-aware responses

### Call Recording Implementation
- Uses Twilio REST API for call recording
- Starts recording after welcome message with 1-second delay
- Dual-channel format captures both caller and agent audio
- Recording status updates via webhook to `/recording-handler`

### AI Integration
- **Model**: GPT-3.5-turbo (configurable)
- **Temperature**: 0.3 for consistent responses
- **Context**: Combines system prompts, knowledge base data, and conversation history
- **Response Optimization**: Tailored for voice conversation length

### Error Handling
- Graceful fallback when OpenAI API is unavailable
- Continues conversation when recording fails
- Comprehensive logging for debugging
- Automatic timeout handling

## Security Considerations

- Never commit `.env` files to version control
- Use Twilio environment variables for production deployment
- Regularly rotate API keys
- Monitor usage to prevent unexpected charges
- Consider call recording compliance requirements
- Protect user data in knowledge base appropriately

## Cost Considerations

- **Twilio Voice**: Charges per minute for incoming calls
- **Call Recording**: Additional charge per recording (~$0.0025)
- **OpenAI API**: Charges per token for AI responses (conversation history increases token usage)
- **Serverless Functions**: Included in most Twilio plans

## Customization Examples

### Modify AI Behavior for Loyalty Program
Edit `assets/prompts/system-prompt.txt`:
```
You are a helpful and professional virtual assistant handling phone calls from loyalty program customers.
- Always verify user identity before discussing account details
- Ask for phone number or email for verification
- Use the knowledge base to look up user information and points balances
- Keep responses brief and conversational for voice interaction
```

### Add User Data for Verification
Update `assets/data/knowledge-base.json`:
```json
{
  "users": [
    {
      "id": "user123",
      "email": "customer@example.com",
      "phone": "+1234567890",
      "pointsAccounts": [
        {
          "id": "points123",
          "balance": 15000,
          "tier": "Gold"
        }
      ]
    }
  ],
  "faq": [
    {
      "topic": "Points Balance",
      "question": "How do I check my points balance?",
      "answer": "I can help you check your balance after verifying your identity."
    }
  ]
}
```

### Update FAQ Content
```json
{
  "faq": [
    {
      "topic": "Account Management",
      "question": "How do I update my account information?",
      "answer": "You can update your information through our website or by calling customer service."
    }
  ]
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly with local testing tools and test calls
5. Submit a pull request

## License

MIT License - see LICENSE file for details. 