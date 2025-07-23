require('dotenv').config();
const zendesk = require('node-zendesk');

console.log('🎫 Zendesk Connection Test');
console.log('Testing Zendesk connection and basic operations\n');

async function testZendeskConnection() {
    try {
        // 1. Check environment variables
        console.log('1. Checking environment variables...');
        if (!process.env.ZENDESK_LOGIN) {
            throw new Error('ZENDESK_LOGIN not found in environment variables');
        }
        if (!process.env.ZENDESK_API_TOKEN) {
            throw new Error('ZENDESK_API_TOKEN not found in environment variables');
        }
        if (!process.env.ZENDESK_SUBDOMAIN) {
            throw new Error('ZENDESK_SUBDOMAIN not found in environment variables');
        }
        
        console.log('   ✅ ZENDESK_LOGIN found');
        console.log('   ✅ ZENDESK_API_TOKEN found');
        console.log('   ✅ ZENDESK_SUBDOMAIN found');
        console.log(`   Login: ${process.env.ZENDESK_LOGIN}`);
        console.log(`   Subdomain: ${process.env.ZENDESK_SUBDOMAIN}`);
        
        // 2. Initialize Zendesk client with correct parameters
        console.log('\n2. Initializing Zendesk client...');
        const client = zendesk.createClient({
            username: process.env.ZENDESK_LOGIN,
            token: process.env.ZENDESK_API_TOKEN,
            subdomain: process.env.ZENDESK_SUBDOMAIN
        });
        console.log('   ✅ Zendesk client created');
        
        // 3. Test connection with current user info
        console.log('\n3. Testing connection with current user info...');
        const currentUser = await client.users.auth();
        console.log('   ✅ Successfully authenticated!');
        console.log(`   User: ${currentUser.name} (${currentUser.email})`);
        console.log(`   Role: ${currentUser.role}`);
        console.log(`   Active: ${currentUser.active}`);
        
        // 4. Check if ticket 107596 exists
        console.log('\n4. Checking if ticket 107596 exists...');
        try {
            const ticket = await client.tickets.show(107596);
            console.log('   ✅ Ticket 107596 found!');
            console.log(`   Subject: "${ticket.subject}"`);
            console.log(`   Status: ${ticket.status}`);
            console.log(`   Created: ${ticket.created_at}`);
            
            // 5. Testing comments for ticket 107596
            console.log('\n5. Testing comments for ticket 107596...');
            const comments = await client.tickets.getComments(107596);
            console.log(`   ✅ Retrieved ${comments.length} comments for ticket #107596`);
            
            // 6. Test creating a new comment
            console.log('\n6. Testing comment creation in ticket 107596...');
            const testComment = {
                body: `🧪 **Zendesk API Test Comment**

This is a test comment created by the Twilio-Zendesk integration test.

**Test Details:**
- Timestamp: ${new Date().toISOString()}
- Test Type: Comment Creation Verification
- Integration: Twilio Virtual Agent (local) + Zendesk API

This comment verifies that our system can successfully add transcript comments to tickets.

---
*This comment was created automatically during API testing.*`,
                public: false  // Make it private so it doesn't notify users
            };
            
            try {
                // Update the ticket with a comment
                const ticketUpdate = {
                    ticket: {
                        comment: testComment
                    }
                };
                const commentResult = await client.tickets.update(107596, ticketUpdate);
                console.log('   ✅ Test comment created successfully!');
                console.log(`   Comment created with timestamp: ${new Date().toISOString()}`);
                console.log('   Comment is marked as private (won\'t notify users)');
            } catch (commentError) {
                console.log(`   ⚠️  Could not create comment: ${commentError.message}`);
                console.log('   This could mean:');
                console.log('   - Insufficient permissions to add comments');
                console.log('   - Ticket is closed or locked');
                console.log('   - API token doesn\'t have comment creation rights');
            }
            
        } catch (error) {
            console.log(`   ❌ Ticket 107596 not found or not accessible: ${error.message}`);
            console.log('   This could mean:');
            console.log('   - The ticket doesn\'t exist');
            console.log('   - You don\'t have permission to view it');
            console.log('   - The ticket number is incorrect');
        }
        
        console.log('\n🎉 Zendesk connection test completed!');
        console.log('\nNext steps:');
        console.log('- Your Zendesk authentication is working correctly');
        console.log('- You can now test the full workflow with MongoDB and transcript callbacks');
        
    } catch (error) {
        console.error('\n❌ Zendesk test failed:', error.message);
        console.log('\nTroubleshooting:');
        console.log('1. Verify your API token is correct and not expired');
        console.log('2. Check that your email has the right permissions');
        console.log('3. Ensure API access is enabled in Zendesk settings');
        console.log(`4. Make sure the subdomain "${process.env.ZENDESK_SUBDOMAIN}" is correct`);
        process.exit(1);
    }
}

testZendeskConnection(); 