// Konfigurace aplikace
const CONFIG = {
    // API klíče - NEUKLÁDAT SKUTEČNÉ KLÍČE!
    DEFAULT_API_KEYS: {
        OPENAI_API_KEY: "",
        TABIDOO_APP_ID: "",
        TABIDOO_API_TOKEN: ""
    },
    
    // Seznam tabulek
    TABLES: [
        { id: "Activities", name: "Aktivity" },
        { id: "Contacts", name: "Kontakty" },
        { id: "Deals", name: "Obchodní případy" },
        { id: "Customers", name: "Firma" }
    ],
    
// Hlavní procesor dotazů - "mozek" systému

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
        analysis.entityName = this.extractEntityName(query);
        
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
        
        // Výpis všech záznamů
        if (this.isListAllQuery(lowerQuery)) {
            analysis.type = 'list_all';
            return analysis;
        }
        
        // Hledání konkrétní entity
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
    
    // Detekce dotazů na výpis všech záznamů
    isListAllQuery(query) {
        const listKeywords = ['vypiš', 'seznam', 'všechny', 'všech', 'jaké', 'které', 'zobraz', 'jména', 'názvy', 'ukáž'];
        const hasListKeyword = listKeywords.some(keyword => query.includes(keyword));
        
        // Musí obsahovat list keyword a NESMÍ obsahovat konkrétní název entity
        const hasSpecificName = this.extractEntityName(query);
        
        return hasListKeyword && !hasSpecificName;
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
    
    // Extrakce typu entity (firma, kontakt, atd.) - FINÁLNÍ VERZE
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
    
    // Extrakce názvu konkrétní entity
    extractEntityName(query) {
        // Vzory pro názvy firem - rozšířené
        const companyPatterns = [
            /(?:firm[aeyu]?\s+)([A-ZÁČĎĚÉÍŇÓŘŠŤÚŮÝŽ][a-záčďěéíňóřšťúůýž\s&.,-]+(?:\s+[a-z]+\.?)*)/i,
            /(?:firem\s+)([A-ZÁČĎĚÉÍŇÓŘŠŤÚŮÝŽ][a-záčďěéíňóřšťúůýž\s&.,-]+)/i,
            /(?:firmy\s+)([A-ZÁČĎĚÉÍŇÓŘŠŤÚŮÝŽ][a-záčďěéíňóřšťúůýž\s&.,-]+)/i,
            /(?:o\s+firm[aeyu]?\s+)([A-ZÁČĎĚÉÍŇÓŘŠŤÚŮÝŽ][a-záčďěéíňóřšťúůýž\s&.,-]+)/i,
            /(?:společnost[i]?\s+)([A-ZÁČĎĚÉÍŇÓŘŠŤÚŮÝŽ][a-záčďěéíňóřšťúůýž\s&.,-]+)/i
        ];
        
        // Vzory pro jména osob
        const personPatterns = [
            /(?:kontakt[uae]?\s+)([A-ZÁČĎĚÉÍŇÓŘŠŤÚŮÝŽ][a-záčďěéíňóřšťúůýž\s]+)/i,
            /(?:kontaktů\s+)([A-ZÁČĎĚÉÍŇÓŘŠŤÚŮÝŽ][a-záčďěéíňóřšťúůýž\s]+)/i,
            /(?:kontakty\s+)([A-ZÁČĎĚÉÍŇÓŘŠŤÚŮÝŽ][a-záčďěéíňóřšťúůýž\s]+)/i,
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
    
    // Nastavení API
    API: {
        OPENAI: {
            MODEL: "gpt-3.5-turbo",
            TEMPERATURE: 0.7,
            MAX_TOKENS: 1500,
            EMBEDDINGS_MODEL: "text-embedding-ada-002"
        },
        TABIDOO: {
            BASE_URL: "https://app.tabidoo.cloud/api/v2",
            RECORDS_LIMIT: 100
        }
    },
    
    // Nastavení zobrazení
    DISPLAY: {
        MAX_RECORDS_TO_SHOW: 20,
        MAX_SEARCH_RESULTS: 10,
        PREVIEW_FIELDS_COUNT: 5,
        MAX_FIELD_LENGTH: 50
    },
    
    // Prompty pro GPT
    PROMPTS: {
        SYSTEM: {
            DEFAULT: "Jsi asistent pro Tabidoo CRM. Máš přístup ke kompletním datům z databáze. Odpovídej na dotazy přesně podle poskytnutých dat. Když se tě někdo zeptá na seznam nebo konkrétní data, vypiš je. V systému jsou firmy a jiné události uložené pod ID, s těmy samosřejmě pracuj, ale uživatelům odpovídej v konkrétních názvech firem a pod. Odpovídej česky.",
            WITH_DATA: "Jsi asistent pro Tabidoo CRM. Odpovídej na základě poskytnutých dat. Odpovídej stručně a věcně česky.",
            ANALYTICS: "Jsi asistent pro Tabidoo CRM. Odpovídej na základě poskytnutých statistik. Odpovídej stručně česky.",
            MINIMAL: "Jsi asistent pro Tabidoo CRM. Odpovídej stručně česky."
        }
    },
    
    // Zprávy pro uživatele
    MESSAGES: {
        WELCOME: "⚙️ Vítejte! Pro začátek nastavte API klíče v nastavení (ikona ⚙️ vpravo nahoře).",
        LOADING_DATA: "Načítám data a inicializuji hybridní systém...",
        CREATING_INDEX: "Vytvářím vyhledávací index pro rychlé vyhledávání...",
        SYSTEM_READY: "✓ Hybridní systém je připraven k inteligentnímu vyhledávání.",
        SYSTEM_READY_BASIC: "✓ Systém je připraven.",
        INDEX_CREATED: "✓ Vyhledávací index vytvořen! Systém je připraven.",
        INDEX_FAILED: "⚠️ Používám základní vyhledávání.",
        DATA_LOAD_ERROR: "Nepodařilo se načíst data z Tabidoo. Zkontrolujte nastavení API.",
        API_KEY_ERROR: "Nejprve nastavte API klíče v nastavení!",
        HELP_TEXT: 'Můžete se ptát na cokoliv z vašich dat. Například:\n• "Vypiš všechny firmy"\n• "Jaké kontakty máme v systému?"\n• "Kolik máme aktivních obchodních případů?"\n• "Najdi firmu ABC"',
        NO_RESULTS: 'Nenašel jsem žádné záznamy odpovídající "{query}".\n\nTip: Zkuste zadat konkrétní jméno, email nebo název firmy.',
        ERROR_PREFIX: "Omlouvám se, nastala chyba při zpracování dotazu.\n\nZkuste se zeptat jinak nebo použijte konkrétní příkazy jako:\n",
        ERROR_EXAMPLES: '• "vypiš všechny firmy"\n• "najdi kontakt Jana"\n• "kolik máme aktivit"'
    },
    
    // Diagnostické zprávy
    DIAGNOSTICS: {
        TITLE: "🔧 Spouštím diagnostiku systému...",
        TESTING_OPENAI: "Testuji OpenAI API klíč...",
        TESTING_TABIDOO: "Testuji Tabidoo API token...",
        TESTING_TABLES: "Testuji přístup k tabulkám...",
        LOADING_TABLE: "Načítám tabulku {tableName}...",
        OPENAI_SUCCESS: "OpenAI API klíč je platný",
        TABIDOO_SUCCESS: "Tabidoo API funguje - aplikace: {appName}",
        TABLE_SUCCESS: "Tabulka {tableName}: {count} záznamů",
        TABLE_WARNING: "Tabulka {tableName}: 0 záznamů",
        TABLE_ERROR: "Tabulka {tableName}: Nepodařilo se načíst",
        API_ERROR: "Některé API klíče nejsou správně nastaveny. Zkontrolujte nastavení.",
        NO_DATA_WARNING: "Žádná tabulka neobsahuje data",
        COMPLETED: "Diagnostika dokončena!",
        CLOSE_BUTTON: "Zavřít diagnostiku a pokračovat"
    },
    
    // Mapování polí
    FIELD_MAPPINGS: {
        IMPORTANT_FIELDS: ['name', 'nazev', 'Name', 'jmeno', 'prijmeni', 'email', 'telefon', 'firma', 'company', 'owner', 'status', 'type', 'category', 'title', 'clients', 'activities', 'city', 'street', 'ZIP'],
        HIDDEN_FIELDS: ['_id', '_created', '_modified', '_creator'],
        FIELD_LABELS: {
            'name': 'Jméno',
            'nazev': 'Název',
            'jmeno': 'Jméno',
            'prijmeni': 'Příjmení',
            'email': 'E-mail',
            'telefon': 'Telefon',
            'firma': 'Firma',
            'company': 'Společnost',
            'owner': 'Vlastník',
            'status': 'Stav',
            'type': 'Typ',
            'category': 'Kategorie',
            'title': 'Název',
            'clients': 'Klienti',
            'activities': 'Aktivity',
            'city': 'Město',
            'street': 'Ulice',
            'ZIP': 'PSČ'
        }
    },
    
    // Nastavení vyhledávání
    SEARCH: {
        MIN_TERM_LENGTH: 2,
        FIELD_WEIGHTS: {
            DEFAULT: 1,
            IMPORTANT: 2
        },
        EMBEDDINGS: {
            BATCH_SIZE: 10,
            MAX_TEXT_LENGTH: 1000
        }
    },
    
    // Cache nastavení
    CACHE: {
        DATA_KEY: 'tabidoo_data',
        DATA_TIMESTAMP_KEY: 'tabidoo_data_timestamp',
        EMBEDDINGS_KEY: 'tabidoo_embeddings',
        EMBEDDINGS_TIMESTAMP_KEY: 'tabidoo_embeddings_timestamp',
        DIAGNOSTICS_KEY: 'diagnostics_completed'
    },
    
    // Validace
    VALIDATION: {
        API_KEY_PATTERNS: {
            OPENAI: /^sk-[a-zA-Z0-9]{48,}$/,
            TABIDOO: /^eyJ[a-zA-Z0-9\._-]+$/
        }
    }
};

// Export CONFIG pro použití v jiných souborech
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
} else if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
        // Hlavní procesor dotazů - "mozek" systému

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
        analysis.entityName = this.extractEntityName(query);
        
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
        
        // Výpis všech záznamů
        if (this.isListAllQuery(lowerQuery)) {
            analysis.type = 'list_all';
            return analysis;
        }
        
        // Hledání konkrétní entity
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
    
    // Detekce dotazů na výpis všech záznamů
    isListAllQuery(query) {
        const listKeywords = ['vypiš', 'seznam', 'všechny', 'všech', 'jaké', 'které', 'zobraz', 'jména', 'názvy', 'ukáž'];
        const hasListKeyword = listKeywords.some(keyword => query.includes(keyword));
        
        // Musí obsahovat list keyword a NESMÍ obsahovat konkrétní název entity
        const hasSpecificName = this.extractEntityName(query);
        
        return hasListKeyword && !hasSpecificName;
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
    
    // Extrakce typu entity (firma, kontakt, atd.) - FINÁLNÍ VERZE
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
    
    // Extrakce názvu konkrétní entity
    extractEntityName(query) {
        // Vzory pro názvy firem - rozšířené
        const companyPatterns = [
            /(?:firm[aeyu]?\s+)([A-ZÁČĎĚÉÍŇÓŘŠŤÚŮÝŽ][a-záčďěéíňóřšťúůýž\s&.,-]+(?:\s+[a-z]+\.?)*)/i,
            /(?:firem\s+)([A-ZÁČĎĚÉÍŇÓŘŠŤÚŮÝŽ][a-záčďěéíňóřšťúůýž\s&.,-]+)/i,
            /(?:firmy\s+)([A-ZÁČĎĚÉÍŇÓŘŠŤÚŮÝŽ][a-záčďěéíňóřšťúůýž\s&.,-]+)/i,
            /(?:o\s+firm[aeyu]?\s+)([A-ZÁČĎĚÉÍŇÓŘŠŤÚŮÝŽ][a-záčďěéíňóřšťúůýž\s&.,-]+)/i,
            /(?:společnost[i]?\s+)([A-ZÁČĎĚÉÍŇÓŘŠŤÚŮÝŽ][a-záčďěéíňóřšťúůýž\s&.,-]+)/i
        ];
        
        // Vzory pro jména osob
        const personPatterns = [
            /(?:kontakt[uae]?\s+)([A-ZÁČĎĚÉÍŇÓŘŠŤÚŮÝŽ][a-záčďěéíňóřšťúůýž\s]+)/i,
            /(?:kontaktů\s+)([A-ZÁČĎĚÉÍŇÓŘŠŤÚŮÝŽ][a-záčďěéíňóřšťúůýž\s]+)/i,
            /(?:kontakty\s+)([A-ZÁČĎĚÉÍŇÓŘŠŤÚŮÝŽ][a-záčďěéíňóřšťúůýž\s]+)/i,
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
