// Hlavní aplikační logika - My Connect AI - FINÁLNÍ OPRAVENÁ VERZE

// Globální proměnné
let APP_CONFIG = {};
let tablesData = {};
let messages = [];
let queryProcessor = null;

// Načtení konfigurace
function loadConfig() {
    // Základní nastavení
    APP_CONFIG.OPENAI_API_KEY = security.loadSecure('openai_key') || '';
    APP_CONFIG.GEMINI_API_KEY = security.loadSecure('gemini_key') || '';
    APP_CONFIG.CLAUDE_API_KEY = security.loadSecure('claude_key') || '';
    APP_CONFIG.TABIDOO_API_TOKEN = security.loadSecure('tabidoo_token') || '';
    APP_CONFIG.TABIDOO_APP_ID = security.loadSecure('tabidoo_app_id') || '';
    APP_CONFIG.SELECTED_AI_MODEL = localStorage.getItem('selected_ai_model') || 'openai';
    
    console.log('Config loaded:', {
        hasOpenAI: !!APP_CONFIG.OPENAI_API_KEY,
        hasGemini: !!APP_CONFIG.GEMINI_API_KEY,
        hasClaude: !!APP_CONFIG.CLAUDE_API_KEY,
        hasTabidoo: !!APP_CONFIG.TABIDOO_API_TOKEN,
        hasAppId: !!APP_CONFIG.TABIDOO_APP_ID,
        selectedAI: APP_CONFIG.SELECTED_AI_MODEL
    });
}

// Odeslání zprávy s hybridním přístupem
async function sendMessage() {
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-button');
    const messageText = chatInput.value.trim();
    
    if (!messageText) return;
    
    // Kontrola připojení k aplikacím
    if (!APP_CONFIG.TABIDOO_API_TOKEN) {
        alert('Nejprve nastavte připojení k aplikaci v nastavení!');
        if (window.settingsManager) {
            window.settingsManager.toggle();
        }
        return;
    }
    
    // Přidat uživatelovu zprávu
    if (window.uiManager) {
        window.uiManager.addMessage('user', messageText);
    }
    chatInput.value = '';
    chatInput.style.height = 'auto';
    
    // Nastavit loading stav
    chatInput.disabled = true;
    sendButton.disabled = true;
    sendButton.textContent = 'Zpracovávám...';
    
    try {
        // Použít query processor
        const result = await queryProcessor.processQuery(messageText);
        
        // Pokud má použít AI, použít aktuálně vybraný model
        if (result.useAI && hasAnyAIModel()) {
            const aiResponse = await formatWithSelectedAI(messageText, result);
            if (window.uiManager) {
                window.uiManager.addMessage('assistant', aiResponse);
            }
        } else {
            // Zobrazit lokální odpověď
            if (window.uiManager) {
                window.uiManager.addMessage('assistant', result.response);
            }
        }
        
    } catch (error) {
        console.error('❌ Error processing query:', error);
        if (window.uiManager) {
            window.uiManager.addMessage('error', 'Omlouvám se, nastala chyba při zpracování dotazu. Zkuste to prosím znovu.');
        }
    } finally {
        // Obnovit UI
        chatInput.disabled = false;
        sendButton.disabled = false;
        sendButton.textContent = 'Odeslat';
        chatInput.focus();
    }
}

// Kontrola dostupnosti AI modelu
function hasAnyAIModel() {
    return APP_CONFIG.OPENAI_API_KEY || APP_CONFIG.GEMINI_API_KEY || APP_CONFIG.CLAUDE_API_KEY;
}

// Formátování s vybraným AI modelem
async function formatWithSelectedAI(userQuery, localResult) {
    try {
        if (window.aiModelsManager) {
            return await window.aiModelsManager.formatMessage(userQuery, localResult);
        }
        
        // Fallback na původní OpenAI implementaci
        return await formatWithOpenAI(userQuery, localResult);
    } catch (error) {
        console.error('AI formatting error:', error);
        return localResult.response; // Fallback na lokální odpověď
    }
}

// Fallback OpenAI implementace - ZACHOVÁNA PŮVODNÍ FUNKCIONALITA
async function formatWithOpenAI(userQuery, localResult) {
    if (!APP_CONFIG.OPENAI_API_KEY) {
        throw new Error('Není nastaven API klíč pro AI model');
    }
    
    let context = `Uživatel se zeptal: "${userQuery}"\n\n`;
    
    if (localResult.type === 'get_details') {
        context += `Našel jsem tyto údaje:\n${JSON.stringify(localResult.record, null, 2)}`;
    } else if (localResult.type === 'find_related') {
        context += `Hlavní záznam: ${JSON.stringify(localResult.mainRecord, null, 2)}\n`;
        context += `Související data: ${JSON.stringify(localResult.relatedData, null, 2)}`;
    } else if (localResult.searchResults) {
        context += `Relevantní záznamy:\n${localResult.response}`;
    } else {
        context += `Lokální výsledek: ${localResult.response}`;
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
                    content: "Jsi asistent pro My Connect AI. Zformuluj odpověď na základě poskytnutých dat. Buď přesný a strukturovaný. Odpovídej česky."
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
    
    if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content;
}

// Inicializace query processoru
function initializeQueryProcessor() {
    if (!queryProcessor && Object.keys(tablesData).length > 0) {
        queryProcessor = new QueryProcessor(tablesData);
        console.log('✅ Query Processor initialized');
        return true;
    }
    return !!queryProcessor;
}

// Funkce pro získání statistik systému
function getSystemStats() {
    const stats = { companies: 0, contacts: 0, activities: 0, deals: 0, total: 0 };
    
    if (tablesData['Customers']) {
        stats.companies = getRecordCount(tablesData['Customers']);
    }
    if (tablesData['Contacts']) {
        stats.contacts = getRecordCount(tablesData['Contacts']);
    }
    if (tablesData['Activities']) {
        stats.activities = getRecordCount(tablesData['Activities']);
    }
    if (tablesData['Deals']) {
        stats.deals = getRecordCount(tablesData['Deals']);
    }
    
    stats.total = stats.companies + stats.contacts + stats.activities + stats.deals;
    return stats;
}

// Pomocná funkce pro počítání záznamů
function getRecordCount(table) {
    if (!table || !table.data) return 0;
    
    if (Array.isArray(table.data)) {
        return table.data.length;
    } else if (table.data.items && Array.isArray(table.data.items)) {
        return table.data.items.length;
    } else if (table.data.data && Array.isArray(table.data.data)) {
        return table.data.data.length;
    } else if (table.data.records && Array.isArray(table.data.records)) {
        return table.data.records.length;
    }
    
    return 0;
}

// Hlavní hybridní inicializace - OPRAVENO BEZ SYNTAKTICKÝCH CHYB
async function hybridInit() {
    console.log('🚀 Starting hybrid initialization...');
    
    // Kontrola načtení bezpečnostního manageru
    if (typeof security === 'undefined') {
        console.error('❌ Security manager not loaded!');
        setTimeout(() => hybridInit(), 100);
        return;
    }
    
    // Načíst konfiguraci
    loadConfig();
    
    const chatMessages = document.getElementById('chat-messages');
    
    // Kontrola základní konfigurace
    const hasBasicConfig = APP_CONFIG.TABIDOO_API_TOKEN && APP_CONFIG.TABIDOO_APP_ID;
    
    if (!hasBasicConfig) {
        console.log('🔧 No basic config, showing welcome screen...');
        if (window.uiManager) {
            window.uiManager.showWelcomeScreen();
        }
        return;
    }
    
    // Zobrazit loading zprávu
    if (chatMessages) {
        chatMessages.innerHTML = '<div class="message system-message">🔄 Načítám data a inicializuji hybridní systém...</div>';
    }
    
    try {
        // Načíst data
        console.log('📊 Loading application data...');
        let dataLoaded = false;
        
        // Pokus o načtení přes app connectors manager
        if (window.appConnectorsManager) {
            try {
                tablesData = await window.appConnectorsManager.loadData('tabidoo');
                dataLoaded = Object.keys(tablesData).length > 0;
                console.log('✅ Data loaded via app connectors:', Object.keys(tablesData));
            } catch (error) {
                console.warn('⚠️ App connectors failed, trying fallback:', error);
            }
        }
        
        // Fallback na původní načítání z data-loader.js
        if (!dataLoaded && typeof loadTabidooData === 'function') {
            try {
                dataLoaded = await loadTabidooData();
                console.log('✅ Data loaded via fallback method');
            } catch (error) {
                console.error('❌ Fallback data loading failed:', error);
            }
        }
        
        if (!dataLoaded) {
            throw new Error('Failed to load any data');
        }
        
        // Inicializovat query processor
        console.log('🧠 Initializing query processor...');
        const processorReady = initializeQueryProcessor();
        
        if (!processorReady) {
            throw new Error('Failed to initialize query processor');
        }
        
        // Úspěšná inicializace - zobrazit welcome screen
        console.log('✅ Hybrid system ready');
        if (window.uiManager) {
            window.uiManager.showWelcomeScreen();
        }
        
        // Aktualizovat statusy v UI
        if (window.settingsManager) {
            setTimeout(() => {
                window.settingsManager.updateAppStatuses();
            }, 100);
        }
        
    } catch (error) {
        console.error('❌ Hybrid initialization failed:', error);
        
        // Vyčistit chat messages
        if (chatMessages) {
            chatMessages.innerHTML = '';
        }
        
        // Zobrazit chybovou zprávu
        if (window.uiManager) {
            window.uiManager.addMessage('error', '❌ Chyba při inicializaci systému. Zkontrolujte nastavení API.');
        } else {
            console.error('UI Manager not available for error display');
            if (chatMessages) {
                chatMessages.innerHTML = '<div class="message error-message">❌ Chyba při inicializaci systému. Zkontrolujte nastavení API.</div>';
            }
        }
    }
}

// Spuštění aplikace
window.addEventListener('load', function() {
    console.log('🌟 Window loaded, starting HYBRID init...');
    setTimeout(hybridInit, 100);
});

// Alternativní spuštění pro případ, že window.onload již proběhl
if (document.readyState === 'complete') {
    setTimeout(hybridInit, 100);
} else if (document.readyState === 'interactive') {
    setTimeout(hybridInit, 200);
}

// Export pro testování a kompatibilitu
window.hybridSystem = {
    queryProcessor: () => queryProcessor,
    tablesData: () => tablesData,
    sendMessage: sendMessage,
    getStats: getSystemStats,
    config: () => APP_CONFIG,
    managers: {
        ai: () => window.aiModelsManager,
        apps: () => window.appConnectorsManager,
        ui: () => window.uiManager,
        settings: () => window.settingsManager
    }
};

// Zachování kompatibility s existujícím kódem
window.APP_CONFIG = APP_CONFIG;
window.loadConfig = loadConfig;
window.hybridInit = hybridInit;
window.sendMessage = sendMessage;
window.getSystemStats = getSystemStats;

// Debugging a monitoring
window.debugInfo = function() {
    return {
        config: APP_CONFIG,
        tablesData: Object.keys(tablesData),
        queryProcessor: !!queryProcessor,
        managers: {
            ai: !!window.aiModelsManager,
            apps: !!window.appConnectorsManager,
            ui: !!window.uiManager,
            settings: !!window.settingsManager
        },
        modules: {
            security: typeof security !== 'undefined',
            CONFIG: typeof CONFIG !== 'undefined'
        }
    };
};

console.log('📦 Main.js loaded successfully - all functionality preserved');
