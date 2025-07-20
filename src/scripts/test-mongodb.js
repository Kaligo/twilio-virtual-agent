const { MongoClient } = require('mongodb');
require('dotenv').config();

// Colors for console output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    dim: '\x1b[2m',
    reset: '\x1b[0m'
};

console.log(colors.cyan + '🔧 MongoDB Connection Test' + colors.reset);
console.log(colors.dim + 'Testing MongoDB connection and basic operations\n' + colors.reset);

async function testMongoDB() {
    let client = null;
    
    try {
        // Check environment variables
        console.log(colors.blue + '1. Checking environment variables...' + colors.reset);
        
        const mongoUri = process.env.MONGODB_URI;
        const dbName = process.env.MONGODB_DATABASE || 'twilioapp';
        
        if (!mongoUri) {
            throw new Error('MONGODB_URI environment variable is not set');
        }
        
        console.log(colors.green + '   ✅ MONGODB_URI found' + colors.reset);
        console.log(colors.dim + `   Database: ${dbName}` + colors.reset);
        console.log('');
        
        // Test connection
        console.log(colors.blue + '2. Testing MongoDB connection...' + colors.reset);
        
        client = new MongoClient(mongoUri, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        await client.connect();
        console.log(colors.green + '   ✅ Connected to MongoDB server' + colors.reset);
        
        // Get database
        const db = client.db(dbName);
        console.log(colors.green + '   ✅ Database selected' + colors.reset);
        
        // Test ping
        await db.admin().ping();
        console.log(colors.green + '   ✅ MongoDB ping successful' + colors.reset);
        console.log('');
        
        // Test basic operations
        console.log(colors.blue + '3. Testing basic operations...' + colors.reset);
        
        const testCollection = db.collection('test_connection');
        
        // Insert test document
        const testDoc = {
            message: 'MongoDB connection test',
            timestamp: new Date(),
            testId: 'test_' + Date.now()
        };
        
        const insertResult = await testCollection.insertOne(testDoc);
        console.log(colors.green + '   ✅ Insert operation successful' + colors.reset);
        console.log(colors.dim + `   Inserted ID: ${insertResult.insertedId}` + colors.reset);
        
        // Find the test document
        const foundDoc = await testCollection.findOne({ _id: insertResult.insertedId });
        console.log(colors.green + '   ✅ Find operation successful' + colors.reset);
        console.log(colors.dim + `   Found document: ${foundDoc.message}` + colors.reset);
        
        // Update the test document
        const updateResult = await testCollection.updateOne(
            { _id: insertResult.insertedId },
            { $set: { message: 'MongoDB connection test - updated' } }
        );
        console.log(colors.green + '   ✅ Update operation successful' + colors.reset);
        console.log(colors.dim + `   Modified count: ${updateResult.modifiedCount}` + colors.reset);
        
        // Delete the test document
        const deleteResult = await testCollection.deleteOne({ _id: insertResult.insertedId });
        console.log(colors.green + '   ✅ Delete operation successful' + colors.reset);
        console.log(colors.dim + `   Deleted count: ${deleteResult.deletedCount}` + colors.reset);
        console.log('');
        
        // Test your specific collection structure
        console.log(colors.blue + '4. Testing call_tickets collection structure...' + colors.reset);
        
        const callTicketsCollection = db.collection('call_tickets');
        
        // Test insert call-ticket relationship
        const testCallTicket = {
            callSid: 'CA_test_' + Date.now(),
            zendeskTicketId: 'ZD_test_' + Date.now(),
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        const callTicketInsert = await callTicketsCollection.insertOne(testCallTicket);
        console.log(colors.green + '   ✅ Call-ticket insert successful' + colors.reset);
        
        // Test query by callSid
        const foundCallTicket = await callTicketsCollection.findOne({ 
            callSid: testCallTicket.callSid 
        });
        console.log(colors.green + '   ✅ Call-ticket query successful' + colors.reset);
        console.log(colors.dim + `   Found zendeskTicketId: ${foundCallTicket.zendeskTicketId}` + colors.reset);
        
        // Clean up test data
        await callTicketsCollection.deleteOne({ _id: callTicketInsert.insertedId });
        console.log(colors.green + '   ✅ Test data cleaned up' + colors.reset);
        console.log('');
        
        // Success summary
        console.log(colors.green + '🎉 All MongoDB tests passed!' + colors.reset);
        console.log(colors.cyan + 'Your MongoDB connection is working perfectly.' + colors.reset);
        console.log('');
        console.log(colors.blue + 'Next steps:' + colors.reset);
        console.log('1. Deploy your functions: npm run deploy');
        console.log('2. Your mongodb-init function is ready to use');
        console.log('3. Test the deployed function with your events');
        
    } catch (error) {
        console.error(colors.red + '❌ MongoDB test failed!' + colors.reset);
        console.error(colors.red + 'Error:' + colors.reset, error.message);
        
        if (error.message.includes('MONGODB_URI')) {
            console.log('');
            console.log(colors.yellow + '💡 Setup help:' + colors.reset);
            console.log('1. Make sure you have a .env file in your project root');
            console.log('2. Add your MongoDB connection string:');
            console.log(colors.dim + '   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/' + colors.reset);
            console.log('3. Optionally set database name:');
            console.log(colors.dim + '   MONGODB_DATABASE=twilioapp' + colors.reset);
        } else if (error.message.includes('authentication')) {
            console.log('');
            console.log(colors.yellow + '💡 Authentication help:' + colors.reset);
            console.log('1. Check your MongoDB username and password');
            console.log('2. Make sure your IP is whitelisted in MongoDB Atlas');
            console.log('3. Verify your connection string format');
        } else if (error.message.includes('timeout') || error.message.includes('ENOTFOUND')) {
            console.log('');
            console.log(colors.yellow + '💡 Connection help:' + colors.reset);
            console.log('1. Check your internet connection');
            console.log('2. Verify MongoDB server is running');
            console.log('3. Check firewall settings');
        }
        
        process.exit(1);
        
    } finally {
        // Close connection
        if (client) {
            await client.close();
            console.log(colors.dim + '🔌 MongoDB connection closed' + colors.reset);
        }
    }
}

// Run the test
if (require.main === module) {
    testMongoDB();
} 