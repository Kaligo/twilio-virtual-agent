const fs = require('fs');
const path = require('path');

// Compress knowledge base to reduce token usage (whitespace only)
function compressKnowledgeBase(knowledgeBase) {
    // Return the original knowledge base without any modifications
    // Compression will happen only through JSON.stringify without whitespace
    return knowledgeBase;
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
        
        // "Compress" the knowledge base (keep original data, only remove whitespace)
        console.log('\n🔄 Preparing knowledge base (whitespace compression only)...');
        const compressedKnowledgeBase = compressKnowledgeBase(rawKnowledgeBase);
        
        // Calculate compression metrics
        const originalJson = JSON.stringify(rawKnowledgeBase, null, 2);
        const compressedJson = JSON.stringify(compressedKnowledgeBase); // No whitespace
        
        const originalSize = originalJson.length;
        const compressedSize = compressedJson.length;
        const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
        const estimatedTokens = Math.ceil(compressedSize / 4); // Rough estimate: 4 chars per token
        
        console.log(`📦 Compression results:`);
        console.log(`   Original size (with formatting): ${originalSize.toLocaleString()} characters`);
        console.log(`   Compressed size (no whitespace): ${compressedSize.toLocaleString()} characters`);
        console.log(`   Whitespace reduction: ${compressionRatio}%`);
        console.log(`   Estimated tokens: ~${estimatedTokens.toLocaleString()}`);
        
        // Write compressed knowledge base
        const outputPath = path.join(__dirname, '..', '..', 'assets', 'data', 'knowledge-base.json');
        fs.writeFileSync(outputPath, compressedJson, 'utf8');
        
        console.log(`\n✅ Knowledge base saved to: ${outputPath}`);
        console.log('📋 All original data preserved, only whitespace removed');
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