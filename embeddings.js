// Embeddings funkce pro Smart Search

// Kosinová podobnost mezi dvěma vektory
function cosineSimilarity(a, b) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Vytvořit textovou reprezentaci záznamu pro embedding
function recordToText(record, tableName) {
    let text = `Tabulka: ${tableName}. `;
    
    // Prioritizovat důležitá pole
    const importantFields = ['name', 'nazev', 'jmeno', 'prijmeni', 'email', 'telefon', 'firma', 'company'];
    
    for (const field of importantFields) {
        if (record[field]) {
            text += `${field}: ${record[field]}. `;
        }
    }
    
    // Přidat zbylá pole
    for (const [key, value] of Object.entries(record)) {
        if (!importantFields.includes(key) && value && typeof value !== 'object') {
            text += `${key}: ${value}. `;
        }
    }
    
    return text.substring(0, 1000); // Omezit délku
}

// Vytvořit embeddings pro všechna data s progress barem
async function createEmbeddings(tablesData, onProgress) {
    const embeddings = {};
    let totalRecords = 0;
    let processedRecords = 0;
    
    // Spočítat celkový počet záznamů
    for (const tableId in tablesData) {
        const table = tablesData[tableId];
        const tableData = Array.isArray(table.data) ? table.data : (table.data?.items || []);
        totalRecords += tableData.length;
    }
    
    // Zobrazit progress bar
    document.getElementById('embeddings-status').style.display = 'block';
    
    // Zpracovat po dávkách pro lepší výkon
    const batchSize = 10;
    const allTexts = [];
    const metadata = [];
    
    // Připravit všechny texty
    for (const tableId in tablesData) {
        const table = tablesData[tableId];
        const tableData = Array.isArray(table.data) ? table.data : (table.data?.items || []);
        
        for (const record of tableData) {
            const text = recordToText(record, table.name);
            allTexts.push(text);
            metadata.push({
                tableId: tableId,
                tableName: table.name,
                record: record
            });
        }
    }
    
    // Zpracovat po dávkách
    const allEmbeddings = [];
    
    for (let i = 0; i < allTexts.length; i += batchSize) {
        const batch = allTexts.slice(i, i + batchSize);
        
        try {
            const response = await fetch("https://api.openai.com/v1/embeddings", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${APP_CONFIG.OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: "text-embedding-ada-002",
                    input: batch
                })
            });
            
            if (!response.ok) {
                throw new Error(`Embedding API error: ${response.status}`);
            }
            
            const data = await response.json();
            allEmbeddings.push(...data.data.map(d => d.embedding));
            
            // Aktualizovat progress
            processedRecords += batch.length;
            const progress = (processedRecords / totalRecords) * 100;
            document.getElementById('embeddings-progress').style.width = `${progress}%`;
            document.getElementById('embeddings-text').textContent = 
                `Vytvářím vyhledávací index... ${Math.round(progress)}%`;
            
            if (onProgress) {
                onProgress(progress);
            }
            
        } catch (error) {
            console.error('Chyba při vytváření embeddings:', error);
            // Pokračovat s prázdnými embeddings pro tuto dávku
            for (let j = 0; j < batch.length; j++) {
                allEmbeddings.push(null);
            }
        }
        
        // Malá pauza mezi dávkami
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Uspořádat embeddings podle tabulek
    for (let i = 0; i < metadata.length; i++) {
        const meta = metadata[i];
        const embedding = allEmbeddings[i];
        
        if (!embeddings[meta.tableId]) {
            embeddings[meta.tableId] = [];
        }
        
        if (embedding) {
            embeddings[meta.tableId].push({
                text: allTexts[i],
                record: meta.record,
                embedding: embedding
            });
        }
    }
    
    // Uložit embeddings
    localStorage.setItem('tabidoo_embeddings', JSON.stringify(embeddings));
    localStorage.setItem('tabidoo_embeddings_timestamp', Date.now().toString());
    
    // Skrýt progress bar
    setTimeout(() => {
        document.getElementById('embeddings-status').style.display = 'none';
    }, 1000);
    
    console.log('Embeddings vytvořeny a uloženy');
    return embeddings;
}

// Najít relevantní data pomocí vektorového vyhledávání
async function findRelevantData(query, topK = 5) {
    try {
        // Získat embedding pro dotaz
        const queryResponse = await fetch("https://api.openai.com/v1/embeddings", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${APP_CONFIG.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "text-embedding-ada-002",
                input: query
            })
        });
        
        if (!queryResponse.ok) {
            throw new Error('Chyba při vytváření embedding pro dotaz');
        }
        
        const queryData = await queryResponse.json();
        const queryEmbedding = queryData.data[0].embedding;
        
        // Načíst uložené embeddings
        const embeddings = JSON.parse(localStorage.getItem('tabidoo_embeddings') || '{}');
        
        if (Object.keys(embeddings).length === 0) {
            throw new Error('Embeddings ještě nebyly vytvořeny');
        }
        
        // Najít nejpodobnější záznamy
        const results = [];
        
        for (const tableId in embeddings) {
            const tableName = tablesData[tableId]?.name || tableId;
            
            for (const item of embeddings[tableId]) {
                if (item.embedding) {
                    const similarity = cosineSimilarity(queryEmbedding, item.embedding);
                    results.push({
                        tableId: tableId,
                        tableName: tableName,
                        record: item.record,
                        text: item.text,
                        similarity: similarity
                    });
                }
            }
        }
        
        // Seřadit podle podobnosti a vrátit top K
        return results
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, topK);
            
    } catch (error) {
        console.error('Chyba při vyhledávání:', error);
        // Fallback na jednoduché textové vyhledávání
        return fallbackTextSearch(query, topK);
    }
}

// Fallback textové vyhledávání
function fallbackTextSearch(query, topK = 5) {
    const results = [];
    const searchTerms = query.toLowerCase().split(' ').filter(t => t.length > 2);
    
    for (const tableId in tablesData) {
        const table = tablesData[tableId];
        const tableData = Array.isArray(table.data) ? table.data : (table.data?.items || []);
        
        for (const record of tableData) {
            const recordText = JSON.stringify(record).toLowerCase();
            let score = 0;
            
            // Spočítat skóre podle počtu nalezených termínů
            for (const term of searchTerms) {
                if (recordText.includes(term)) {
                    score += 1;
                }
            }
            
            if (score > 0) {
                results.push({
                    tableId: tableId,
                    tableName: table.name,
                    record: record,
                    similarity: score / searchTerms.length
                });
            }
        }
    }
    
    return results
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK);
}

// Zkontrolovat, zda existují embeddings a jsou aktuální
function checkEmbeddings() {
    const embeddings = localStorage.getItem('tabidoo_embeddings');
    const embeddingsTimestamp = localStorage.getItem('tabidoo_embeddings_timestamp');
    const dataTimestamp = localStorage.getItem('tabidoo_data_timestamp');
    
    if (!embeddings || !embeddingsTimestamp) {
        return false;
    }
    
    // Pokud jsou data novější než embeddings, je potřeba je znovu vytvořit
    if (dataTimestamp && parseInt(dataTimestamp) > parseInt(embeddingsTimestamp)) {
        return false;
    }
    
    return true;
}
