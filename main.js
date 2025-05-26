// Hlavní aplikační logika - FINÁLNÍ OPRAVENÁ VERZE

// Globální proměnné
let APP_CONFIG = {};
let tablesData = {};
let messages = [];
let queryProcessor = null;

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
    
    if (Object.keys(tablesData).length === 0 && APP_CONFIG.TABIDOO_API_TOKEN && APP_CONFIG.TABIDOO_APP_ID) {
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

// Odeslání zprávy s hybridním přístupem
async function sendMessage() {
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-button');
    const messageText = chatInput.value.trim();
    
    if (!messageText) return;
    
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
        // Použít query processor
        const result = await queryProcessor.processQuery(messageText);
        
        // Zobrazit odpověď
        addMessage('assistant', result.response);
        
    } catch (error) {
        console.error('❌ Error processing query:', error);
        addMessage('error', 'Omlouvám se, nastala chyba při zpracování dotazu. Zkuste to prosím znovu.');
    } finally {
        // Obnovit UI
        chatInput.disabled = false;
        sendButton.disabled = false;
        sendButton.textContent = 'Odeslat';
        chatInput.focus();
    }
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

// Spuštění aplikace
window.onload = function() {
    console.log('🌟 Window loaded, starting HYBRID init...');
    setTimeout(hybridInit, 100);
};

// Hlavní hybridní inicializace
async function hybridInit() {
    console.log('🚀 Starting hybrid initialization...');
    
    if (typeof security === 'undefined') {
        console.error('❌ Security manager not loaded!');
        setTimeout(() => hybridInit(), 100);
        return;
    }
    
    loadConfig();
    const chatMessages = document.getElementById('chat-messages');
    
    // Pokud nemáme API klíče - zobrazit welcome screen
    if (!APP_CONFIG.TABIDOO_API_TOKEN || !APP_CONFIG.TABIDOO_APP_ID) {
        console.log('🔧 No API keys, showing welcome screen...');
        showWelcomeScreen();
        setupEventListeners();
        return;
    }
    
    // Zobrazit loading zprávu
    chatMessages.innerHTML = `<div class="message system-message">🔄 Načítám data a inicializuji hybridní systém...</div>`;
    
    try {
        // Načíst data
        console.log('📊 Loading Tabidoo data...');
        const dataLoaded = await loadTabidooData();
        
        if (!dataLoaded) {
            throw new Error('Failed to load Tabidoo data');
        }
        
        // Inicializovat query processor
        console.log('🧠 Initializing query processor...');
        const processorReady = initializeQueryProcessor();
        
        if (!processorReady) {
            throw new Error('Failed to initialize query processor');
        }
        
        // Úspěšná inicializace - zobrazit welcome screen
        console.log('✅ Hybrid system ready');
        showWelcomeScreen();
        
    } catch (error) {
        console.error('❌ Hybrid initialization failed:', error);
        chatMessages.innerHTML = '';
        addMessage('error', '❌ Chyba při inicializaci systému. Zkontrolujte nastavení API.');
    }
    
    setupEventListeners();
}

// Nastavení event listenerů
function setupEventListeners() {
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
        chatInput.addEventListener('keydown', function(event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
            }
        });
    }
}

// Získání statistik systému
window.getSystemStats = function() {
    if (!queryProcessor) {
        return { companies: 0, contacts: 0, activities: 0, deals: 0, total: 0 };
    }
    return queryProcessor.getEntityStats();
};

// Export pro testování
window.hybridSystem = {
    queryProcessor: () => queryProcessor,
    tablesData: () => tablesData,
    sendMessage: sendMessage,
    getStats: window.getSystemStats
};
