// Globální proměnné
let CONFIG = {};
let tablesData = {};
let messages = [];
let embeddingsReady = false;

// Načtení konfigurace - BEZPEČNÁ VERZE
function loadConfig() {
    // Načíst z bezpečného úložiště
    CONFIG.OPENAI_API_KEY = security.loadSecure('openai_key') || '';
    CONFIG.TABIDOO_API_TOKEN = security.loadSecure('tabidoo_token') || '';
    CONFIG.TABIDOO_APP_ID = security.loadSecure('tabidoo_app_id') || '';
    
    // Pokud nejsou klíče nastaveny, zobrazit dialog
    if (!CONFIG.OPENAI_API_KEY || !CONFIG.TABIDOO_API_TOKEN || !CONFIG.TABIDOO_APP_ID) {
        setTimeout(() => {
            alert('Nejprve prosím nastavte API klíče v nastavení (ikona ⚙️)');
            toggleSettings();
        }, 500);
    }
}

// Validace API klíčů
function validateApiKeys(openaiKey, tabidooToken) {
    const errors = [];
    
    if (!openaiKey) {
        errors.push('OpenAI API klíč je povinný');
    } else if (!openaiKey.startsWith('sk-')) {
        errors.push('OpenAI API klíč musí začínat "sk-"');
    }
    
    if (!tabidooToken) {
        errors.push('Tabidoo API token je povinný');
    } else if (!tabidooToken.startsWith('eyJ')) {
        errors.push('Neplatný formát Tabidoo tokenu');
    }
    
    return errors;
}

// Uložení nastavení - BEZPEČNÁ VERZE
function saveSettings() {
    const openaiKey = document.getElementById('openai-key').value.trim();
    const tabidooToken = document.getElementById('tabidoo-token').value.trim();
    const tabidooAppId = document.getElementById('tabidoo-app-id').value.trim();
    
    // Pokud jsou pole prázdná, neměnit existující hodnoty
    if (openaiKey || !CONFIG.OPENAI_API_KEY) {
        if (openaiKey) {
            const errors = validateApiKeys(openaiKey, tabidooToken || CONFIG.TABIDOO_API_TOKEN);
            if (errors.length > 0 && !confirm('Nalezeny problémy:\n' + errors.join('\n') + '\n\nPřesto pokračovat?')) {
                return;
            }
            security.saveSecure('openai_key', openaiKey);
            CONFIG.OPENAI_API_KEY = openaiKey;
        }
    }
    
    if (tabidooToken || !CONFIG.TABIDOO_API_TOKEN) {
        if (tabidooToken) {
            security.saveSecure('tabidoo_token', tabidooToken);
            CONFIG.TABIDOO_API_TOKEN = tabidooToken;
        }
    }
    
    if (tabidooAppId) {
        security.saveSecure('tabidoo_app_id', tabidooAppId);
        CONFIG.TABIDOO_APP_ID = tabidooAppId;
    }
    
    alert('Nastavení bezpečně uloženo!');
    toggleSettings();
    
    // Pokud ještě nejsou data, načíst je
    if (Object.keys(tablesData).length === 0) {
        location.reload();
    }
}

// Zobrazení/skrytí nastavení - UPRAVENÁ VERZE
function toggleSettings() {
    const panel = document.getElementById('settings-panel');
    const isHidden = panel.style.display === 'none';
    panel.style.display = isHidden ? 'block' : 'none';
    
    if (isHidden) {
        // Zobrazit pouze maskované hodnoty
        const openaiField = document.getElementById('openai-ke
