// Hlavní aplikační logika

// Globální proměnné
let APP_CONFIG = {};
let tablesData = {};
let messages = [];
let embeddingsReady = false;

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

// Odeslání zprávy
async function sendMessage() {
    console.log('Send message clicked');
    
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-button');
    const messageText = chatInput.value.trim();
    
    if (!messageText) {
        return;
    }
    
    if (!APP_CONFIG.OPENAI_API_KEY || !APP_CONFIG.TABIDOO_API_TOKEN) {
        alert(CONFIG.MESSAGES.API_KEY_ERROR);
        toggleSettings();
        return;
    }
    
    addMessage('user', messageText);
    chatInput.value = '';
    
    chatInput.disabled = true;
    sendButton.disabled = true;
    sendButton.textContent = 'Zpracovávám...';
    
    try {
        const response = await smartCallOpenAI(messageText);
        addMessage('assistant', response);
    } catch (error) {
        console.error('Chyba při zpracování:', error);
        addMessage('error', 'Chyba: ' + error.message);
    } finally {
        chatInput.disabled = false;
        sendButton.disabled = false;
        sendButton.textContent = 'Odeslat';
        chatInput.focus();
    }
}

// Spuštění aplikace
window.onload = function() {
    console.log('Window loaded, starting init...');
    setTimeout(init, 100);
};
