// Vyhledávací funkce

// UPRAVENÁ FUNKCE - Analyzovat typ dotazu
function analyzeQueryType(query) {
    const lowerQuery = query.toLowerCase();
    
    // Systémové dotazy
    if (lowerQuery.includes('verz') || lowerQuery.includes('gpt') || lowerQuery.includes('model') ||
        lowerQuery.includes('kdo jsi') || lowerQuery.includes('co umíš')) {
        return 'system';
    }
    
    // NOVÁ LOGIKA - Konkrétní vyhledávání má prioritu před obecným seznamem
    if (hasSpecificEntityRequest(query)) {
        return 'search';
    }
    
    // Analytické dotazy
    if (lowerQuery.includes('kolik') || lowerQuery.includes('počet') || 
        lowerQuery.includes('součet') || lowerQuery.includes('průměr') || 
        lowerQuery.includes('celkem') || lowerQuery.includes('statistik')) {
        return 'analytics';
    }
    
    // Dotazy na výpis/seznam CELÝCH TABULEK
    if (lowerQuery.includes('vypiš') || lowerQuery.includes('seznam') || 
        lowerQuery.includes('jaké') || lowerQuery.includes('které') || 
        lowerQuery.includes('názvy') || lowerQuery.includes('jména') || 
        lowerQuery.includes('všechny') || lowerQuery.includes('ukáž') ||
        lowerQuery.includes('zobraz')) {
        return 'list';
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

// NOVÁ FUNKCE - Detekce konkrétního dotazu na entitu
function hasSpecificEntityRequest(query) {
    const lowerQuery = query.toLowerCase();
    
    // Klíčová slova pro konkrétní požadavky
    const specificKeywords = [
        'podrobnosti', 'detail', 'informace', 'co víme', 'co víte', 
        'řekni mi', 'ukaž mi', 'zobraz mi', 'najdi mi'
    ];
    
    // Pokud obsahuje konkrétní klíčové slovo + název entity
    const hasSpecificKeyword = specificKeywords.some(keyword => lowerQuery.includes(keyword));
    
    if (hasSpecificKeyword) {
        // Kontrola, zda obsahuje konkrétní název
        if (containsSpecificName(query)) {
            return true;
        }
    }
    
    // Vzory pro konkrétní dotazy
    const specificPatterns = [
        /firm[aeyu]?\s+[A-ZÁČĎĚÉÍŇÓŘŠŤÚŮÝŽ]/i,  // "firma ABC", "firmy XYZ"
        /kontakt[uae]?\s+[A-ZÁČĎĚÉÍŇÓŘŠŤÚŮÝŽ]/i, // "kontakt Jana"
        /o\s+firm[aeyu]?\s+[A-ZÁČĎĚÉÍŇÓŘŠŤÚŮÝŽ]/i, // "o firmě ABC"
        /společnost[i]?\s+[A-ZÁČĎĚÉÍŇÓŘŠŤÚŮÝŽ]/i   // "společnosti XYZ"
    ];
    
    return specificPatterns.some(pattern => pattern.test(query));
}

// NOVÁ FUNKCE - Kontrola, zda dotaz obsahuje konkrétní název
function containsSpecificName(query) {
    // Hledat vzory velkých písmen (názvy firem, jména)
    const namePatterns = [
        /[A-ZÁČĎĚÉÍŇÓŘŠŤÚŮÝŽ][a-záčďěéíňóřšťúůýž]+(?:\s+[A-ZÁČĎĚÉÍŇÓŘŠŤÚŮÝŽ][a-záčďěéíňóřšťúůýž]*)*(?:\s+[a-z]+\.?)?/g
    ];
    
    for (const pattern of namePatterns) {
        const matches = query.match(pattern);
        if (matches) {
            // Filtrovat běžná slova
            const commonWords = ['Vypiš', 'Zobraz', 'Najdi', 'Kolik', 'Jaké', 'Které', 'Firma', 'Kontakt', 'Aktivity'];
            const realNames = matches.filter(match => !commonWords.includes(match));
            if (realNames.length > 0) {
                return true;
            }
        }
    }
    
    return false;
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

// UPRAVENÁ FUNKCE - Fallback textové vyhledávání s lepším skórováním
function fallbackTextSearch(query, topK = 10) {
    const results = [];
    const searchTerms = query.toLowerCase().split(' ').filter(t => t.length >= CONFIG.SEARCH.MIN_TERM_LENGTH);
    
    console.log('Fallback search for:', searchTerms);
    
    // Extrahovat možný název entity z dotazu
    const possibleEntityName = extractPossibleEntityName(query);
    console.log('Possible entity name:', possibleEntityName);
    
    for (const tableId in tablesData) {
        const table = tablesData[tableId];
        const tableData = getActualTableData(table);
        
        for (const record of tableData) {
            const recordData = record.fields || record;
            let score = 0;
            
            // Pokud máme možný název entity, dát mu nejvyšší prioritu
            if (possibleEntityName) {
                const entityScore = scoreEntityMatch(recordData, possibleEntityName);
                score += entityScore * 10; // Vysoká váha pro přesné shody
            }
            
            // Standardní textové vyhledávání
            const recordText = JSON.stringify(recordData).toLowerCase();
            
            for (const term of searchTerms) {
                if (recordText.includes(term)) {
                    score += CONFIG.SEARCH.FIELD_WEIGHTS.DEFAULT;
                    
                    // Bonus za shodu v důležitých polích
                    for (const field of CONFIG.FIELD_MAPPINGS.IMPORTANT_FIELDS) {
                        if (recordData[field] && String(recordData[field]).toLowerCase().includes(term)) {
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

// NOVÁ FUNKCE - Extrakce možného názvu entity
function extractPossibleEntityName(query) {
    // Vzory pro názvy firem
    const companyPatterns = [
        /(?:firm[aeyu]?\s+)([A-ZÁČĎĚÉÍŇÓŘŠŤÚŮÝŽ][a-záčďěéíňóřšťúůýž\s&.-]+)/i,
        /(?:o\s+firm[aeyu]?\s+)([A-ZÁČĎĚÉÍŇÓŘŠŤÚŮÝŽ][a-záčďěéíňóřšťúůýž\s&.-]+)/i,
        /(?:společnost[i]?\s+)([A-ZÁČĎĚÉÍŇÓŘŠŤÚŮÝŽ][a-záčďěéíňóřšťúůýž\s&.-]+)/i
    ];
    
    // Vzory pro jména osob
    const personPatterns = [
        /(?:kontakt[uae]?\s+)([A-ZÁČĎĚÉÍŇÓŘŠŤÚŮÝŽ][a-záčďěéíňóřšťúůýž\s]+)/i,
        /(?:o\s+)([A-ZÁČĎĚÉÍŇÓŘŠŤÚŮÝŽ][a-záčďěéíňóřšťúůýž]+(?:\s+[A-ZÁČĎĚÉÍŇÓŘŠŤÚŮÝŽ][a-záčďěéíňóřšťúůýž]+)?)/i
    ];
    
    const allPatterns = [...companyPatterns, ...personPatterns];
    
    for (const pattern of allPatterns) {
        const match = query.match(pattern);
        if (match && match[1]) {
            return match[1].trim();
        }
    }
    
    return null;
}

// NOVÁ FUNKCE - Skórování shody s entitou
function scoreEntityMatch(recordData, entityName) {
    const searchName = entityName.toLowerCase();
    let maxScore = 0;
    
    // Pole, která kontrolujeme pro shodu
    const fieldsToCheck = [
        'name', 'nazev', 'company', 'title', 'jmeno', 'prijmeni'
    ];
    
    for (const field of fieldsToCheck) {
        if (recordData[field]) {
            const fieldValue = getDisplayValue(recordData[field]).toLowerCase();
            
            // Přesná shoda
            if (fieldValue === searchName) {
                maxScore = Math.max(maxScore, 100);
            }
            // Obsahuje hledaný text
            else if (fieldValue.includes(searchName)) {
                maxScore = Math.max(maxScore, 50);
            }
            // Hledaný text obsahuje hodnotu pole (kratší název)
            else if (searchName.includes(fieldValue) && fieldValue.length > 2) {
                maxScore = Math.max(maxScore, 30);
            }
        }
    }
    
    // Speciální zpracování pro kombinace jméno + příjmení
    if (recordData.jmeno && recordData.prijmeni) {
        const fullName = `${getDisplayValue(recordData.jmeno)} ${getDisplayValue(recordData.prijmeni)}`.toLowerCase();
        if (fullName.includes(searchName) || searchName.includes(fullName)) {
            maxScore = Math.max(maxScore, 80);
        }
    }
    
    return maxScore;
}

// NOVÁ FUNKCE - Inteligentní vyhledávání podle typu entity
function smartEntitySearch(query, entityType, topK = 5) {
    const results = [];
    const searchTerms = query.toLowerCase().split(' ').filter(t => t.length >= 2);
    
    let targetTable = null;
    
    // Určit cílovou tabulku podle typu entity
    switch (entityType.toLowerCase()) {
        case 'firma':
        case 'company':
            targetTable = tablesData['Customers'];
            break;
        case 'kontakt':
        case 'contact':
            targetTable = tablesData['Contacts'];
            break;
        case 'aktivita':
        case 'activity':
            targetTable = tablesData['Activities'];
            break;
        case 'obchod':
        case 'deal':
            targetTable = tablesData['Deals'];
            break;
    }
    
    if (!targetTable) {
        return fallbackTextSearch(query, topK);
    }
    
    const tableData = getActualTableData(targetTable);
    const possibleEntityName = extractPossibleEntityName(query);
    
    for (const record of tableData) {
        const recordData = record.fields || record;
        let score = 0;
        
        // Skórování podle názvu entity
        if (possibleEntityName) {
            score += scoreEntityMatch(recordData, possibleEntityName) * 2;
        }
        
        // Standardní textové skórování
        const recordText = JSON.stringify(recordData).toLowerCase();
        for (const term of searchTerms) {
            if (recordText.includes(term)) {
                score += 1;
            }
        }
        
        if (score > 0) {
            results.push({
                tableId: Object.keys(tablesData).find(id => tablesData[id] === targetTable),
                tableName: targetTable.name,
                record: record,
                similarity: score
            });
        }
    }
    
    return results
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK);
}

// NOVÁ FUNKCE - Vyhledávání s kontextovým pochopením
function contextualSearch(query, topK = 10) {
    const lowerQuery = query.toLowerCase();
    
    // Určit kontext dotazu
    if (lowerQuery.includes('firm')) {
        return smartEntitySearch(query, 'firma', topK);
    } else if (lowerQuery.includes('kontakt')) {
        return smartEntitySearch(query, 'kontakt', topK);
    } else if (lowerQuery.includes('aktiv')) {
        return smartEntitySearch(query, 'aktivita', topK);
    } else if (lowerQuery.includes('obchod') || lowerQuery.includes('případ')) {
        return smartEntitySearch(query, 'obchod', topK);
    }
    
    // Fallback na obecné vyhledávání
    return fallbackTextSearch(query, topK);
}
