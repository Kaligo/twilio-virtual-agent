// Helper function to get voice configuration
function getVoiceConfig(context) {
    return {
        voice: context.VOICE || 'Google.en-AU-Neural2-C',
        language: context.LANGUAGE || 'en-AU'
    };
}

exports.handler = function(context, event, callback) {
    console.log('Transfer status update:', {
        callSid: event.CallSid,
        dialCallStatus: event.DialCallStatus,
        dialCallDuration: event.DialCallDuration,
        recordingUrl: event.RecordingUrl
    });
    
    // Create TwiML response object
    const twiml = new Twilio.twiml.VoiceResponse();
    const voiceConfig = getVoiceConfig(context);
    
    // Handle different transfer outcomes
    switch (event.DialCallStatus) {
        case 'completed':
            console.log(`Transfer completed successfully. Duration: ${event.DialCallDuration} seconds`);
            // Call was successfully transferred and completed
            // No additional TwiML needed - call has ended
            break;
            
        case 'busy':
            console.log('Transfer failed - number was busy');
            twiml.say(voiceConfig, 'Our customer service line is currently busy. Please try calling back in a few minutes, or call us directly at 865-551-6860.');
            break;
            
        case 'no-answer':
            console.log('Transfer failed - no answer');
            twiml.say(voiceConfig, 'Our customer service team is not available right now. Please call us directly at 865-551-6860 or try again later.');
            break;
            
        case 'failed':
        case 'canceled':
            console.log(`Transfer failed with status: ${event.DialCallStatus}`);
            twiml.say(voiceConfig, 'I was unable to transfer your call. Please call our customer service directly at 865-551-6860.');
            break;
            
        default:
            console.log(`Unexpected transfer status: ${event.DialCallStatus}`);
            twiml.say(voiceConfig, 'Thank you for calling. If you need further assistance, please call 865-551-6860.');
            break;
    }
    
    callback(null, twiml);
}; 