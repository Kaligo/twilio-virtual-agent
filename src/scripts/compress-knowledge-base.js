const fs = require('fs');
const path = require('path');

// Compress knowledge base to reduce token usage
function compressKnowledgeBase(knowledgeBase) {
    const compressed = {};
    
    // Compress FAQ with shorter field names
    if (knowledgeBase.faq && knowledgeBase.faq.length > 0) {
        compressed.faq = knowledgeBase.faq.map(item => ({
            t: item.topic,      // topic -> t
            q: item.question,   // question -> q  
            a: item.answer      // answer -> a
        })).filter(item => item.a && item.a.trim()); // Remove empty answers
    }
    
    // Compress users with shorter field names
    if (knowledgeBase.users && knowledgeBase.users.length > 0) {
        compressed.users = knowledgeBase.users.map(user => {
            const compressedUser = {
                id: user.id,
                email: user.email,
                phone: user.phoneNumber,
                name: `${user.firstName} ${user.lastName}`.trim()
            };
            // Only include non-empty fields
            return Object.fromEntries(
                Object.entries(compressedUser).filter(([_, v]) => v && v.toString().trim())
            );
        });
    }
    
    // Compress points accounts
    if (knowledgeBase.pointsAccounts && knowledgeBase.pointsAccounts.length > 0) {
        compressed.points = knowledgeBase.pointsAccounts.map(account => ({
            id: account.id,
            userId: account.userId,
            balance: account.balance,
            tier: account.tier
        })).filter(account => account.balance !== undefined);
    }
    
    // Compress orders (limit to recent 10 and essential fields only)
    if (knowledgeBase.orders && knowledgeBase.orders.length > 0) {
        compressed.orders = knowledgeBase.orders
            .slice(-10) // Only last 10 orders
            .map(order => ({
                id: order.id,
                userId: order.userId,
                status: order.status,
                total: order.total,
                date: order.createdAt
            }))
            .filter(order => order.status);
    }
    
    // Compress points activities (limit to recent 20 transactions)
    if (knowledgeBase.pointsActivities && knowledgeBase.pointsActivities.length > 0) {
        compressed.transactions = knowledgeBase.pointsActivities
            .slice(-20) // Only last 20 transactions
            .map(activity => {
                const attrs = activity.attributes || activity;
                return {
                    id: activity.id,
                    userId: attrs.userId,
                    amount: attrs.amount,
                    desc: attrs.description,
                    type: attrs.category,
                    date: attrs.transactionTime
                };
            })
            .filter(tx => tx.amount !== undefined);
    }
    
    // Remove empty sections
    return Object.fromEntries(
        Object.entries(compressed).filter(([_, v]) => v && v.length > 0)
    );
}

// Load and combine all JSON files
async function loadAllDataFiles() {
    const dataDir = path.join(__dirname, '..', 'data');
    const knowledgeBase = {
        users: [],
        orders: [],
        pointsActivities: [],
        pointsAccounts: [],
        faq: []
    };
    
    const dataFiles = [
        { key: 'users', file: 'users.json' },
        { key: 'orders', file: 'orders.json' },
        { key: 'pointsActivities', file: 'points-activities.json' },
        { key: 'pointsAccounts', file: 'points-accounts.json' },
        { key: 'faq', file: 'faq.json' }
    ];
    
    let totalItems = 0;
    let loadedFiles = 0;
    
    console.log('📂 Loading data files...');
    
    for (const { key, file } of dataFiles) {
        const filePath = path.join(dataDir, file);
        
        try {
            console.log(`  📄 Loading ${file}...`);
            
            if (fs.existsSync(filePath)) {
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                knowledgeBase[key] = Array.isArray(data) ? data : [];
                
                const itemCount = knowledgeBase[key].length;
                totalItems += itemCount;
                loadedFiles++;
                
                console.log(`  ✅ ${file}: ${itemCount} items`);
            } else {
                console.log(`  ⚠️  ${file}: File not found, using empty array`);
                knowledgeBase[key] = [];
            }
            
        } catch (error) {
            console.error(`  ❌ Error loading ${file}:`, error.message);
            knowledgeBase[key] = [];
        }
    }
    
    console.log(`📊 Data loading complete: ${loadedFiles}/${dataFiles.length} files, ${totalItems} items total`);
    
    return knowledgeBase;
}

// Main compression function
async function main() {
    try {
        console.log('🗜️  Knowledge Base Compression Tool');
        console.log('=====================================');
        
        // Load all data files
        const rawKnowledgeBase = await loadAllDataFiles();
        
        // Compress the knowledge base
        console.log('\n🔄 Compressing knowledge base...');
        const compressedKnowledgeBase = compressKnowledgeBase(rawKnowledgeBase);
        
        // Calculate compression metrics
        const originalJson = JSON.stringify(rawKnowledgeBase, null, 2);
        const compressedJson = JSON.stringify(compressedKnowledgeBase);
        
        const originalSize = originalJson.length;
        const compressedSize = compressedJson.length;
        const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
        const estimatedTokens = Math.ceil(compressedSize / 4); // Rough estimate: 4 chars per token
        
        console.log(`📦 Compression results:`);
        console.log(`   Original size: ${originalSize.toLocaleString()} characters`);
        console.log(`   Compressed size: ${compressedSize.toLocaleString()} characters`);
        console.log(`   Reduction: ${compressionRatio}%`);
        console.log(`   Estimated tokens: ~${estimatedTokens.toLocaleString()}`);
        
        // Write compressed knowledge base
        const outputPath = path.join(__dirname, '..', '..', 'assets', 'data', 'knowledge-base.json');
        fs.writeFileSync(outputPath, compressedJson, 'utf8');
        
        console.log(`\n✅ Compressed knowledge base saved to: ${outputPath}`);
        console.log('🚀 Ready for deployment!');
        
    } catch (error) {
        console.error('❌ Compression failed:', error);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    main();
}

module.exports = { compressKnowledgeBase, loadAllDataFiles }; 