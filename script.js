// Globální proměnné
let CONFIG = {};
let tablesData = {}; // DŮLEŽITÉ - musí být definováno globálně
let messages = [];
let embeddingsReady = false;

// Načtení konfigurace - BEZPEČNÁ VERZE
function loadConfig() {
    // Načíst z bezpečného úložiště
    CONFIG.OPENAI_API_KEY = security.loadSecure('openai_key') || '';
    CONFIG.TABIDOO_API_TOKEN = security.loadSecure('tabidoo_token') || '';
    CONFIG.TABIDOO_APP_ID = security.loadSecure('tabidoo_app_id') || '';
    
    console.log('Config loaded:', {
        hasOpenAI: !!CONFIG.OPENAI_API_KEY,
        hasTabidoo: !!CONFIG.TABIDOO_API_TOKEN,
        hasAppId: !!CONFIG.TABIDOO_APP_ID
    });
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
    
    console.log('Saving settings...');
    
    // Uložit pouze vyplněné hodnoty
    if (openaiKey) {
        security.saveSecure('openai_key', openaiKey);
        CONFIG.OPENAI_API_KEY = openaiKey;
    }
    
    if (tabidooToken) {
        security.saveSecure('tabidoo_token', tabidooToken);
        CONFIG.TABIDOO_API_TOKEN = tabidooToken;
    }
    
    if (tabidooAppId) {
        security.saveSecure('tabidoo_app_id', tabidooAppId);
        CONFIG.TABIDOO_APP_ID = tabidooAppId;
    }
    
    alert('Nastavení bezpečně uloženo!');
    toggleSettings();
    
    // Pokud ještě nejsou data, načíst je
    if (Object.keys(tablesData).length === 0 && CONFIG.OPENAI_API_KEY && CONFIG.TABIDOO_API_TOKEN && CONFIG.TABIDOO_APP_ID) {
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
        appIdField.value = CONFIG.TABIDOO_APP_ID || '';
        
        openaiField.placeholder = CONFIG.OPENAI_API_KEY ? 'API klíč je nastaven (pro změnu zadejte nový)' : 'Zadejte OpenAI API klíč';
        tabidooField.placeholder = CONFIG.TABIDOO_API_TOKEN ? 'Token je nastaven (pro změnu zadejte nový)' : 'Zadejte Tabidoo API token';
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

// Obnovení dat
async function refreshData() {
    if (!confirm('Opravdu chcete znovu načíst data z Tabidoo? Toto smaže cache a vyhledávací index.')) {
        return;
    }
    
    localStorage.removeItem('tabidoo_data');
    localStorage.removeItem('tabidoo_data_timestamp');
    localStorage.removeItem('tabidoo_embeddings');
    localStorage.removeItem('tabidoo_embeddings_timestamp');
    
    location.reload();
}

// Přidání zprávy do chatu
function addMessage(role, content) {
    console.log('Adding message:', role, content);
    
    const chatMessages = document.getElementById('chat-messages');
    const messageElement = document.createElement('div');
    messageElement.className = 'message ' + role + '-message';
    messageElement.textContent = content;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    if (role === 'user' || role === 'assistant') {
        messages.push({ role, content });
    }
}

// Získání dat z Tabidoo
async function getTableData(tableId, tableName) {
    try {
        console.log(`Získávám data tabulky ${tableName} (${tableId})...`);
        
        const url = `https://app.tabidoo.cloud/api/v2/apps/${CONFIG.TABIDOO_APP_ID}/tables/${tableId}/data?limit=50`;
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${CONFIG.TABIDOO_API_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`HTTP error! status: ${response.status}, body: ${errorText}`);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`Data tabulky ${tableName} získána:`, data);
        
        return data;
    } catch (error) {
        console.error(`Chyba při získávání dat tabulky ${tableName}:`, error);
        return null;
    }
}

// Načtení dat z cache nebo API
async function loadTabidooData() {
    const cachedData = localStorage.getItem('tabidoo_data');
    const cacheTimestamp = localStorage.getItem('tabidoo_data_timestamp');
    
    if (cachedData && cacheTimestamp) {
        const cacheAge = Date.now() - parseInt(cacheTimestamp);
        const cacheAgeHours = cacheAge / (1000 * 60 * 60);
        
        try {
            tablesData = JSON.parse(cachedData);
            console.log('Data načtena z cache, stáří:', cacheAgeHours.toFixed(1), 'hodin');
            console.log('Loaded tables:', Object.keys(tablesData));
            
            const cacheInfo = `<div style="color: #666; font-size: 11px; margin-top: 5px;">
                Data načtena z cache (stáří: ${cacheAgeHours.toFixed(1)} hodin) 
                <button onclick="refreshData()" style="margin-left: 10px; font-size: 11px;">🔄 Obnovit data</button>
            </div>`;
            
            displayDataSummary(cacheInfo);
            return true;
        } catch (error) {
            console.error('Chyba při načítání dat z cache:', error);
            localStorage.removeItem('tabidoo_data');
            localStorage.removeItem('tabidoo_data_timestamp');
        }
    }
    
    console.log('Načítám data z Tabidoo API...');
    tablesData = {}; // Reset dat
    
    for (const table of TABLES) {
        try {
            const data = await getTableData(table.id, table.name);
            
            if (data) {
                tablesData[table.id] = {
                    name: table.name,
                    data: data
                };
                console.log(`Tabulka ${table.name} uložena`);
            }
        } catch (error) {
            console.error(`Chyba při načítání tabulky ${table.name}:`, error);
        }
    }
    
    if (Object.keys(tablesData).length > 0) {
        localStorage.setItem('tabidoo_data', JSON.stringify(tablesData));
        localStorage.setItem('tabidoo_data_timestamp', Date.now().toString());
        console.log('Data uložena do cache');
        
        displayDataSummary('<div style="color: green; font-size: 11px; margin-top: 5px;">✓ Data načtena a uložena</div>');
        return true;
    }
    
    return false;
}

// Zobrazení souhrnu dat
function displayDataSummary(additionalInfo = '') {
    const dataSummary = document.getElementById('data-summary');
    let summaryHtml = '<strong>Načtené tabulky:</strong><br>';
    let hasData = false;
    
    for (const tableId in tablesData) {
        const table = tablesData[tableId];
        if (table && table.data) {
            hasData = true;
            const dataCount = Array.isArray(table.data) ? table.data.length : 
                            (table.data?.items?.length || 0);
            summaryHtml += `- ${table.name}: ${dataCount} záznamů<br>`;
        }
    }
    
    if (hasData) {
        dataSummary.innerHTML = summaryHtml + additionalInfo;
        dataSummary.style.display = 'block';
    }
}

// Smart volání OpenAI
async function smartCallOpenAI(query) {
    console.log('Smart call OpenAI for query:', query);
    
    try {
        // Pokud nejsou embeddings, použít fallback
        if (!embeddingsReady) {
            console.log('Embeddings not ready, using fallback search');
            const results = fallbackTextSearch(query, 5);
            
            if (results.length === 0) {
                return "Nenašel jsem žádné relevantní záznamy. Zkuste jiný dotaz.";
            }
            
            // Vytvořit odpověď z výsledků
            let response = `Našel jsem ${results.length} relevantních záznamů:\n\n`;
            for (const item of results) {
                response += `**${item.tableName}**: `;
                const record = item.record;
                const preview = Object.entries(record)
                    .slice(0, 3)
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(', ');
                response += preview + '\n';
            }
            return response;
        }
        
        // Najít relevantní data pomocí embeddings
        const relevantData = await findRelevantData(query, 10);
        
        if (relevantData.length === 0) {
            return "Nenašel jsem žádné relevantní záznamy k vašemu dotazu.";
        }
        
        // Připravit kontext
        let context = "Relevantní data z databáze:\n\n";
        const groupedData = {};
        
        for (const item of relevantData) {
            if (!groupedData[item.tableName]) {
                groupedData[item.tableName] = [];
            }
            groupedData[item.tableName].push(item);
        }
        
        for (const [tableName, items] of Object.entries(groupedData)) {
            context += `### ${tableName}:\n`;
            for (const item of items.slice(0, 3)) {
                const record = item.record;
                const summary = [];
                const priorityFields = ['id', 'name', 'nazev', 'jmeno', 'prijmeni', 'email', 'firma'];
                
                for (const field of priorityFields) {
                    if (record[field]) {
                        summary.push(`${field}: ${record[field]}`);
                    }
                }
                
                context += `- ${summary.join(', ')}\n`;
            }
            context += '\n';
        }
        
        // Volat OpenAI
        console.log('Calling OpenAI API...');
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${CONFIG.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: "Jsi asistent pro Tabidoo CRM. Odpovídej na základě poskytnutých dat. Odpovídej stručně a věcně česky."
                    },
                    {
                        role: "user",
                        content: `${context}\n\nDotaz: ${query}`
                    }
                ],
                temperature: 0.7,
                max_tokens: 500
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            console.error('OpenAI API error:', error);
            throw new Error(error.error?.message || 'OpenAI API Error');
        }
        
        const data = await response.json();
        let answer = data.choices[0].message.content;
        answer += `\n\n_Nalezeno ${relevantData.length} relevantních záznamů._`;
        
        return answer;
        
    } catch (error) {
        console.error('Smart search error:', error);
        
        // Pokud je chyba s API klíčem
        if (error.message.includes('Incorrect API key')) {
            return 'Chyba: Neplatný OpenAI API klíč. Zkontrolujte nastavení.';
        }
        
        // Fallback na lokální vyhledávání
        const results = fallbackTextSearch(query, 5);
        if (results.length > 0) {
            let response = `Našel jsem ${results.length} relevantních záznamů:\n\n`;
            for (const item of results) {
                response += `**${item.tableName}**: `;
                const record = item.record;
                const preview = Object.entries(record)
                    .slice(0, 3)
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(', ');
                response += preview + '\n';
            }
            return response;
        }
        
        throw error;
    }
}

// Odeslání zprávy
async function sendMessage() {
    console.log('Send message clicked');
    
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-button');
    const messageText = chatInput.value.trim();
    
    if (!messageText) {
        console.log('Empty message');
        return;
    }
    
    // Kontrola API klíčů
    if (!CONFIG.OPENAI_API_KEY || !CONFIG.TABIDOO_API_TOKEN) {
        alert('Nejprve nastavte API klíče v nastavení!');
        toggleSettings();
        return;
    }
    
    console.log('Sending message:', messageText);
    
    addMessage('user', messageText);
    chatInput.value = '';
    
    chatInput.disabled = true;
    sendButton.disabled = true;
    sendButton.textContent = 'Hledám...';
    
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

// Inicializace
async function init() {
    console.log('Initializing...');
    
    // Zajistit, že jsou všechny závislosti načteny
    if (typeof security === 'undefined') {
        console.error('Security manager not loaded!');
        setTimeout(init, 100);
        return;
    }
    
    loadConfig();
    
    const chatMessages = document.getElementById('chat-messages');
    
    // Kontrola API klíčů
    if (!CONFIG.OPENAI_API_KEY || !CONFIG.TABIDOO_API_TOKEN || !CONFIG.TABIDOO_APP_ID) {
        chatMessages.innerHTML = '';
        addMessage('system', '⚙️ Vítejte! Pro začátek nastavte API klíče v nastavení (ikona ⚙️ vpravo nahoře).');
        
        // Přidat event listener pro Enter
        document.getElementById('chat-input').addEventListener('keydown', function(event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
            }
        });
        return;
    }
    
    chatMessages.innerHTML = '<div class="message system-message">Načítám data...</div>';
    
    // Načíst data
    const dataLoaded = await loadTabidooData();
    
    if (dataLoaded) {
        chatMessages.innerHTML = '';
        
        // Zkontrolovat embeddings
        if (!checkEmbeddings()) {
            addMessage('system', 'Vytvářím vyhledávací index pro rychlé vyhledávání...');
            
            try {
                await createEmbeddings(tablesData, (progress) => {
                    console.log(`Progress: ${progress}%`);
                });
                embeddingsReady = true;
                addMessage('system', '✓ Vyhledávací index vytvořen! Systém je připraven.');
            } catch (error) {
                console.error('Chyba při vytváření embeddings:', error);
                addMessage('system', '⚠️ Používám základní vyhledávání (embeddings se nepodařilo vytvořit).');
                embeddingsReady = false;
            }
        } else {
            embeddingsReady = true;
            addMessage('system', '✓ Systém je připraven k inteligentnímu vyhledávání.');
        }
        
        // Nápověda
        setTimeout(() => {
            addMessage('assistant', 
                'Můžete se ptát na cokoliv z vašich dat. Například:\n' +
                '• "Najdi kontakty"\n' +
                '• "Ukáž firmy"\n' +
                '• "Jaké máme aktivity?"\n' +
                '• "Seznam obchodních případů"'
            );
        }, 1000);
        
    } else {
        chatMessages.innerHTML = '';
        addMessage('error', 'Nepodařilo se načíst data z Tabidoo. Zkontrolujte nastavení API.');
    }
    
    // Event listener pro Enter
    document.getElementById('chat-input').addEventListener('keydown', function(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });
}

// Spuštění
window.onload = function() {
    console.log('Window loaded, starting init...');
    setTimeout(init, 100); // Malé zpoždění pro načtení všech scriptů
};
