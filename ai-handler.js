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
        
        // Analytické dotazy - ZŮSTÁVÁ STEJNÉ
        if (queryType === 'analytics') {
            const analysis = analyzeDataForQuery(query);
            
            if (analysis && analysis.length > 20) {
                return analysis;
            }
            
            // Pro složitější analytické dotazy použít GPT
            return await callOpenAIWithData(query);
        }
        
        // NOVÁ LOGIKA - Vyhledávání konkrétních záznamů
        const specificSearchResult = await handleSpecificSearch(query);
        if (specificSearchResult) {
            return specificSearchResult;
        }
        
        // Dotazy na výpis/seznam CELÝCH TABULEK
        if (queryType === 'list') {
            const lowerQuery = query.toLowerCase();
            
            // Kontrola, zda chce všechny záznamy z tabulky (bez konkrétního názvu)
            if (isRequestingAllRecords(query)) {
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
            }
        }
        
        // Vyhledávací dotazy - fallback textové vyhledávání
        if (queryType === 'search') {
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
        
        // Obecné dotazy - použít GPT s lepším kontextem
        return await callOpenAIWithData(query);
        
    } catch (error) {
        console.error('Smart search error:', error);
        
        if (error.message.includes('Incorrect API key')) {
            return 'Chyba: Neplatný OpenAI API klíč. Zkontrolujte nastavení.';
        }
        
        return CONFIG.MESSAGES.ERROR_PREFIX + CONFIG.MESSAGES.ERROR_EXAMPLES;
    }
}

// NOVÁ FUNKCE - Zpracování konkrétních vyhledávání
async function handleSpecificSearch(query) {
    const lowerQuery = query.toLowerCase();
    
    // Detekce dotazů na konkrétní firmu
    if (lowerQuery.includes('firm') && (lowerQuery.includes('podrobnosti') || lowerQuery.includes('informace') || lowerQuery.includes('detail'))) {
        const companyName = extractCompanyName(query);
        if (companyName) {
            console.log('Searching for specific company:', companyName);
            const company = findSpecificCompany(companyName);
            if (company) {
                return formatSingleRecord(company, 'Firma');
            } else {
                return `Nenašel jsem firmu "${companyName}" v databázi. Zkuste zadat přesný název nebo jeho část.`;
            }
        }
    }
    
    // Detekce dotazů na konkrétní kontakt
    if (lowerQuery.includes('kontakt') && (lowerQuery.includes('podrobnosti') || lowerQuery.includes('informace') || lowerQuery.includes('detail'))) {
        const contactName = extractPersonName(query);
        if (contactName) {
            console.log('Searching for specific contact:', contactName);
            const contact = findSpecificContact(contactName);
            if (contact) {
                return formatSingleRecord(contact, 'Kontakt');
            } else {
                return `Nenašel jsem kontakt "${contactName}" v databázi. Zkuste zadat jméno nebo příjmení.`;
            }
        }
    }
    
    // Detekce dotazů typu "co víme o firmě X"
    if ((lowerQuery.includes('co víme') || lowerQuery.includes('co víte') || lowerQuery.includes('informace')) && lowerQuery.includes('firm')) {
        const companyName = extractCompanyName(query);
        if (companyName) {
            const company = findSpecificCompany(companyName);
            if (company) {
                return await getCompanyWithRelatedData(company);
            }
        }
    }
    
    return null;
}

// NOVÁ FUNKCE - Extrakce názvu firmy z dotazu
function extractCompanyName(query) {
    // Různé vzory pro extrakci názvu firmy
    const patterns = [
        /(?:firm[aeyu]?\s+)([A-ZÁČĎĚÉÍŇÓŘŠŤÚŮÝŽ][a-záčďěéíňóřšťúůýž\s&.-]+)/i,
        /(?:o\s+firm[aeyu]?\s+)([A-ZÁČĎĚÉÍŇÓŘŠŤÚŮÝŽ][a-záčďěéíňóřšťúůýž\s&.-]+)/i,
        /(?:společnost[i]?\s+)([A-ZÁČĎĚÉÍŇÓŘŠŤÚŮÝŽ][a-záčďěéíňóřšťúůýž\s&.-]+)/i
    ];
    
    for (const pattern of patterns) {
        const match = query.match(pattern);
        if (match && match[1]) {
            return match[1].trim();
        }
    }
    
    return null;
}

// NOVÁ FUNKCE - Extrakce jména osoby z dotazu
function extractPersonName(query) {
    const patterns = [
        /(?:kontakt[uae]?\s+)([A-ZÁČĎĚÉÍŇÓŘŠŤÚŮÝŽ][a-záčďěéíňóřšťúůýž\s]+)/i,
        /(?:o\s+)([A-ZÁČĎĚÉÍŇÓŘŠŤÚŮÝŽ][a-záčďěéíňóřšťúůýž]+(?:\s+[A-ZÁČĎĚÉÍŇÓŘŠŤÚŮÝŽ][a-záčďěéíňóřšťúůýž]+)?)/i
    ];
    
    for (const pattern of patterns) {
        const match = query.match(pattern);
        if (match && match[1]) {
            return match[1].trim();
        }
    }
    
    return null;
}

// NOVÁ FUNKCE - Najít konkrétní firmu
function findSpecificCompany(companyName) {
    const companiesTable = tablesData['Customers'];
    if (!companiesTable) return null;
    
    const companies = getActualTableData(companiesTable);
    const searchName = companyName.toLowerCase();
    
    // Hledat přesnou shodu nebo obsahující název
    for (const company of companies) {
        const companyData = company.fields || company;
        const names = [
            companyData.name,
            companyData.nazev,
            companyData.company,
            companyData.title
        ].filter(n => n);
        
        for (const name of names) {
            if (name && name.toLowerCase().includes(searchName)) {
                return company;
            }
        }
    }
    
    return null;
}

// NOVÁ FUNKCE - Najít konkrétní kontakt
function findSpecificContact(contactName) {
    const contactsTable = tablesData['Contacts'];
    if (!contactsTable) return null;
    
    const contacts = getActualTableData(contactsTable);
    const searchName = contactName.toLowerCase();
    
    for (const contact of contacts) {
        const contactData = contact.fields || contact;
        const names = [
            contactData.name,
            contactData.jmeno,
            contactData.prijmeni,
            `${contactData.jmeno} ${contactData.prijmeni}`.trim()
        ].filter(n => n);
        
        for (const name of names) {
            if (name && name.toLowerCase().includes(searchName)) {
                return contact;
            }
        }
    }
    
    return null;
}

// NOVÁ FUNKCE - Kontrola, zda chce uživatel všechny záznamy
function isRequestingAllRecords(query) {
    const lowerQuery = query.toLowerCase();
    
    // Pokud dotaz obsahuje konkrétní název, NENÍ to požadavek na všechny záznamy
    if (extractCompanyName(query) || extractPersonName(query)) {
        return false;
    }
    
    // Pokud obsahuje slova jako "všechny", "seznam", "vypiš"
    const listKeywords = ['všechny', 'všech', 'seznam', 'vypiš', 'zobraz', 'jaké', 'které'];
    return listKeywords.some(keyword => lowerQuery.includes(keyword));
}

// NOVÁ FUNKCE - Formátování jednotlivého záznamu
function formatSingleRecord(record, recordType) {
    const data = record.fields || record;
    let output = `**Detaily ${recordType.toLowerCase()}u:**\n\n`;
    
    // Prioritní pole podle typu
    let priorityFields = [];
    if (recordType === 'Firma') {
        priorityFields = ['name', 'nazev', 'company', 'title', 'email', 'telefon', 'city', 'street', 'ZIP', 'owner', 'status'];
    } else if (recordType === 'Kontakt') {
        priorityFields = ['name', 'jmeno', 'prijmeni', 'email', 'telefon', 'firma', 'company', 'position', 'owner'];
    }
    
    // Zobrazit prioritní pole
    for (const fieldName of priorityFields) {
        const value = data[fieldName];
        if (value) {
            const displayValue = getDisplayValue(value, fieldName);
            if (displayValue && displayValue !== 'Nepojmenovaný záznam') {
                const label = CONFIG.FIELD_MAPPINGS.FIELD_LABELS[fieldName] || fieldName;
                output += `• **${label}:** ${displayValue}\n`;
            }
        }
    }
    
    // Přidat další pole, pokud jsou k dispozici
    const otherFields = Object.entries(data)
        .filter(([key, value]) => {
            return value && 
                   !priorityFields.includes(key) &&
                   !CONFIG.FIELD_MAPPINGS.HIDDEN_FIELDS.some(hidden => key.includes(hidden)) &&
                   !key.startsWith('_');
        })
        .slice(0, 5); // Max 5 dalších polí
    
    if (otherFields.length > 0) {
        output += '\n**Další informace:**\n';
        for (const [key, value] of otherFields) {
            const displayValue = getDisplayValue(value, key);
            if (displayValue && displayValue !== 'Nepojmenovaný záznam') {
                const label = CONFIG.FIELD_MAPPINGS.FIELD_LABELS[key] || key;
                output += `• **${label}:** ${displayValue}\n`;
            }
        }
    }
    
    return output;
}

// NOVÁ FUNKCE - Získat firmu s souvisejícími daty
async function getCompanyWithRelatedData(company) {
    let output = formatSingleRecord(company, 'Firma');
    
    // Pokusit se najít související kontakty
    const companyData = company.fields || company;
    const companyName = companyData.name || companyData.nazev || companyData.company;
    
    if (companyName) {
        const relatedContacts = findContactsByCompany(companyName);
        if (relatedContacts.length > 0) {
            output += '\n**Související kontakty:**\n';
            relatedContacts.slice(0, 3).forEach((contact, index) => {
                const contactData = contact.fields || contact;
                const name = contactData.name || `${contactData.jmeno} ${contactData.prijmeni}`.trim();
                const email = contactData.email ? ` (${getDisplayValue(contactData.email)})` : '';
                output += `${index + 1}. ${name}${email}\n`;
            });
            
            if (relatedContacts.length > 3) {
                output += `... a dalších ${relatedContacts.length - 3} kontaktů\n`;
            }
        }
    }
    
    return output;
}

// NOVÁ FUNKCE - Najít kontakty podle firmy
function findContactsByCompany(companyName) {
    const contactsTable = tablesData['Contacts'];
    if (!contactsTable) return [];
    
    const contacts = getActualTableData(contactsTable);
    const searchName = companyName.toLowerCase();
    
    return contacts.filter(contact => {
        const contactData = contact.fields || contact;
        const companyFields = [
            contactData.firma,
            contactData.company,
            contactData.employer
        ].filter(f => f);
        
        return companyFields.some(field => {
            const fieldValue = getDisplayValue(field);
            return fieldValue && fieldValue.toLowerCase().includes(searchName);
        });
    });
}

// UPRAVENÁ FUNKCE - Volání OpenAI s lepším kontextem
async function callOpenAIWithData(query) {
    // Připravit strukturovaný kontext místo surového JSON
    let context = "Data z Tabidoo CRM:\n\n";
    let totalChars = 0;
    const maxChars = 6000; // Snížený limit pro lepší kvalitu
    
    // Nejdřív přidat relevantní data podle dotazu
    const relevantData = getRelevantDataForQuery(query);
    
    for (const [tableName, records] of Object.entries(relevantData)) {
        if (totalChars > maxChars) break;
        
        context += `=== ${tableName} ===\n`;
        
        for (let i = 0; i < records.length && totalChars < maxChars; i++) {
            const record = records[i];
            const recordData = record.fields || record;
            
            // Strukturované zobrazení místo JSON
            const recordText = formatRecordForAI(recordData, tableName);
            if (totalChars + recordText.length < maxChars) {
                context += `${i + 1}. ${recordText}\n`;
                totalChars += recordText.length;
            } else {
                break;
            }
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
                        content: `Jsi asistent pro Tabidoo CRM. Odpovídej přesně podle poskytnutých dat. 
                        Když se uživatel ptá na konkrétní firmu nebo kontakt, odpověz POUZE o té konkrétní entitě. 
                        Když se ptá na seznam, vypiš relevantní záznamy. 
                        Odpovídej česky a strukturovaně.`
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
        return processQueryLocally(query);
    }
}

// NOVÁ FUNKCE - Získat relevantní data pro dotaz
function getRelevantDataForQuery(query) {
    const lowerQuery = query.toLowerCase();
    const relevantData = {};
    
    // Určit, které tabulky jsou relevantní
    if (lowerQuery.includes('firm')) {
        const companiesTable = tablesData['Customers'];
        if (companiesTable) {
            relevantData['Firmy'] = getActualTableData(companiesTable).slice(0, 10);
        }
    }
    
    if (lowerQuery.includes('kontakt')) {
        const contactsTable = tablesData['Contacts'];
        if (contactsTable) {
            relevantData['Kontakty'] = getActualTableData(contactsTable).slice(0, 10);
        }
    }
    
    if (lowerQuery.includes('aktiv')) {
        const activitiesTable = tablesData['Activities'];
        if (activitiesTable) {
            relevantData['Aktivity'] = getActualTableData(activitiesTable).slice(0, 5);
        }
    }
    
    if (lowerQuery.includes('obchod') || lowerQuery.includes('případ')) {
        const dealsTable = tablesData['Deals'];
        if (dealsTable) {
            relevantData['Obchodní případy'] = getActualTableData(dealsTable).slice(0, 5);
        }
    }
    
    // Pokud není nic specifické, přidat všechny tabulky s omezeným počtem záznamů
    if (Object.keys(relevantData).length === 0) {
        for (const tableId in tablesData) {
            const table = tablesData[tableId];
            const tableData = getActualTableData(table);
            relevantData[table.name] = tableData.slice(0, 3);
        }
    }
    
    return relevantData;
}

// NOVÁ FUNKCE - Formátování záznamu pro AI
function formatRecordForAI(record, tableName) {
    const importantFields = CONFIG.FIELD_MAPPINGS.IMPORTANT_FIELDS;
    const parts = [];
    
    // Přidat důležitá pole
    for (const field of importantFields) {
        if (record[field]) {
            const value = getDisplayValue(record[field], field);
            if (value && value !== 'Nepojmenovaný záznam') {
                const label = CONFIG.FIELD_MAPPINGS.FIELD_LABELS[field] || field;
                parts.push(`${label}: ${value}`);
            }
        }
    }
    
    return parts.join(', ');
}

// UPRAVENÁ FUNKCE - Lokální zpracování dotazu
function processQueryLocally(query) {
    const lowerQuery = query.toLowerCase();
    let response = "";
    
    // Pokud se ptá na konkrétní firmu
    const companyName = extractCompanyName(query);
    if (companyName) {
        const company = findSpecificCompany(companyName);
        if (company) {
            return formatSingleRecord(company, 'Firma');
        } else {
            return `Nenašel jsem firmu "${companyName}" v databázi.`;
        }
    }
    
    // Pokud se ptá na konkrétní tabulku
    for (const tableId in tablesData) {
        const table = tablesData[tableId];
        if (lowerQuery.includes(table.name.toLowerCase())) {
            const tableData = getActualTableData(table);
            return formatRecordsForDisplay(tableData, table.name);
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
                const recordData = record.fields || record;
                const preview = Object.entries(recordData)
                    .filter(([key, value]) => value && !key.startsWith('_'))
                    .slice(0, 3)
                    .map(([key, value]) => `${key}: ${getDisplayValue(value)}`)
                    .join(', ');
                response += `${index + 1}. ${preview}\n`;
            });
        }
        response += "\n";
    }
    
    return response;
}
