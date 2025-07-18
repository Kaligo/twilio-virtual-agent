// Helper function to get voice configuration
function getVoiceConfig(context) {
    return {
        voice: context.VOICE || 'Polly.Joanna',
        language: context.LANGUAGE || 'en-US'
    };
}

exports.handler = async function(context, event, callback) {
    // Create TwiML response object
    const twiml = new Twilio.twiml.VoiceResponse();
    
    try {
        // Get voice configuration
        const voiceConfig = getVoiceConfig(context);
        
        // Start recording now that call is established
        if (event.CallSid) {
            console.log('Starting conversation recording');
            try {
                const client = context.getTwilioClient();
                const recording = await client.calls(event.CallSid).recordings.create({
                    recordingChannels: 'dual',
                    recordingTrack: 'both',
                    recordingStatusCallback: '/recording-handler'
                });
                console.log('Recording started successfully:', recording.sid);
            } catch (error) {
                console.log('Recording not available:', error.message);
                console.log('Continuing without recording');
            }
        }
        
        // Continue welcome message and start conversation
        twiml.say(voiceConfig, 'Please tell me how I can help you.');
        
        // Gather for speech input
        const speechTimeout = parseInt(context.SPEECH_TIMEOUT) || 60;
        const speechEndTimeout = parseInt(context.SPEECH_END_TIMEOUT) || 1;
        
        twiml.gather({
            input: 'speech',
            timeout: speechTimeout,
            speechTimeout: speechEndTimeout,
            action: '/voice-handler',
            method: 'POST'
        });
        
        // Fallback if no input
        twiml.say(voiceConfig, 'I did not hear anything for a while. Thank you for calling. Goodbye!');
        
    } catch (error) {
        console.error('Error in delayed recording handler:', error);
        twiml.say(getVoiceConfig(context), 'An error occurred');
    }
    
    callback(null, twiml);
}; 