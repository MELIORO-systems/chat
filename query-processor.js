// Hlavní procesor dotazů - "mozek" systému - OPRAVENÁ VERZE

class QueryProcessor {
    constructor(tablesData) {
        this.tablesData = tablesData;
        this.searchEngine = new LocalSearchEngine(tablesData);
    }
    
    // Hlavní funkce - zpracuje dotaz a vrátí strukturovaný výsledek
    async processQuery(query) {
        console.log('🧠 Processing query:', query);
        
        try {
            // 1. Analyzovat typ dotazu
            const queryAnalysis = this.analyzeQuery(query);
            console.log('📊 Query analysis:', queryAnalysis);
            
            // 2. Zpracovat podle typu
            let result;
            switch (queryAnalysis.type) {
                case 'count':
                    result = this.handleCountQuery(queryAnalysis);
                    break;
                case 'list_all':
                    result = this.handleListAllQuery(queryAnalysis);
                    break;
                case 'search_specific':
                    result = this.handleSpecificSearchQuery(queryAnalysis);
                    break;
                case 'get_details':
                    result = this.handleDetailsQuery(queryAnalysis);
                    break;
                case 'find_related':
                    result = this.handleRelatedQuery(queryAnalysis);
                    break;
                case 'system':
                    result = this.handleSystemQuery(queryAnalysis);
                    break;
                default:
                    result = this.handleGeneralQuery(queryAnalysis);
            }
            
            console.log('✅ Local result:', result);
            
            // 3. Rozhodnout, zda použít ChatGPT pro formulaci
            if (result.useAI && APP_CONFIG.OPENAI_API_KEY) {
                result.response = await this.formatWithAI(query, result);
            }
            
            return result;
            
        } catch (error) {
            console.error('❌ Query processing error:', error);
            return {
                type: 'error',
                response: 'Omlouvám se, nastala chyba při zpracování dotazu. Zkuste to prosím znovu.',
                useAI: false
            };
        }
    }
    
    // Analýza dotazu - určí typ a extrahuje parametry
    analyzeQuery(query) {
        const lowerQuery = query.toLowerCase().trim();
        const analysis = {
            originalQuery: query,
            type: 'general',
            entity: null,
            entityName: null,
            action: null,
            parameters: {}
        };
        
        // VŽDY extrahovat entitu na začátku
        analysis.entity = this.extractEntity(lowerQuery);
        
        // Systémové dotazy
        if (this.isSystemQuery(lowerQuery)) {
            analysis.type = 'system';
            return analysis;
        }
        
        // Počítání záznamů
        if (this.isCountQuery(lowerQuery)) {
            analysis.type = 'count';
            return analysis;
        }
        
        // Výpis všech záznamů - VYLEPŠENÁ DETEKCE
        if (this.isListAllQuery(lowerQuery)) {
            analysis.type = 'list_all';
            return analysis;
        }
        
        // TEPRVE POTOM extrahovat konkrétní název entity
        analysis.entityName = this.extractEntityName(query);
        
        if (analysis.entityName) {
            // Detaily o konkrétní entitě
            if (this.isDetailsQuery(lowerQuery)) {
                analysis.type = 'get_details';
                return analysis;
            }
            
            // Hledání souvisejících dat
            if (this.isRelatedQuery(lowerQuery)) {
                analysis.type = 'find_related';
                return analysis;
            }
            
            // Obecné vyhledávání konkrétní entity
            analysis.type = 'search_specific';
            return analysis;
        }
        
        // Pokud není nic specifického, je to obecný dotaz
        return analysis;
    }
    
    // Detekce systémových dotazů
    isSystemQuery(query) {
        const systemKeywords = ['verz', 'gpt', 'model', 'kdo jsi', 'co umíš', 'pomoc', 'help'];
        return systemKeywords.some(keyword => query.includes(keyword));
    }
    
    // Detekce dotazů na počet
    isCountQuery(query) {
        const countKeywords = ['kolik', 'počet', 'celkem', 'součet'];
        return countKeywords.some(keyword => query.includes(keyword));
    }
    
    // VYLEPŠENÁ detekce dotazů na výpis všech záznamů
    isListAllQuery(query) {
        const listKeywords = [
            'vypiš', 'seznam', 'všechny', 'všech', 'jaké', 'které', 'zobraz', 'jména', 'názvy', 'ukáž',
            'konkrétně jsou', 'to jsou', 'máme', 'existují', 'jsou to'
        ];
        
        const hasListKeyword = listKeywords.some(keyword => query.includes(keyword));
        
        // Konkrétní vzory pro "jaké X to jsou"
        const listPatterns = [
            /jaké\s+\w+\s+(to\s+)?(konkrétně\s+)?jsou/i,
            /které\s+\w+\s+(to\s+)?(konkrétně\s+)?jsou/i,
            /co\s+jsou\s+to\s+za\s+\w+/i
        ];
        
        const hasListPattern = listPatterns.some(pattern => pattern.test(query));
        
        // Pokud má list keyword nebo pattern, je to list_all
        if (hasListKeyword || hasListPattern) {
            // DŮLEŽITÉ: Nesmí obsahovat konkrétní název entity
            const hasSpecificName = this.hasSpecificEntityName(query);
            return !hasSpecificName;
        }
        
        return false;
    }
    
    // Kontrola, zda dotaz obsahuje konkrétní název entity
    hasSpecificEntityName(query) {
        // Konkrétní vzory pro názvy firem a osob
        const specificPatterns = [
            /\b[A-ZÁČĎĚÉÍŇÓŘŠŤÚŮÝŽ][a-záčďěéíňóřšťúůýž]+\s+[A-ZÁČĎĚÉÍŇÓŘŠŤÚŮÝŽ][a-záčďěéíňóřšťúůýž]+/,  // Jméno Příjmení
            /\b[A-ZÁČĎĚÉÍŇÓŘŠŤÚŮÝŽ][a-záčďěéíňóřšťúůýž]+\s+(s\.r\.o\.|a\.s\.|spol\.|Ltd)/i,  // Firma s.r.o.
            /\b[A-ZÁČĎĚÉÍŇÓŘŠŤÚŮÝŽ][a-záčďěéíňóřšťúůýž]{3,}/  // Dlouhé vlastní jméno
        ];
        
        // Vyloučit obecné fráze
        const genericPhrases = [
            'to konkrétně jsou', 'to jsou', 'které jsou', 'jaké jsou', 'co jsou',
            'všechny', 'všech', 'máme', 'existují'
        ];
        
        // Pokud obsahuje jen obecné fráze, není to konkrétní název
        const hasOnlyGeneric = genericPhrases.some(phrase => query.toLowerCase().includes(phrase));
        if (hasOnlyGeneric) return false;
        
        // Kontrola konkrétních vzorů
        return specificPatterns.some(pattern => pattern.test(query));
    }
    
    // Detekce dotazů na detaily
    isDetailsQuery(query) {
        const detailKeywords = ['podrobnosti', 'detail', 'informace', 'údaje', 'data'];
        return detailKeywords.some(keyword => query.includes(keyword));
    }
    
    // Detekce dotazů na související data
    isRelatedQuery(query) {
        const relatedKeywords = ['souvisej', 'spojeny', 'události', 'deal', 'aktivit', 'komunikace'];
        return relatedKeywords.some(keyword => query.includes(keyword));
    }
    
    // Extrakce typu entity (firma, kontakt, atd.)
    extractEntity(query) {
        // Všechny možné tvary slova "firma" a související termíny
        const companyKeywords = ['firm', 'firem', 'firmy', 'firmu', 'firmě', 'firmou', 'společnost', 'společnosti', 'společností', 'společnostmi', 'podnik', 'organizac'];
        const contactKeywords = ['kontakt', 'kontakty', 'kontaktů', 'kontaktem', 'osob', 'osoby', 'lidí', 'lidi', 'člověk'];
        const activityKeywords = ['aktiv', 'aktivit', 'aktivy', 'úkol', 'úkolů', 'událost', 'události', 'úloha'];
        const dealKeywords = ['obchod', 'obchodů', 'obchody', 'deal', 'dealy', 'případ', 'případy', 'případů', 'prodej', 'prodeje', 'nabíd', 'nabídky'];
        
        // Kontrola všech klíčových slov
        if (companyKeywords.some(keyword => query.includes(keyword))) return 'company';
        if (contactKeywords.some(keyword => query.includes(keyword))) return 'contact';
        if (activityKeywords.some(keyword => query.includes(keyword))) return 'activity';
        if (dealKeywords.some(keyword => query.includes(keyword))) return 'deal';
            
        return null;
    }
    
    // ZPŘÍSNĚNÁ extrakce názvu konkrétní entity
    extractEntityName(query) {
        // Vzory pro názvy firem - ZPŘÍSNĚNÉ
        const companyPatterns = [
            /(?:firm[aeyu]?\s+)([A-ZÁČĎĚÉÍŇÓŘŠŤÚŮÝŽ][a-záčďěéíňóřšťúůýž\s&.,-]{2,}(?:\s+[a-z]+\.?)*)/i,
            /(?:společnost[i]?\s+)([A-ZÁČĎĚÉÍŇÓŘŠŤÚŮÝŽ][a-záčďěéíňóřšťúůýž\s&.,-]{2,})/i,
            /(?:najdi\s+)([A-ZÁČĎĚÉÍŇÓŘŠŤÚŮÝŽ][a-záčďěéíňóřšťúůýž\s&.,-]{2,})/i
        ];
        
        // Vzory pro jména osob - ZPŘÍSNĚNÉ
        const personPatterns = [
            /(?:kontakt[uae]?\s+)([A-ZÁČĎĚÉÍŇÓŘŠŤÚŮÝŽ][a-záčďěéíňóřšťúůýž]+\s+[A-ZÁČĎĚÉÍŇÓŘŠŤÚŮÝŽ][a-záčďěéíňóřšťúůýž]+)/i,
            /(?:najdi\s+)([A-ZÁČĎĚÉÍŇÓŘŠŤÚŮÝŽ][a-záčďěéíňóřšťúůýž]+\s+[A-ZÁČĎĚÉÍŇÓŘŠŤÚŮÝŽ][a-záčďěéíňóřšťúůýž]+)/i
        ];
        
        const allPatterns = [...companyPatterns, ...personPatterns];
        
        for (const pattern of allPatterns) {
            const match = query.match(pattern);
            if (match && match[1]) {
                const entityName = match[1].trim();
                
                // Vyloučit obecné fráze
                const genericPhrases = [
                    'to konkrétně jsou', 'to jsou', 'které jsou', 'jaké jsou', 'co jsou',
                    'všechny', 'všech', 'máme', 'existují', 'konkrétně jsou'
                ];
                
                if (genericPhrases.some(phrase => entityName.toLowerCase().includes(phrase))) {
                    continue; // Přeskočit tento match
                }
                
                return entityName;
            }
        }
        
        return null;
    }
    
    // === HANDLERY PRO RŮZNÉ TYPY DOTAZŮ ===
    
    handleCountQuery(analysis) {
        const entity = analysis.entity;
        const stats = this.getEntityStats();
        
        let count = 0;
        let entityLabel = 'záznamů';
        
        // Rozpoznat typ z původního dotazu pro správné skloňování
        const originalLower = analysis.originalQuery.toLowerCase();
        
        switch (entity) {
            case 'company':
                count = stats.companies;
                if (originalLower.includes('společnost')) {
                    entityLabel = 'společností';
                } else {
                    entityLabel = 'firem';
                }
                break;
            case 'contact':
                count = stats.contacts;
                entityLabel = 'kontaktů';
                break;
            case 'activity':
                count = stats.activities;
                entityLabel = 'aktivit';
                break;
            case 'deal':
                count = stats.deals;
                entityLabel = 'obchodních případů';
                break;
            default:
                count = stats.total;
                entityLabel = 'záznamů celkem';
        }
        
        return {
            type: 'count',
            entity: entity,
            count: count,
            response: `V databázi je celkem ${count} ${entityLabel}.`,
            useAI: false
        };
    }
    
    handleListAllQuery(analysis) {
        const entity = analysis.entity;
        const records = this.searchEngine.getAllRecords(entity);
        
        return {
            type: 'list_all',
            entity: entity,
            records: records,
            response: this.formatRecordsList(records, entity),
            useAI: false
        };
    }
    
    handleSpecificSearchQuery(analysis) {
        const records = this.searchEngine.findByName(analysis.entityName, analysis.entity);
        
        if (records.length === 0) {
            return {
                type: 'search_specific',
                found: false,
                response: `Nenašel jsem "${analysis.entityName}" v databázi.`,
                useAI: false
            };
        }
        
        // Pokud našel přesně jednu, vrátit detaily
        if (records.length === 1) {
            return {
                type: 'search_specific',
                found: true,
                records: records,
                response: this.formatSingleRecord(records[0]),
                useAI: true // Použít AI pro pěkné formátování
            };
        }
        
        // Více výsledků
        return {
            type: 'search_specific',
            found: true,
            records: records,
            response: this.formatRecordsList(records, analysis.entity, `Našel jsem ${records.length} záznamů:`),
            useAI: false
        };
    }
    
    handleDetailsQuery(analysis) {
        const records = this.searchEngine.findByName(analysis.entityName, analysis.entity);
        
        if (records.length === 0) {
            return {
                type: 'get_details',
                found: false,
                response: `Nenašel jsem "${analysis.entityName}" v databázi.`,
                useAI: false
            };
        }
        
        const record = records[0]; // Vzít první záznam
        
        return {
            type: 'get_details',
            found: true,
            record: record,
            response: this.formatDetailedRecord(record),
            useAI: true // AI udělá pěkné formátování
        };
    }
    
    handleRelatedQuery(analysis) {
        const mainRecord = this.searchEngine.findByName(analysis.entityName, analysis.entity)[0];
        
        if (!mainRecord) {
            return {
                type: 'find_related',
                found: false,
                response: `Nenašel jsem "${analysis.entityName}" v databázi.`,
                useAI: false
            };
        }
        
        const relatedData = this.searchEngine.findRelatedRecords(mainRecord, analysis.entity);
        
        return {
            type: 'find_related',
            found: true,
            mainRecord: mainRecord,
            relatedData: relatedData,
            response: this.formatRelatedData(mainRecord, relatedData),
            useAI: true // AI spojí data do pěkného textu
        };
    }
    
    handleSystemQuery(analysis) {
        const responses = {
            'verz': 'Používám GPT-3.5-turbo od OpenAI pro komunikaci a lokální vyhledávací engine pro práci s daty.',
            'gpt': 'Pro formulaci odpovědí používám GPT-3.5-turbo, ale všechna data zpracovávám lokálně.',
            'model': 'Kombinuji lokální zpracování dat s GPT-3.5-turbo modelem pro lidskou komunikaci.',
            'kdo': 'Jsem AI asistent pro Tabidoo CRM s hybridním přístupem - lokální zpracování + AI komunikace.',
            'umíš': 'Umím:\n• Rychle vyhledávat v datech\n• Počítat záznamy\n• Najít související informace\n• Odpovídat přirozeně'
        };
        
        const lowerQuery = analysis.originalQuery.toLowerCase();
        for (const [key, response] of Object.entries(responses)) {
            if (lowerQuery.includes(key)) {
                return {
                    type: 'system',
                    response: response,
                    useAI: false
                };
            }
        }
        
        return {
            type: 'system',
            response: 'Jsem hybridní AI asistent pro Tabidoo - rychlé lokální vyhledávání + přirozená komunikace.',
            useAI: false
        };
    }
    
    handleGeneralQuery(analysis) {
        // Pro obecné dotazy zkusit textové vyhledávání
        const searchResults = this.searchEngine.textSearch(analysis.originalQuery);
        
        if (searchResults.length > 0) {
            return {
                type: 'general',
                searchResults: searchResults,
                response: this.formatSearchResults(searchResults),
                useAI: true // AI sestaví odpověď z výsledků
            };
        }
        
        return {
            type: 'general',
            response: 'Nerozuměl jsem dotazu. Zkuste se zeptat konkrétněji nebo použít příkazy jako "kolik firem", "vypiš kontakty".',
            useAI: false
        };
    }
    
    // === POMOCNÉ FUNKCE ===
    
    getEntityStats() {
        const stats = { companies: 0, contacts: 0, activities: 0, deals: 0, total: 0 };
        
        if (this.tablesData['Customers']) {
            stats.companies = this.getRecordCount(this.tablesData['Customers']);
        }
        if (this.tablesData['Contacts']) {
            stats.contacts = this.getRecordCount(this.tablesData['Contacts']);
        }
        if (this.tablesData['Activities']) {
            stats.activities = this.getRecordCount(this.tablesData['Activities']);
        }
        if (this.tablesData['Deals']) {
            stats.deals = this.getRecordCount(this.tablesData['Deals']);
        }
        
        stats.total = stats.companies + stats.contacts + stats.activities + stats.deals;
        return stats;
    }
    
    getRecordCount(table) {
        const data = this.getActualTableData(table);
        return data.length;
    }
    
    getActualTableData(table) {
        if (Array.isArray(table.data)) {
            return table.data;
        } else if (table.data?.items) {
            return table.data.items;
        } else if (table.data?.data) {
            return table.data.data;
        } else if (table.data?.records) {
            return table.data.records;
        }
        return [];
    }
    
    // Formátování výsledků
    formatRecordsList(records, entityType, prefix = '') {
        if (!records || records.length === 0) {
            return 'Žádné záznamy nenalezeny.';
        }
        
        let output = prefix ? prefix + '\n\n' : '';
        
        records.slice(0, 20).forEach((record, index) => {
            const name = this.extractRecordName(record);
            output += `${index + 1}. ${name}\n`;
        });
        
        if (records.length > 20) {
            output += `\n... a dalších ${records.length - 20} záznamů.`;
        }
        
        return output;
    }
    
    formatSingleRecord(record) {
        const data = record.fields || record;
        const name = this.extractRecordName(record);
        
        let output = `**${name}**\n\n`;
        
        // Základní informace
        const basicFields = ['email', 'telefon', 'city', 'street', 'owner', 'status'];
        for (const field of basicFields) {
            if (data[field]) {
                const value = this.getDisplayValue(data[field]);
                if (value) {
                    output += `• ${field}: ${value}\n`;
                }
            }
        }
        
        return output;
    }
    
    formatDetailedRecord(record) {
        // Vrátit všechna dostupná data pro AI formátování
        return JSON.stringify(record.fields || record, null, 2);
    }
    
    formatRelatedData(mainRecord, relatedData) {
        // Vrátit strukturovaná data pro AI
        return {
            main: mainRecord.fields || mainRecord,
            related: relatedData
        };
    }
    
    formatSearchResults(results) {
        return results.slice(0, 10).map(r => r.record).join('\n---\n');
    }
    
    extractRecordName(record) {
        const data = record.fields || record;
        
        // Pokusy o extrakci názvu
        if (data.name) return this.getDisplayValue(data.name);
        if (data.nazev) return this.getDisplayValue(data.nazev);
        if (data.company) return this.getDisplayValue(data.company);
        if (data.title) return this.getDisplayValue(data.title);
        if (data.jmeno && data.prijmeni) {
            return `${this.getDisplayValue(data.jmeno)} ${this.getDisplayValue(data.prijmeni)}`;
        }
        if (data.jmeno) return this.getDisplayValue(data.jmeno);
        
        return 'Nepojmenovaný záznam';
    }
    
    getDisplayValue(value) {
        if (!value) return '';
        if (typeof value === 'object' && value.fields) {
            return this.extractRecordName(value);
        }
        return String(value);
    }
    
    // Formátování s AI
    async formatWithAI(originalQuery, result) {
        try {
            let context = `Uživatel se zeptal: "${originalQuery}"\n\n`;
            
            if (result.type === 'get_details') {
                context += `Našel jsem tyto údaje:\n${result.response}`;
            } else if (result.type === 'find_related') {
                context += `Hlavní záznam: ${JSON.stringify(result.mainRecord, null, 2)}\n`;
                context += `Související data: ${JSON.stringify(result.relatedData, null, 2)}`;
            } else if (result.searchResults) {
                context += `Relevantní záznamy:\n${result.response}`;
            }
            
            const response = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${APP_CONFIG.OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: "gpt-3.5-turbo",
                    messages: [
                        {
                            role: "system",
                            content: "Jsi asistent pro Tabidoo CRM. Zformuluj odpověď na základě poskytnutých dat. Buď přesný a strukturovaný. Odpovídej česky."
                        },
                        {
                            role: "user",
                            content: context
                        }
                    ],
                    temperature: 0.3,
                    max_tokens: 1000
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                return data.choices[0].message.content;
            }
        } catch (error) {
            console.error('AI formatting error:', error);
        }
        
        // Fallback na původní odpověď
        return result.response;
    }
}
