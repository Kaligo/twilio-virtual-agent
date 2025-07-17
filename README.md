# Twilio Virtual Agent

A serverless virtual agent powered by OpenAI that handles voice calls through Twilio. The agent uses custom prompts and knowledge base data to provide intelligent, conversational responses to callers.

## Features

- 🤖 **AI-Powered**: Uses OpenAI GPT models for natural language understanding and response generation
- 📞 **Voice Interaction**: Handles incoming voice calls with speech-to-text and text-to-speech
- 🎯 **Customizable**: Load custom prompts and knowledge base from project files
- ☁️ **Serverless**: Runs on Twilio's serverless platform for automatic scaling
- ⚡ **Fast Response**: 1-second speech detection for quick conversation flow
- 🔧 **Simple Setup**: Minimal configuration required

## Project Structure

```
twilio-virtual-agent/
├── functions/
│   └── voice-handler.js          # Main voice call handler
├── assets/
│   ├── prompts/
│   │   ├── system-prompt.txt      # AI system prompt
│   │   └── welcome-message.txt    # Call greeting message
│   └── data/
│       └── knowledge-base.json    # Static data for responses
├── package.json                   # Dependencies and scripts
├── env-template.txt              # Environment variable template
└── README.md                     # This file
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

After deployment, note the function URL. It will look like:
`https://your-service-xxxx-dev.twil.io/voice-handler`

### 7. Configure Twilio Phone Number

1. Log into the Twilio Console
2. Go to Phone Numbers > Manage > Active numbers
3. Click on your phone number
4. In the Voice section, set the webhook URL to your deployed function URL
5. Set HTTP method to POST
6. Save the configuration

## Usage

Once configured, callers can:

1. Call your Twilio phone number
2. Hear the welcome message
3. Speak their question or request
4. Receive AI-generated responses based on your prompts and knowledge base
5. Continue the conversation naturally
6. Call automatically ends after 60 seconds of inactivity

## Voice Configuration

The agent uses Amazon Polly's Joanna voice by default for natural-sounding responses. The voice is optimized for:
- Clear pronunciation
- Natural conversation flow
- Fast response times (1-second speech detection)

## Conversation Settings

The agent is configured with:
- **Speech Timeout**: 60 seconds (auto-hangup if no input)
- **Speech End Detection**: 1 second (fast response)
- **AI Model**: GPT-3.5-turbo (configurable)
- **Response Length**: ~50 tokens (optimized for voice)
- **Temperature**: 0.3 (consistent responses)

## Customization Tips

### Enhanced Prompts
- Make prompts specific to your use case
- Include examples of good responses
- Set clear boundaries for what the agent should/shouldn't do
- Keep responses brief for voice conversations

### Knowledge Base Structure
- Organize data logically by topics
- Keep information concise for voice responses
- Include common questions and their answers
- Use JSON format for easy parsing

### Response Optimization
- Test with various speech inputs
- Monitor call logs for conversation quality
- Adjust system prompts based on user feedback

## Monitoring and Debugging

### Available Scripts
- `npm run deploy` - Deploy to Twilio
- `npm run logs` - View live function logs

### Debugging Tips
- Check Twilio Console for call logs and errors
- Monitor OpenAI usage in the OpenAI dashboard
- Test with your phone number before going live

## Security Notes

- Never commit `.env` files to version control
- Use Twilio's environment variable management for production
- Regularly rotate API keys
- Monitor usage to prevent unexpected charges

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details. 