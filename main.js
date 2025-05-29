// Hlavní aplikační logika - My Connect AI - OPRAVENÁ VERZE

// Globální proměnné
let APP_CONFIG = {};
let tablesData = {};
let messages = [];
let queryProcessor = null;

// Načtení konfigurace - ROZŠÍŘENÁ VERZE
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

// Odeslání zprávy s hybridním přístupem - AKTUALIZOVÁNO PRO NOVÉ AI MODELY
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
    
    // Auto-resize textarea zpět na minimum
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

// Fallback OpenAI implementace
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
    return false;
}

// Hlavní hybridní inicializace - AKTUALIZOVÁNO
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
    
    // Pokud nemáme API klíče - zobrazit welcome screen
    if (!APP_CONFIG.TABIDOO_API_TOKEN || !APP_CONFIG.TABIDOO_APP_ID) {
        console.log('🔧 No API keys, showing welcome screen...');
        if (window.uiManager) {
            window.uiManager.showWelcomeScreen();
        }
        return;
    }
    
    // Zobrazit loading zprávu
    if (chatMessages) {
        chatMessages.innerHTML = `<div class="message system-message">🔄 Načítám data a inicializuji hybridní systém...</div>`;
    }
    
    try {
        // Načíst data pomocí app connectors manageru
        console.log('📊 Loading data via app connectors...');
        if (window.appConnectorsManager) {
            tablesData = await window.appConnectorsManager.loadData('tabidoo');
        } else if (typeof loadTabidooData === 'function') {
            // Fallback na původní načítání
            const dataLoaded = await loadTabidooData();
            if (!dataLoaded) {
                throw new Error('Failed to load data');
            }
        } else {
            throw new Error('No data loading method available');
        }
        
        // Kontrola načtených dat
        if (!tablesData || Object.keys(tablesData).length === 0) {
            throw new Error('No data loaded');
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
        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages) {
            chatMessages.innerHTML = '';
        }
        
        // Zobrazit chybovou zprávu
        if (window.uiManager) {
            window.uiManager.addMessage('error', '❌ Chyba při inicializaci systému. Zkontrolujte nastavení API.');
        } else {
            // Fallback pokud UI Manager není dostupný
            console.error('UI Manager not available for error display');
            if (chatMessages) {
                chatMessages.innerHTML = '<div class="message error-message">❌ Chyba při inicializaci systému. Zkontrolujte nastavení API.</div>';
            }
        }
    }
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

// Export pro testování a kompatibilitu - ROZŠÍŘENO
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

console.log('📦 Main.js loaded successfully');
