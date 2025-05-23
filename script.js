// Globální proměnné
let CONFIG = {};
let tablesData = {};
let messages = [];

// Načtení konfigurace
function loadConfig() {
    CONFIG.OPENAI_API_KEY = localStorage.getItem('openai_key') || DEFAULT_CONFIG.OPENAI_API_KEY;
    CONFIG.TABIDOO_API_TOKEN = localStorage.getItem('tabidoo_token') || DEFAULT_CONFIG.TABIDOO_API_TOKEN;
    CONFIG.TABIDOO_APP_ID = localStorage.getItem('tabidoo_app_id') || DEFAULT_CONFIG.TABIDOO_APP_ID;
}

// Zobrazení/skrytí nastavení
function toggleSettings() {
    const panel = document.getElementById('settings-panel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    
    document.getElementById('openai-key').value = CONFIG.OPENAI_API_KEY;
    document.getElementById('tabidoo-token').value = CONFIG.TABIDOO_API_TOKEN;
    document.getElementById('tabidoo-app-id').value = CONFIG.TABIDOO_APP_ID;
}

// Uložení nastavení
function saveSettings() {
    CONFIG.OPENAI_API_KEY = document.getElementById('openai-key').value;
    CONFIG.TABIDOO_API_TOKEN = document.getElementById('tabidoo-token').value;
    CONFIG.TABIDOO_APP_ID = document.getElementById('tabidoo-app-id').value;
    
    localStorage.setItem('openai_key', CONFIG.OPENAI_API_KEY);
    localStorage.setItem('tabidoo_token', CONFIG.TABIDOO_API_TOKEN);
    localStorage.setItem('tabidoo_app_id', CONFIG.TABIDOO_APP_ID);
    
    alert('Nastavení uloženo!');
    toggleSettings();
}

// Funkce pro obnovení dat z Tabidoo
async function refreshData() {
    if (!confirm('Opravdu chcete znovu načíst data z Tabidoo? Toto smaže cache a načte aktuální data.')) {
        return;
    }
    
    // Smazat cache
    localStorage.removeItem('tabidoo_data');
    localStorage.removeItem('tabidoo_data_timestamp');
    
    // Znovu načíst stránku
    location.reload();
}

// Přidání zprávy do chatu
function addMessage(role, content) {
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

// Načtení dat z cache nebo z API
async function loadTabidooData() {
    // Kontrola cache
    const cachedData = localStorage.getItem('tabidoo_data');
    const cacheTimestamp = localStorage.getItem('tabidoo_data_timestamp');
    
    if (cachedData && cacheTimestamp) {
        // Data existují v cache
        const cacheAge = Date.now() - parseInt(cacheTimestamp);
        const cacheAgeHours = cacheAge / (1000 * 60 * 60);
        
        try {
            tablesData = JSON.parse(cachedData);
            console.log('Data načtena z cache, stáří:', cacheAgeHours.toFixed(1), 'hodin');
            
            // Zobrazit informaci o cache
            const dataSummary = document.getElementById('data-summary');
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
    
    // Data nejsou v cache, načíst z API
    console.log('Načítám data z Tabidoo API...');
    
    for (const table of TABLES) {
        try {
            const data = await getTableData(table.id, table.name);
            
            if (data) {
                tablesData[table.id] = {
                    name: table.name,
                    data: data
                };
            }
        } catch (error) {
            console.error(`Chyba při načítání tabulky ${table.name}:`, error);
        }
    }
    
    // Uložit do cache
    if (Object.keys(tablesData).length > 0) {
        localStorage.setItem('tabidoo_data', JSON.stringify(tablesData));
        localStorage.setItem('tabidoo_data_timestamp', Date.now().toString());
        console.log('Data uložena do cache');
        
        displayDataSummary('<div style="color: green; font-size: 11px; margin-top: 5px;">✓ Nová data načtena a uložena do cache</div>');
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
                            (table.data.items && Array.isArray(table.data.items) ? table.data.items.length : 'neznámý počet');
            summaryHtml += `- ${table.name}: ${dataCount} záznamů<br>`;
        }
    }
    
    if (hasData) {
        dataSummary.innerHTML = summaryHtml + additionalInfo;
        dataSummary.style.display = 'block';
    }
}

// Komunikace s OpenAI - ZMĚNA: Používáme cache data
async function callOpenAI(userMessages) {
    let systemPrompt = "Jsi asistent pro data z Tabidoo CRM. Odpovídej česky a stručně. ";
    systemPrompt += "DŮLEŽITÉ: Veškerá data, která máš k dispozici, jsou kompletní snapshot z databáze. ";
    systemPrompt += "Nemusíš se ptát na další informace, pracuj s tím, co máš k dispozici.\n\n";
    
    systemPrompt += "Máš přístup k následujícím tabulkám z Tabidoo CRM:\n\n";
    
    for (const tableId in tablesData) {
        const table = tablesData[tableId];
        const data = table.data;
        
        systemPrompt += `## Tabulka: ${table.name} (ID: ${tableId})\n\n`;
        
        if (data) {
            // Přidat VŠECHNA data do kontextu, ne jen ukázku
            if (Array.isArray(data)) {
                systemPrompt += `Počet záznamů: ${data.length}\n\n`;
                systemPrompt += "Kompletní data:\n";
                systemPrompt += JSON.stringify(data, null, 2) + "\n\n";
            } else if (data.items && Array.isArray(data.items)) {
                systemPrompt += `Počet záznamů: ${data.items.length}\n\n`;
                systemPrompt += "Kompletní data:\n";
                systemPrompt += JSON.stringify(data.items, null, 2) + "\n\n";
            } else {
                systemPrompt += "Kompletní data:\n";
                systemPrompt += JSON.stringify(data, null, 2) + "\n\n";
            }
        } else {
            systemPrompt += "Tabulka neobsahuje žádná data.\n\n";
        }
    }
    
    const apiMessages = [
        { role: "system", content: systemPrompt },
        ...userMessages
    ];
    
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${CONFIG.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
            model: "gpt-4o",
            messages: apiMessages,
            temperature: 0.7,
            max_tokens: 2000 // Zvýšit limit pro delší odpovědi
        })
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'OpenAI API Error');
    }
    
    const data = await response.json();
    return data.choices[0].message.content;
}

// Odeslání zprávy
async function sendMessage() {
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-button');
    const messageText = chatInput.value.trim();
    
    if (!messageText) {
        return;
    }
    
    addMessage('user', messageText);
    chatInput.value = '';
    
    chatInput.disabled = true;
    sendButton.disabled = true;
    sendButton.textContent = 'Odesílám...';
    
    try {
        const response = await callOpenAI(messages);
        addMessage('assistant', response);
    } catch (error) {
        console.error('Chyba:', error);
        addMessage('error', 'Chyba: ' + error.message);
    } finally {
        chatInput.disabled = false;
        sendButton.disabled = false;
        sendButton.textContent = 'Odeslat';
        chatInput.focus();
    }
}

// Inicializace při načtení stránky
async function init() {
    loadConfig();
    
    const chatMessages = document.getElementById('chat-messages');
    chatMessages.innerHTML = '<div class="message system-message">Načítám data...</div>';
    
    // Načíst data (z cache nebo API)
    const dataLoaded = await loadTabidooData();
    
    if (dataLoaded) {
        chatMessages.innerHTML = '';
        addMessage('system', 'Jsem připraven odpovídat na vaše dotazy ohledně dat z Tabidoo CRM.');
    } else {
        chatMessages.innerHTML = '';
        addMessage('error', 'Nepodařilo se načíst žádná data z Tabidoo. Zkontrolujte nastavení API.');
    }
    
    // Nastavení enter pro odeslání
    document.getElementById('chat-input').addEventListener('keydown', function(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });
}

// Spuštění při načtení stránky
window.onload = init;
