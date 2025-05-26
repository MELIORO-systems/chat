// Funkce pro komunikaci s OpenAI

// Smart volání OpenAI
async function smartCallOpenAI(query) {
    console.log('Smart call OpenAI for query:', query);
    
    try {
        const queryType = analyzeQueryType(query);
        console.log('Query type:', queryType);
        
        // Systémové dotazy
        if (queryType === 'system') {
            const systemResponses = {
                'verz': 'Používám model GPT-3.5-turbo od OpenAI. Jsem asistent pro práci s vašimi daty z Tabidoo CRM.',
                'gpt': 'Používám model GPT-3.5-turbo, což je rychlý a efektivní model od OpenAI.',
                'model': 'Můj model je GPT-3.5-turbo. Pro vyhledávání používám embeddings model text-embedding-ada-002.',
                'kdo': 'Jsem AI asistent specializovaný na práci s vašimi daty z Tabidoo CRM. Umím vyhledávat, analyzovat a odpovídat na dotazy o vašich datech.',
                'umíš': 'Umím:\n• Vyhledávat v datech (např. "najdi kontakt Jana")\n• Zobrazovat seznamy (např. "vypiš všechny firmy")\n• Analyzovat data (např. "kolik máme firem")\n• Odpovídat na složité dotazy o vašich datech'
            };
            
            for (const [key, response] of Object.entries(systemResponses)) {
                if (query.toLowerCase().includes(key)) {
                    return response;
                }
            }
            
            return 'Jsem AI asistent pro Tabidoo CRM. Používám model GPT-3.5-turbo.';
        }
        
        // Dotazy na výpis/seznam
        if (queryType === 'list') {
            const lowerQuery = query.toLowerCase();
            
            // Určit, kterou tabulku chce uživatel
            if (lowerQuery.includes('firm')) {
                const result = getAllRecordsFromTable('Firma');
                return formatRecordsForDisplay(result.data, result.tableName);
            }
            
            if (lowerQuery.includes('kontakt')) {
                const result = getAllRecordsFromTable('Kontakty');
                return formatRecordsForDisplay(result.data, result.tableName);
            }
            
            if (lowerQuery.includes('aktiv')) {
                const result = getAllRecordsFromTable('Aktivity');
                return formatRecordsForDisplay(result.data, result.tableName);
            }
            
            if (lowerQuery.includes('obchod') || lowerQuery.includes('případ')) {
                const result = getAllRecordsFromTable('Obchodní případy');
                return formatRecordsForDisplay(result.data, result.tableName);
            }
            
            // Pokud chce všechno
            if (lowerQuery.includes('všech') || lowerQuery.includes('všeho')) {
                let output = "Zde je přehled všech dat v systému:\n\n";
                for (const tableId in tablesData) {
                    const table = tablesData[tableId];
                    const tableData = getActualTableData(table);
                    output += formatRecordsForDisplay(tableData, table.name, 5) + "\n\n";
                }
                return output;
            }
            
            // Použít GPT pro interpretaci
            return await callOpenAIWithData(query);
        }
        
        // Analytické dotazy
        if (queryType === 'analytics') {
            const analysis = analyzeDataForQuery(query);
            
            if (analysis && analysis.length > 20) {
                return analysis;
            }
            
            // Pro složitější analytické dotazy použít GPT
            return await callOpenAIWithData(query);
        }
        
        // Vyhledávací dotazy
        if (queryType === 'search') {
            const searchTerms = query.toLowerCase().split(' ').filter(t => t.length > 2);
            const results = fallbackTextSearch(query, CONFIG.DISPLAY.MAX_SEARCH_RESULTS);
            
            if (results.length === 0) {
                return CONFIG.MESSAGES.NO_RESULTS.replace('{query}', query);
            }
            
            let response = `Našel jsem ${results.length} relevantních záznamů:\n\n`;
            
            // Seskupit podle tabulek
            const grouped = {};
            for (const item of results) {
                if (!grouped[item.tableName]) {
                    grouped[item.tableName] = [];
                }
                grouped[item.tableName].push(item.record);
            }
            
            for (const [tableName, records] of Object.entries(grouped)) {
                response += formatRecordsForDisplay(records, tableName, 10);
                response += '\n';
            }
            
            return response;
        }
        
        // Obecné dotazy - použít GPT
        return await callOpenAIWithData(query);
        
    } catch (error) {
        console.error('Smart search error:', error);
        
        if (error.message.includes('Incorrect API key')) {
            return 'Chyba: Neplatný OpenAI API klíč. Zkontrolujte nastavení.';
        }
        
        return CONFIG.MESSAGES.ERROR_PREFIX + CONFIG.MESSAGES.ERROR_EXAMPLES;
    }
}

// Volání OpenAI s daty
async function callOpenAIWithData(query) {
    // Připravit kontext s daty
    let context = "Zde jsou data z Tabidoo CRM:\n\n";
    let totalChars = 0;
    const maxChars = 8000; // Limit pro kontext
    
    for (const tableId in tablesData) {
        const table = tablesData[tableId];
        const tableData = getActualTableData(table);
        
        if (totalChars > maxChars) break;
        
        context += `**${table.name}** (${tableData.length} záznamů):\n`;
        
        // Přidat všechna data nebo ukázku podle velikosti
        const dataToShow = tableData.length > 10 ? tableData.slice(0, 10) : tableData;
        
        dataToShow.forEach((record, index) => {
            if (totalChars > maxChars) return;
            
            const recordStr = JSON.stringify(record);
            context += `${index + 1}. ${recordStr}\n`;
            totalChars += recordStr.length;
        });
        
        if (tableData.length > 10) {
            context += `... a dalších ${tableData.length - 10} záznamů\n`;
        }
        
        context += "\n";
    }
    
    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${APP_CONFIG.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: CONFIG.API.OPENAI.MODEL,
                messages: [
                    {
                        role: "system",
                        content: CONFIG.PROMPTS.SYSTEM.DEFAULT
                    },
                    {
                        role: "user",
                        content: `${context}\n\nDotaz: ${query}`
                    }
                ],
                temperature: CONFIG.API.OPENAI.TEMPERATURE,
                max_tokens: CONFIG.API.OPENAI.MAX_TOKENS
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            console.error('OpenAI API error:', error);
            throw new Error(error.error?.message || 'OpenAI API Error');
        }
        
        const data = await response.json();
        return data.choices[0].message.content;
        
    } catch (error) {
        console.error('Error calling OpenAI:', error);
        
        // Fallback - zkusit lokální zpracování
        return processQueryLocally(query);
    }
}

// Lokální zpracování dotazu
function processQueryLocally(query) {
    const lowerQuery = query.toLowerCase();
    let response = "";
    
    // Pokud se ptá na konkrétní tabulku
    for (const tableId in tablesData) {
        const table = tablesData[tableId];
        if (lowerQuery.includes(table.name.toLowerCase())) {
            const tableData = getActualTableData(table);
            response += formatRecordsForDisplay(tableData, table.name);
            return response;
        }
    }
    
    // Jinak zobrazit přehled
    response = "Zde je přehled všech dat v databázi:\n\n";
    for (const tableId in tablesData) {
        const table = tablesData[tableId];
        const tableData = getActualTableData(table);
        response += `**${table.name}**: ${tableData.length} záznamů\n`;
        
        // Ukázka prvních záznamů
        if (tableData.length > 0) {
            response += "První záznamy:\n";
            tableData.slice(0, 3).forEach((record, index) => {
                const preview = Object.entries(record)
                    .filter(([key, value]) => value && !key.startsWith('_'))
                    .slice(0, 3)
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(', ');
                response += `${index + 1}. ${preview}\n`;
            });
        }
        response += "\n";
    }
    
    return response;
}
