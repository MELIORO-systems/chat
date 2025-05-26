// Vyhledávací funkce

// Analyzovat typ dotazu
function analyzeQueryType(query) {
    const lowerQuery = query.toLowerCase();
    
    // Systémové dotazy
    if (lowerQuery.includes('verz') || lowerQuery.includes('gpt') || lowerQuery.includes('model') ||
        lowerQuery.includes('kdo jsi') || lowerQuery.includes('co umíš')) {
        return 'system';
    }
    
    // Dotazy na výpis/seznam
    if (lowerQuery.includes('vypiš') || lowerQuery.includes('seznam') || 
        lowerQuery.includes('jaké') || lowerQuery.includes('které') || 
        lowerQuery.includes('názvy') || lowerQuery.includes('jména') || 
        lowerQuery.includes('všechny') || lowerQuery.includes('ukáž') ||
        lowerQuery.includes('zobraz')) {
        return 'list';
    }
    
    // Analytické dotazy
    if (lowerQuery.includes('kolik') || lowerQuery.includes('počet') || 
        lowerQuery.includes('součet') || lowerQuery.includes('průměr') || 
        lowerQuery.includes('celkem') || lowerQuery.includes('statistik')) {
        return 'analytics';
    }
    
    // Vyhledávací dotazy
    if (lowerQuery.includes('najdi') || lowerQuery.includes('vyhledej') || 
        lowerQuery.includes('hledej')) {
        return 'search';
    }
    
    // Pokud obsahuje název entity a ptá se na konkrétní věci
    if ((lowerQuery.includes('firm') || lowerQuery.includes('kontakt') || 
         lowerQuery.includes('aktiv') || lowerQuery.includes('obchod') || 
         lowerQuery.includes('případ')) && 
        (lowerQuery.includes('konkrét') || lowerQuery.includes('jsou') || 
         lowerQuery.includes('máme'))) {
        return 'list';
    }
    
    return 'general';
}

// Získat všechna data z konkrétní tabulky
function getAllRecordsFromTable(tableName) {
    for (const tableId in tablesData) {
        const table = tablesData[tableId];
        if (table.name.toLowerCase().includes(tableName.toLowerCase())) {
            return {
                tableName: table.name,
                data: getActualTableData(table)
            };
        }
    }
    return { tableName: tableName, data: [] };
}

// Fallback textové vyhledávání
function fallbackTextSearch(query, topK = 10) {
    const results = [];
    const searchTerms = query.toLowerCase().split(' ').filter(t => t.length >= CONFIG.SEARCH.MIN_TERM_LENGTH);
    
    console.log('Fallback search for:', searchTerms);
    
    for (const tableId in tablesData) {
        const table = tablesData[tableId];
        const tableData = getActualTableData(table);
        
        for (const record of tableData) {
            const recordText = JSON.stringify(record).toLowerCase();
            let score = 0;
            
            for (const term of searchTerms) {
                if (recordText.includes(term)) {
                    score += CONFIG.SEARCH.FIELD_WEIGHTS.DEFAULT;
                    
                    // Bonus za shodu v důležitých polích
                    for (const field of CONFIG.FIELD_MAPPINGS.IMPORTANT_FIELDS) {
                        if (record[field] && String(record[field]).toLowerCase().includes(term)) {
                            score += CONFIG.SEARCH.FIELD_WEIGHTS.IMPORTANT;
                        }
                    }
                }
            }
            
            if (score > 0) {
                results.push({
                    tableId: tableId,
                    tableName: table.name,
                    record: record,
                    similarity: score / (searchTerms.length || 1)
                });
            }
        }
    }
    
    return results
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK);
}
