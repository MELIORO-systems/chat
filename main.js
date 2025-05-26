// Hlavní aplikační logika - NOVÁ HYBRIDNÍ VERZE

// Globální proměnné
let APP_CONFIG = {};
let tablesData = {};
let messages = [];
let embeddingsReady = false;
let queryProcessor = null; // Náš nový procesor dotazů

// BLOKOVÁNÍ STARÉHO SYSTÉMU
window.HYBRID_SYSTEM_ENABLED = true;

// Načtení konfigurace
function loadConfig() {
    APP_CONFIG.OPENAI_API_KEY = security.loadSecure('openai_key') || '';
    APP_CONFIG.TABIDOO_API_TOKEN = security.loadSecure('tabidoo_token') || '';
    APP_CONFIG.TABIDOO_APP_ID = security.loadSecure('tabidoo_app_id') || '';
    
    console.log('Config loaded:', {
        hasOpenAI: !!APP_CONFIG.OPENAI_API_KEY,
        hasTabidoo: !!APP_CONFIG.TABIDOO_API_TOKEN,
        hasAppId: !!APP_CONFIG.TABIDOO_APP_ID
    });
}

// Validace API klíčů
function validateApiKeys(openaiKey, tabidooToken) {
    const errors = [];
    
    if (!openaiKey) {
        errors.push('OpenAI API klíč je povinný');
    } else if (!CONFIG.VALIDATION.API_KEY_PATTERNS.OPENAI.test(openaiKey)) {
        errors.push('OpenAI API klíč má neplatný formát');
    }
    
    if (!tabidooToken) {
        errors.push('Tabidoo API token je povinný');
    } else if (!CONFIG.VALIDATION.API_KEY_PATTERNS.TABIDOO.test(tabidooToken)) {
        errors.push('Tabidoo token má neplatný formát');
    }
    
    return errors;
}

// Uložení nastavení
function saveSettings() {
    const openaiKey = document.getElementById('openai-key').value.trim();
    const tabidooToken = document.getElementById('tabidoo-token').value.trim();
    const tabidooAppId = document.getElementById('tabidoo-app-id').value.trim();
    
    console.log('Saving settings...');
    
    if (openaiKey) {
        security.saveSecure('openai_key', openaiKey);
        APP_CONFIG.OPENAI_API_KEY = openaiKey;
    }
    
    if (tabidooToken) {
        security.saveSecure('tabidoo_token', tabidooToken);
        APP_CONFIG.TABIDOO_API_TOKEN = tabidooToken;
    }
    
    if (tabidooAppId) {
        security.saveSecure('tabidoo_app_id', tabidooAppId);
        APP_CONFIG.TABIDOO_APP_ID = tabidooAppId;
    }
    
    alert('Nastavení bezpečně uloženo!');
    toggleSettings();
    
    if (Object.keys(tablesData).length === 0 && APP_CONFIG.OPENAI_API_KEY && APP_CONFIG.TABIDOO_API_TOKEN && APP_CONFIG.TABIDOO_APP_ID) {
        location.reload();
    }
}

// Zobrazení/skrytí nastavení
function toggleSettings() {
    const panel = document.getElementById('settings-panel');
    const isHidden = panel.style.display === 'none';
    panel.style.display = isHidden ? 'block' : 'none';
    
    if (isHidden) {
        const openaiField = document.getElementById('openai-key');
        const tabidooField = document.getElementById('tabidoo-token');
        const appIdField = document.getElementById('tabidoo-app-id');
        
        openaiField.value = '';
        tabidooField.value = '';
        appIdField.value = APP_CONFIG.TABIDOO_APP_ID || '';
        
        openaiField.placeholder = APP_CONFIG.OPENAI_API_KEY ? 'API klíč je nastaven (pro změnu zadejte nový)' : 'Zadejte OpenAI API klíč';
        tabidooField.placeholder = APP_CONFIG.TABIDOO_API_TOKEN ? 'Token je nastaven (pro změnu zadejte nový)' : 'Zadejte Tabidoo API token';
    }
}

// Export konfigurace
function exportConfig() {
    const config = {
        openai: security.loadSecure('openai_key'),
        tabidoo: security.loadSecure('tabidoo_token'),
        appId: security.loadSecure('tabidoo_app_id'),
        timestamp: new Date().toISOString()
    };
    
    const exportKey = prompt('Zadejte heslo pro export (zapamatujte si ho):');
    if (!exportKey) return;
    
    const encrypted = security.encrypt(JSON.stringify(config), exportKey);
    
    const blob = new Blob([encrypted], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tabidoo-config-${Date.now()}.enc`;
    a.click();
    URL.revokeObjectURL(url);
}

// Import konfigurace
function importConfig() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.enc';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const encrypted = await file.text();
        const exportKey = prompt('Zadejte heslo pro import:');
        if (!exportKey) return;
        
        try {
            const decrypted = security.decrypt(encrypted, exportKey);
            const config = JSON.parse(decrypted);
            
            security.saveSecure('openai_key', config.openai);
            security.saveSecure('tabidoo_token', config.tabidoo);
            security.saveSecure('tabidoo_app_id', config.appId);
            
            alert('Konfigurace úspěšně importována!');
            location.reload();
        } catch (error) {
            alert('Chyba při importu: Nesprávné heslo nebo poškozený soubor');
        }
    };
    
    input.click();
}

// NOVÁ FUNKCE - Odeslání zprávy s hybridním přístupem
async function sendMessage() {
    console.log('🚀 Send message clicked - HYBRID VERSION');
    
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-button');
    const messageText = chatInput.value.trim();
    
    if (!messageText) {
        return;
    }
    
    if (!APP_CONFIG.TABIDOO_API_TOKEN) {
        alert('Nejprve nastavte Tabidoo API token!');
        toggleSettings();
        return;
    }
    
    // Přidat uživatelovu zprávu
    addMessage('user', messageText);
    chatInput.value = '';
    
    // Nastavit loading stav
    chatInput.disabled = true;
    sendButton.disabled = true;
    sendButton.textContent = 'Zpracovávám...';
    
    try {
        // NOVÁ LOGIKA - Použít query processor
        const result = await queryProcessor.processQuery(messageText);
        console.log('📤 Query result:', result);
        
        // Zobrazit odpověď
        addMessage('assistant', result.response);
        
        // Debug info do konzole
        console.log('🔍 Query type:', result.type);
        if (result.count !== undefined) {
            console.log('📊 Count:', result.count);
        }
        if (result.records) {
            console.log('📋 Records found:', result.records.length);
        }
        
    } catch (error) {
        console.error('❌ Error processing query:', error);
        
        // Fallback na starý způsob
        try {
            console.log('🔄 Trying fallback...');
            const fallbackResponse = await smartCallOpenAI(messageText);
            addMessage('assistant', fallbackResponse);
        } catch (fallbackError) {
            console.error('❌ Fallback also failed:', fallbackError);
            addMessage('error', 'Omlouvám se, nastala chyba při zpracování dotazu. Zkuste to prosím znovu.');
        }
    } finally {
        // Obnovit UI
        chatInput.disabled = false;
        sendButton.disabled = false;
        sendButton.textContent = 'Odeslat';
        chatInput.focus();
    }
}

// NOVÁ FUNKCE - Inicializace query processoru
function initializeQueryProcessor() {
    console.log('🧠 Initializing Query Processor...');
    
    if (!queryProcessor && Object.keys(tablesData).length > 0) {
        queryProcessor = new QueryProcessor(tablesData);
        console.log('✅ Query Processor initialized');
        
        // Zobrazit debug info
        const stats = queryProcessor.getEntityStats();
        console.log('📊 Data statistics:', stats);
        
        return true;
    }
    
    return false;
}

// ZABLOKOVAT STARÝ WINDOW.ONLOAD
// Spuštění aplikace - POUZE HYBRIDNÍ VERZE
window.onload = function() {
    if (!window.HYBRID_SYSTEM_ENABLED) {
        console.log('🚫 Hybrid system disabled, skipping...');
        return;
    }
    
    console.log('🌟 Window loaded, starting HYBRID init...');
    setTimeout(hybridInit, 100);
};

// HLAVNÍ HYBRIDNÍ INICIALIZACE
async function hybridInit() {
    console.log('🚀 Starting hybrid initialization...');
    
    if (typeof security === 'undefined') {
        console.error('❌ Security manager not loaded!');
        setTimeout(() => hybridInit(), 100);
        return;
    }
    
    loadConfig();
    
    const chatMessages = document.getElementById('chat-messages');
    
    // Pokud nemáme API klíče
    if (!APP_CONFIG.TABIDOO_API_TOKEN || !APP_CONFIG.TABIDOO_APP_ID) {
        chatMessages.innerHTML = '';
        showWelcomeScreen();
        
        document.getElementById('chat-input').addEventListener('keydown', function(event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
            }
        });
        return;
    }
    
    // Spustit diagnostiku při prvním spuštění
    if (!localStorage.getItem(CONFIG.CACHE.DIAGNOSTICS_KEY)) {
        const diagnosticsOk = await runDiagnostics();
        localStorage.setItem(CONFIG.CACHE.DIAGNOSTICS_KEY, 'true');
        return;
    }
    
    chatMessages.innerHTML = `<div class="message system-message">📊 Načítám data a inicializuji hybridní systém...</div>`;
    
    const dataLoaded = await loadTabidooData();
    
    if (dataLoaded) {
        // Inicializovat query processor
        console.log('🧠 Initializing query processor...');
        const processorReady = initializeQueryProcessor();
        
        if (!processorReady) {
            throw new Error('Failed to initialize query processor');
        }
        
        chatMessages.innerHTML = '';
        addMessage('system', '✅ Hybridní systém je připraven!');
        
        // Zobrazit welcome screen místo dlouhého textu
        setTimeout(() => {
            showWelcomeScreen();
        }, 500);
        
        // Debug info
        const stats = queryProcessor.getEntityStats();
        console.log('📈 System ready with data:', stats);
        
    } else {
        chatMessages.innerHTML = '';
        addMessage('error', CONFIG.MESSAGES.DATA_LOAD_ERROR);
    }
    
    document.getElementById('chat-input').addEventListener('keydown', function(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });
}

// NOVÁ FUNKCE - Debug funkce pro testování
window.debugQueryProcessor = function(query) {
    if (!queryProcessor) {
        console.log('❌ Query processor not initialized');
        return;
    }
    
    console.log('🔍 Debug query:', query);
    queryProcessor.processQuery(query).then(result => {
        console.log('📤 Debug result:', result);
    });
};

// NOVÁ FUNKCE - Získání statistik systému
window.getSystemStats = function() {
    if (!queryProcessor) {
        console.log('❌ Query processor not initialized');
        return;
    }
    
    const stats = queryProcessor.getEntityStats();
    console.log('📊 System Statistics:', stats);
    return stats;
};

// Export pro testování
window.hybridSystem = {
    queryProcessor: () => queryProcessor,
    tablesData: () => tablesData,
    sendMessage: sendMessage,
    debugQuery: window.debugQueryProcessor,
    getStats: window.getSystemStats
};

// Validace API klíčů
function validateApiKeys(openaiKey, tabidooToken) {
    const errors = [];
    
    if (!openaiKey) {
        errors.push('OpenAI API klíč je povinný');
    } else if (!CONFIG.VALIDATION.API_KEY_PATTERNS.OPENAI.test(openaiKey)) {
        errors.push('OpenAI API klíč má neplatný formát');
    }
    
    if (!tabidooToken) {
        errors.push('Tabidoo API token je povinný');
    } else if (!CONFIG.VALIDATION.API_KEY_PATTERNS.TABIDOO.test(tabidooToken)) {
        errors.push('Tabidoo token má neplatný formát');
    }
    
    return errors;
}

// Uložení nastavení
function saveSettings() {
    const openaiKey = document.getElementById('openai-key').value.trim();
    const tabidooToken = document.getElementById('tabidoo-token').value.trim();
    const tabidooAppId = document.getElementById('tabidoo-app-id').value.trim();
    
    console.log('Saving settings...');
    
    if (openaiKey) {
        security.saveSecure('openai_key', openaiKey);
        APP_CONFIG.OPENAI_API_KEY = openaiKey;
    }
    
    if (tabidooToken) {
        security.saveSecure('tabidoo_token', tabidooToken);
        APP_CONFIG.TABIDOO_API_TOKEN = tabidooToken;
    }
    
    if (tabidooAppId) {
        security.saveSecure('tabidoo_app_id', tabidooAppId);
        APP_CONFIG.TABIDOO_APP_ID = tabidooAppId;
    }
    
    alert('Nastavení bezpečně uloženo!');
    toggleSettings();
    
    if (Object.keys(tablesData).length === 0 && APP_CONFIG.OPENAI_API_KEY && APP_CONFIG.TABIDOO_API_TOKEN && APP_CONFIG.TABIDOO_APP_ID) {
        location.reload();
    }
}

// Zobrazení/skrytí nastavení
function toggleSettings() {
    const panel = document.getElementById('settings-panel');
    const isHidden = panel.style.display === 'none';
    panel.style.display = isHidden ? 'block' : 'none';
    
    if (isHidden) {
        const openaiField = document.getElementById('openai-key');
        const tabidooField = document.getElementById('tabidoo-token');
        const appIdField = document.getElementById('tabidoo-app-id');
        
        openaiField.value = '';
        tabidooField.value = '';
        appIdField.value = APP_CONFIG.TABIDOO_APP_ID || '';
        
        openaiField.placeholder = APP_CONFIG.OPENAI_API_KEY ? 'API klíč je nastaven (pro změnu zadejte nový)' : 'Zadejte OpenAI API klíč';
        tabidooField.placeholder = APP_CONFIG.TABIDOO_API_TOKEN ? 'Token je nastaven (pro změnu zadejte nový)' : 'Zadejte Tabidoo API token';
    }
}

// Export konfigurace
function exportConfig() {
    const config = {
        openai: security.loadSecure('openai_key'),
        tabidoo: security.loadSecure('tabidoo_token'),
        appId: security.loadSecure('tabidoo_app_id'),
        timestamp: new Date().toISOString()
    };
    
    const exportKey = prompt('Zadejte heslo pro export (zapamatujte si ho):');
    if (!exportKey) return;
    
    const encrypted = security.encrypt(JSON.stringify(config), exportKey);
    
    const blob = new Blob([encrypted], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tabidoo-config-${Date.now()}.enc`;
    a.click();
    URL.revokeObjectURL(url);
}

// Import konfigurace
function importConfig() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.enc';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const encrypted = await file.text();
        const exportKey = prompt('Zadejte heslo pro import:');
        if (!exportKey) return;
        
        try {
            const decrypted = security.decrypt(encrypted, exportKey);
            const config = JSON.parse(decrypted);
            
            security.saveSecure('openai_key', config.openai);
            security.saveSecure('tabidoo_token', config.tabidoo);
            security.saveSecure('tabidoo_app_id', config.appId);
            
            alert('Konfigurace úspěšně importována!');
            location.reload();
        } catch (error) {
            alert('Chyba při importu: Nesprávné heslo nebo poškozený soubor');
        }
    };
    
    input.click();
}

// NOVÁ FUNKCE - Odeslání zprávy s hybridním přístupem
async function sendMessage() {
    console.log('🚀 Send message clicked - HYBRID VERSION');
    
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-button');
    const messageText = chatInput.value.trim();
    
    if (!messageText) {
        return;
    }
    
    if (!APP_CONFIG.TABIDOO_API_TOKEN) {
        alert('Nejprve nastavte Tabidoo API token!');
        toggleSettings();
        return;
    }
    
    // Přidat uživatelovu zprávu
    addMessage('user', messageText);
    chatInput.value = '';
    
    // Nastavit loading stav
    chatInput.disabled = true;
    sendButton.disabled = true;
    sendButton.textContent = 'Zpracovávám...';
    
    try {
        // NOVÁ LOGIKA - Použít query processor
        const result = await queryProcessor.processQuery(messageText);
        console.log('📤 Query result:', result);
        
        // Zobrazit odpověď
        addMessage('assistant', result.response);
        
        // Debug info do konzole
        console.log('🔍 Query type:', result.type);
        if (result.count !== undefined) {
            console.log('📊 Count:', result.count);
        }
        if (result.records) {
            console.log('📋 Records found:', result.records.length);
        }
        
    } catch (error) {
        console.error('❌ Error processing query:', error);
        
        // Fallback na starý způsob
        try {
            console.log('🔄 Trying fallback...');
            const fallbackResponse = await smartCallOpenAI(messageText);
            addMessage('assistant', fallbackResponse);
        } catch (fallbackError) {
            console.error('❌ Fallback also failed:', fallbackError);
            addMessage('error', 'Omlouvám se, nastala chyba při zpracování dotazu. Zkuste to prosím znovu.');
        }
    } finally {
        // Obnovit UI
        chatInput.disabled = false;
        sendButton.disabled = false;
        sendButton.textContent = 'Odeslat';
        chatInput.focus();
    }
}

// NOVÁ FUNKCE - Inicializace query processoru
function initializeQueryProcessor() {
    console.log('🧠 Initializing Query Processor...');
    
    if (!queryProcessor && Object.keys(tablesData).length > 0) {
        queryProcessor = new QueryProcessor(tablesData);
        console.log('✅ Query Processor initialized');
        
        // Zobrazit debug info
        const stats = queryProcessor.getEntityStats();
        console.log('📊 Data statistics:', stats);
        
        return true;
    }
    
    return false;
}

// UPRAVENÁ FUNKCE - Spuštění aplikace s novým systémem
window.onload = function() {
    console.log('🌟 Window loaded, starting HYBRID init...');
    setTimeout(hybridInit, 100);
};

// NOVÁ FUNKCE - Hybridní inicializace
async function hybridInit() {
    console.log('🚀 Starting hybrid initialization...');
    
    if (typeof security === 'undefined') {
        console.error('❌ Security manager not loaded!');
        setTimeout(() => hybridInit(), 100);
        return;
    }
    
    loadConfig();
    
    const chatMessages = document.getElementById('chat-messages');
    
    // Pokud nemáme API klíče
    if (!APP_CONFIG.TABIDOO_API_TOKEN || !APP_CONFIG.TABIDOO_APP_ID) {
        chatMessages.innerHTML = '';
        addMessage('system', CONFIG.MESSAGES.WELCOME);
        
        document.getElementById('chat-input').addEventListener('keydown', function(event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
            }
        });
        return;
    }
    
    // Zobrazit loading zprávu
    chatMessages.innerHTML = `<div class="message system-message">🔄 Načítám data a inicializuji hybridní systém...</div>`;
    
    try {
        // 1. Načíst data
        console.log('📊 Loading Tabidoo data...');
        const dataLoaded = await loadTabidooData();
        
        if (!dataLoaded) {
            throw new Error('Failed to load Tabidoo data');
        }
        
        // 2. Inicializovat query processor
        console.log('🧠 Initializing query processor...');
        const processorReady = initializeQueryProcessor();
        
        if (!processorReady) {
            throw new Error('Failed to initialize query processor');
        }
        
        // 3. Úspěšná inicializace
        chatMessages.innerHTML = '';
        addMessage('system', '✅ Hybridní systém je připraven!');
        
        setTimeout(() => {
            addMessage('assistant', `🎯 Nový hybridní systém je aktivní!

**Výhody:**
• Rychlé lokální vyhledávání
• Přesné počítání záznamů  
• Inteligentní rozpoznávání dotazů
• ChatGPT jen pro formulaci odpovědí

**Zkuste například:**
• "Kolik je firem v systému?"
• "Vypiš všechny firmy"
• "Najdi firmu Noviko"
• "Podrobnosti o firmě XYZ"`);
        }, 1000);
        
        // Debug info
        const stats = queryProcessor.getEntityStats();
        console.log('📈 System ready with data:', stats);
        
    } catch (error) {
        console.error('❌ Hybrid initialization failed:', error);
        chatMessages.innerHTML = '';
        addMessage('error', '❌ Chyba při inicializaci hybridního systému. Zkontrolujte nastavení API.');
        
        // Fallback na starý systém
        console.log('🔄 Falling back to old system...');
        setTimeout(() => {
            init(true); // Spustit starý systém
        }, 2000);
    }
    
    // Přidat event listener pro Enter
    document.getElementById('chat-input').addEventListener('keydown', function(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });
}

// NOVÁ FUNKCE - Debug funkce pro testování
window.debugQueryProcessor = function(query) {
    if (!queryProcessor) {
        console.log('❌ Query processor not initialized');
        return;
    }
    
    console.log('🔍 Debug query:', query);
    queryProcessor.processQuery(query).then(result => {
        console.log('📤 Debug result:', result);
    });
};

// NOVÁ FUNKCE - Získání statistik systému
window.getSystemStats = function() {
    if (!queryProcessor) {
        console.log('❌ Query processor not initialized');
        return;
    }
    
    const stats = queryProcessor.getEntityStats();
    console.log('📊 System Statistics:', stats);
    return stats;
};

// Export pro testování
window.hybridSystem = {
    queryProcessor: () => queryProcessor,
    tablesData: () => tablesData,
    sendMessage: sendMessage,
    debugQuery: window.debugQueryProcessor,
    getStats: window.getSystemStats
};
