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
    
    // Validace
    const errors = validateApiKeys(openaiKey, tabidooToken);
    if (errors.length > 0) {
        alert('Chyby v nastavení:\n' + errors.join('\n'));
        return;
    }
    
    // Bezpečné uložení
    security.saveSecure('openai_key', openaiKey);
    security.saveSecure('tabidoo_token', tabidooToken);
    security.saveSecure('tabidoo_app_id', tabidooAppId);
    
    // Aktualizovat CONFIG
    CONFIG.OPENAI_API_KEY = openaiKey;
    CONFIG.TABIDOO_API_TOKEN = tabidooToken;
    CONFIG.TABIDOO_APP_ID = tabidooAppId;
    
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
        const openaiField = document.getElementById('openai-key');
        const tabidooField = document.getElementById('tabidoo-token');
        const appIdField = document.getElementById('tabidoo-app-id');
        
        // Vymazat pole při otevření
        openaiField.value = '';
        tabidooField.value = '';
        appIdField.value = CONFIG.TABIDOO_APP_ID || '';
        
        // Placeholder s nápovědou
        openaiField.placeholder = CONFIG.OPENAI_API_KEY ? 'API klíč je nastaven (pro změnu zadejte nový)' : 'Zadejte OpenAI API klíč';
        tabidooField.placeholder = CONFIG.TABIDOO_API_TOKEN ? 'Token je nastaven (pro změnu zadejte nový)' : 'Zadejte Tabidoo API token';
    }
}

// Export/Import konfigurace
function exportConfig() {
    const config = {
        openai: security.loadSecure('openai_key'),
        tabidoo: security.loadSecure('tabidoo_token'),
        appId: security.loadSecure('tabidoo_app_id'),
        timestamp: new Date().toISOString()
    };
    
    // Zašifrovat celou konfiguraci
    const exportKey = prompt('Zadejte heslo pro export (zapamatujte si ho):');
    if (!exportKey) return;
    
    const encrypted = security.encrypt(JSON.stringify(config), exportKey);
    
    // Stáhnout jako soubor
    const blob = new Blob([encrypted], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tabidoo-config-${Date.now()}.enc`;
    a.click();
    URL.revokeObjectURL(url);
}

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
            
            // Uložit importovanou konfiguraci
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
