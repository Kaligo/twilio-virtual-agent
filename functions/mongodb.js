const { MongoClient } = require('mongodb');

// Global variable to cache the MongoDB connection
let cachedClient = null;
let cachedDb = null;

exports.handler = async function(context, event, callback) {
    try {
        console.log('MongoDB operation requested:', {
            action: event.action,
            callSid: event.callSid,
            zendeskTicketId: event.zendeskTicketId
        });

        // Validate required parameters
        if (!event.action) {
            return callback(new Error('action parameter is required'));
        }

        if (!event.callSid) {
            return callback(new Error('callSid parameter is required'));
        }

        // Get the database connection
        const db = await connectToDatabase(context);
        const collection = db.collection('call_tickets'); // Collection to store call-ticket relationships

        let result;

        switch (event.action) {
            case 'insert':
                result = await handleInsert(collection, event);
                break;
            
            case 'query':
                result = await handleQuery(collection, event);
                break;
            
            default:
                return callback(new Error(`Unknown action: ${event.action}. Use 'insert' or 'query'`));
        }

        console.log('✅ MongoDB operation completed successfully');
        callback(null, result);

    } catch (error) {
        console.error('❌ MongoDB operation failed:', error.message);
        
        callback(error, {
            status: 'error',
            action: event.action,
            callSid: event.callSid,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
};

// Handle insert operation
async function handleInsert(collection, event) {
    const { callSid, zendeskTicketId } = event;

    // Validate required fields for insert
    if (!zendeskTicketId) {
        throw new Error('zendeskTicketId is required for insert action');
    }

    console.log(`💾 Inserting data: callSid=${callSid}, zendeskTicketId=${zendeskTicketId}`);

    // Create document to insert
    const document = {
        callSid: callSid,
        zendeskTicketId: zendeskTicketId,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    try {
        // Check if document with this callSid already exists
        const existingDoc = await collection.findOne({ callSid: callSid });
        
        if (existingDoc) {
            // Update existing document
            const updateResult = await collection.updateOne(
                { callSid: callSid },
                { 
                    $set: { 
                        zendeskTicketId: zendeskTicketId,
                        updatedAt: new Date()
                    }
                }
            );

            console.log(`📝 Updated existing document for callSid: ${callSid}`);
            
            return {
                status: 'updated',
                action: 'insert',
                callSid: callSid,
                zendeskTicketId: zendeskTicketId,
                modifiedCount: updateResult.modifiedCount,
                timestamp: new Date().toISOString()
            };
        } else {
            // Insert new document
            const insertResult = await collection.insertOne(document);
            
            console.log(`📝 Inserted new document: ${insertResult.insertedId}`);
            
            return {
                status: 'inserted',
                action: 'insert',
                callSid: callSid,
                zendeskTicketId: zendeskTicketId,
                insertedId: insertResult.insertedId,
                timestamp: new Date().toISOString()
            };
        }

    } catch (error) {
        console.error('Insert operation failed:', error);
        throw error;
    }
}

// Handle query operation
async function handleQuery(collection, event) {
    const { callSid } = event;

    console.log(`🔍 Querying data for callSid: ${callSid}`);

    try {
        // Find document by callSid
        const document = await collection.findOne({ callSid: callSid });

        if (document) {
            console.log(`📋 Found document for callSid: ${callSid}`);
            
            return {
                status: 'found',
                action: 'query',
                callSid: callSid,
                data: {
                    zendeskTicketId: document.zendeskTicketId,
                    createdAt: document.createdAt,
                    updatedAt: document.updatedAt
                },
                timestamp: new Date().toISOString()
            };
        } else {
            console.log(`📭 No document found for callSid: ${callSid}`);
            
            return {
                status: 'not_found',
                action: 'query',
                callSid: callSid,
                data: null,
                timestamp: new Date().toISOString()
            };
        }

    } catch (error) {
        console.error('Query operation failed:', error);
        throw error;
    }
}

// Main function to connect to MongoDB
async function connectToDatabase(context) {
    // Check if we have a cached connection
    if (cachedDb && cachedClient) {
        console.log('♻️  Using cached MongoDB connection');
        return cachedDb;
    }

    // Get MongoDB connection string from environment
    const mongoUri = context.MONGODB_URI;
    if (!mongoUri) {
        throw new Error('MONGODB_URI environment variable is required');
    }

    // Get database name from environment (optional, can be in URI)
    const dbName = context.MONGODB_DATABASE || 'twilioapp';

    console.log('🔗 Establishing new MongoDB connection...');
    
    try {
        // Create MongoDB client with connection options
        // const client = new MongoClient(mongoUri, {
        //     maxPoolSize: 1, // Maintain up to 10 socket connections
        //     serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
        //     socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        //     tls: true,
        //     tlsAllowInvalidCertificates: true,
        //     tlsAllowInvalidHostnames: true
        // });
        const client = new MongoClient(mongoUri, {
            maxPoolSize: 1,
            serverSelectionTimeoutMS: 30000, // Increased from 10000
            connectTimeoutMS: 30000,         // Add explicit connect timeout
        });
        // Connect to MongoDB
        await client.connect();
        console.log('📡 Connected to MongoDB server');

        // Get database
        const db = client.db(dbName);
        console.log(`📊 Using database: ${dbName}`);

        // Test the connection
        await db.admin().ping();
        console.log('🏓 MongoDB ping successful');

        // Cache the connection
        cachedClient = client;
        cachedDb = db;

        return db;

    } catch (error) {
        console.error('MongoDB connection error:', error.message);
        throw error;
    }
}

// Function to get a collection (can be used by other functions)
async function getCollection(context, collectionName) {
    const db = await connectToDatabase(context);
    return db.collection(collectionName);
}

// Function to perform a simple health check
async function healthCheck(context) {
    try {
        const db = await connectToDatabase(context);
        const result = await db.admin().ping();
        return { 
            status: 'healthy', 
            database: db.databaseName,
            ping: result 
        };
    } catch (error) {
        return { 
            status: 'unhealthy', 
            error: error.message 
        };
    }
}

// Function to close connection (for cleanup if needed)
async function closeConnection() {
    if (cachedClient) {
        console.log('🔌 Closing MongoDB connection');
        await cachedClient.close();
        cachedClient = null;
        cachedDb = null;
    }
}

// Export utility functions for use in other Twilio functions
exports.connectToDatabase = connectToDatabase;
exports.getCollection = getCollection;
exports.healthCheck = healthCheck;
exports.closeConnection = closeConnection; 