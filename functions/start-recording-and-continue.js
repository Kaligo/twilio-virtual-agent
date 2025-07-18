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
        console.log('Start recording and continue handler called');
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
        // Gather for speech input
        const speechTimeout = parseInt(context.SPEECH_TIMEOUT) || 60;
        const speechEndTimeout = parseInt(context.SPEECH_END_TIMEOUT) || 1;
        
        const gather = twiml.gather({
            input: 'speech',
            timeout: speechTimeout,
            speechTimeout: speechEndTimeout,
            action: '/voice-handler',
            method: 'POST'
        });
        
        // Add the prompt inside the gather
        gather.say(voiceConfig, 'How may I help you today?');
        
        console.log('TwiML response prepared - waiting for user input');
        
        // Fallback if no input
        twiml.say(voiceConfig, 'I did not hear anything for a while. Thank you for calling. Goodbye!');
        
    } catch (error) {
        console.error('Error in delayed recording handler:', error);
        twiml.say(getVoiceConfig(context), 'An error occurred');
    }
    
    callback(null, twiml);
}; 