exports.handler = async function(context, event, callback) {
    try {
        // Log the incoming webhook event
        console.log('Transcript callback received:', {
            eventType: event.event_type,
            transcriptSid: event.transcript_sid
        });

        // Verify this is the correct event type
        if (event.event_type !== 'voice_intelligence_transcript_available') {
            console.log('Ignoring non-transcript event:', event.event_type);
            return callback(null, { status: 'ignored', reason: 'wrong_event_type' });
        }

        // Validate required parameters
        if (!event.transcript_sid) {
            console.error('No transcript_sid provided in webhook');
            return callback(new Error('transcript_sid is required'));
        }

        // Initialize Twilio client
        const client = context.getTwilioClient();

        // Retrieve the transcript
        console.log(`📋 Fetching transcript: ${event.transcript_sid}`);
        const transcript = await client.intelligence.v2
            .transcripts(event.transcript_sid)
            .fetch();

        const operatorResults = await client.intelligence.v2
          .transcripts(event.transcript_sid)
          .operatorResults.list({ limit: 100, redacted: false });
        const summary = operatorResults.find(result => result.name === 'Conversation Summary');  

        // Only process completed transcripts
        if (transcript.status !== 'completed') {
            console.log(`Transcript not ready. Status: ${transcript.status}`);
            return callback(null, { 
                status: 'pending', 
                transcriptStatus: transcript.status,
                transcriptSid: transcript.sid 
            });
        }

        // Fetch transcript sentences (the actual conversation text)
        console.log('📝 Fetching transcript content...');
        const sentences = await client.intelligence.v2
            .transcripts(event.transcript_sid)
            .sentences
            .list({ limit: 200 }); // Adjust limit as needed

        console.log(`Retrieved ${sentences.length} sentences`);

        // Format the transcript content
        const transcriptContent = sentences.map(sentence => (`<${sentence.mediaChannel}>: ${sentence.transcript}`)).join('\n');

        console.log('✅ Transcript content retrieved successfully');

        // retrieve call_ticket from MongoDB based on callSid, use mongodb.js function
        const callSid = transcript.channel?.media_properties?.reference_sids?.call_sid;
        console.log(`Retrieving call_ticket for callSid: ${callSid}`);
        
        const mongodbPath = Runtime.getFunctions()['mongodb'].path;
        const mongoModule = require(mongodbPath);
        const targetTicket = await new Promise((resolve, reject) => {
            mongoModule.handler(context, {
                action: 'query',
                callSid: callSid
            }, (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            });
        });

        console.log(`Call ticket retrieved:`, targetTicket);

        const ticketId = targetTicket.data?.zendeskTicketId;

        if (!ticketId) {
            console.log('No ticketId, skip action');
            return callback(null, 'No ticketId, skip action');
        }

        // initialize zendesk client
        const zendesk = require('node-zendesk');
        // create zendesk client with ZENDESK_API_TOKEN
        const zendeskClient = zendesk.createClient({
            username: context.ZENDESK_LOGIN,
            token: context.ZENDESK_API_TOKEN,
            subdomain: context.ZENDESK_SUBDOMAIN
        });
        // create a new Zendesk comment with the transcript content
        console.log('Creating Zendesk comment with transcript content...');
        const comment = {
            body: `Transcript for call ${callSid}:\n\n[Summary]\n\n${summary?.textGenerationResults?.result}\n\n[Transcript]\n\n${transcriptContent}`,
            public: true
        };
    
        // Create the comment on the ticket using proper API
        const ticketUpdate = {
            ticket: {
                comment: comment
            }
        };
        const response = await zendeskClient.tickets.update(ticketId, ticketUpdate);
        console.log(`✅ Zendesk comment created successfully for ticket ${ticketId}`);


        // Return the transcript content
        callback(null, 'Transcript processed successfully');
    } catch (error) {
        console.error('Error retrieving transcript:', error.message);
        
        callback(error, {
            status: 'error',
            transcriptSid: event.transcript_sid,
            error: error.message
        });
    }
}; 