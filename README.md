# Twilio Virtual Agent

A serverless virtual agent powered by OpenAI that handles voice calls through Twilio. The agent provides intelligent, conversational responses using custom prompts and knowledge base data, with optional call recording capabilities.

## Features

- 🤖 **AI-Powered Conversations**: Uses OpenAI GPT models for natural language understanding and response generation
- 📞 **Voice Interaction**: Handles incoming voice calls with speech-to-text and text-to-speech
- 🎙️ **Call Recording**: Optional dual-channel recording for conversation analysis
- 🎯 **Customizable Content**: Load custom prompts and knowledge base from project files
- ⚡ **Fast Response**: 1-second speech detection for quick conversation flow
- ☁️ **Serverless**: Runs on Twilio's serverless platform for automatic scaling

## Project Structure

```
twilio-virtual-agent/
├── functions/
│   ├── voice-handler.js                    # Main voice call handler
│   ├── start-recording-and-continue.js     # Recording initiation handler
│   └── recording-handler.js                # Recording status webhook
├── assets/
│   ├── prompts/
│   │   ├── system-prompt.txt               # AI system prompt
│   │   └── welcome-message.txt             # Call greeting message
│   └── data/
│       └── knowledge-base.json             # Static data for responses
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
Edit `assets/prompts/system-prompt.txt` to customize how your AI agent behaves and responds.

#### Welcome Message
Modify `assets/prompts/welcome-message.txt` to change the greeting callers hear.

#### Knowledge Base
Update `assets/data/knowledge-base.json` with your company information, services, and FAQ data.

### 6. Deploy to Twilio

```bash
npm run deploy
```

After deployment, note the function URL:
`https://your-service-xxxx-dev.twil.io/voice-handler`

### 7. Configure Twilio Phone Number

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
4. **AI Processing**: OpenAI generates intelligent response based on prompts and knowledge base
5. **Response**: AI agent responds with natural voice
6. **Continue**: Conversation continues until timeout or goodbye

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
- `npm run logs` - View live function logs (if configured)

### Debugging Tips
- Check Twilio Console for call logs and errors
- Monitor OpenAI usage in OpenAI dashboard
- Test with your phone number before going live
- Review function logs for recording status

## Technical Details

### Call Recording Implementation
- Uses Twilio REST API for call recording
- Starts recording after welcome message with 1-second delay
- Dual-channel format captures both caller and agent audio
- Recording status updates via webhook to `/recording-handler`

### AI Integration
- **Model**: GPT-3.5-turbo (configurable)
- **Temperature**: 0.3 for consistent responses
- **Context**: Combines system prompts with knowledge base data
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

## Cost Considerations

- **Twilio Voice**: Charges per minute for incoming calls
- **Call Recording**: Additional charge per recording (~$0.0025)
- **OpenAI API**: Charges per token for AI responses
- **Serverless Functions**: Included in most Twilio plans

## Customization Examples

### Modify AI Behavior
Edit `assets/prompts/system-prompt.txt`:
```
You are a helpful customer service agent for [Company Name]. 
Always be polite, professional, and concise in your responses.
If you don't know something, offer to connect the caller with a human agent.
```

### Add Company Information
Update `assets/data/knowledge-base.json`:
```json
[
  {
    "question": "What are your business hours?",
    "answer": "We're open Monday-Friday 9AM-5PM EST"
  },
  {
    "question": "How can I contact support?",
    "answer": "You can call this number or email support@company.com"
  }
]
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly with test calls
5. Submit a pull request

## License

MIT License - see LICENSE file for details. 