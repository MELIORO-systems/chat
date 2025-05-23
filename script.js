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
    
    localStorage.removeItem('tabidoo_data');
    localStorage.removeItem('tabidoo_data_timestamp');
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

// Získání dat z Tabidoo - OMEZIT NA 30 ZÁZNAMŮ
async function getTableData(tableId, tableName) {
    try {
        console.log(`Získávám data tabulky ${tableName} (${tableId})...`);
        
        const url = `https://app.tabidoo.cloud/api/v2/apps/${CONFIG.TABIDOO_APP_ID}/tables/${tableId}/data?limit=30`;
        
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
    const cachedData = localStorage.getItem('tabidoo_data');
    const cacheTimestamp = localStorage.getItem('tabidoo_data_timestamp');
    
    if (cachedData && cacheTimestamp) {
        const cacheAge = Date.now() - parseInt(cacheTimestamp);
        const cacheAgeHours = cacheAge / (1000 * 60 * 60);
        
        try {
            tablesData = JSON.parse(cachedData);
            console.log('Data načtena z cache, stáří:', cacheAgeHours.toFixed(1), 'hodin');
            
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
                            (table.data?.items?.length || 0);
            summaryHtml += `- ${table.name}: ${dataCount} záznamů (zobrazeno max 30)<br>`;
        }
    }
    
    if (hasData) {
        dataSummary.innerHTML = summaryHtml + additionalInfo;
        dataSummary.style.display = 'block';
    }
}

// Funkce pro získání souhrnu dat (místo plných dat)
function getDataSummary() {
    const summary = {};
    
    for (const tableId in tablesData) {
        const table = tablesData[tableId];
        const tableData = Array.isArray(table.data) ? table.data : 
                         (table.data?.items || []);
        
        if (tableData.length > 0) {
            // Získat seznam polí
            const sampleRecord = tableData[0];
            const fields = Object.keys(sampleRecord);
            
            // Vytvořit souhrn
            summary[tableId] = {
                name: table.name,
                recordCount: tableData.length,
                fields: fields,
                sampleRecords: tableData.slice(0, 3).map(record => {
                    // Zkrátit dlouhé hodnoty
                    const shortRecord = {};
                    for (const [key, value] of Object.entries(record)) {
                        if (typeof value === 'string' && value.length > 50) {
                            shortRecord[key] = value.substring(0, 50) + '...';
                        } else {
                            shortRecord[key] = value;
                        }
                    }
                    return shortRecord;
                })
            };
        }
    }
    
    return summary;
}

// NOVÁ komunikace s OpenAI - maximálně optimalizovaná
async function callOpenAI(userMessages) {
    const lastUserMessage = [...userMessages].reverse().find(m => m.role === 'user');
    const currentQuery = lastUserMessage?.content || '';
    
    // Získat pouze souhrn dat
    const dataSummary = getDataSummary();
    
    let systemPrompt = `Jsi asistent pro Tabidoo CRM. Máš přístup k následujícím tabulkám:

`;
    
    // Velmi stručný popis dat
    for (const [tableId, summary] of Object.entries(dataSummary)) {
        systemPrompt += `${summary.name}: ${summary.recordCount} záznamů\n`;
        systemPrompt += `Pole: ${summary.fields.slice(0, 10).join(', ')}\n`;
        systemPrompt += `Ukázka: ${JSON.stringify(summary.sampleRecords[0])}\n\n`;
    }
    
    systemPrompt += `
Odpovídej stručně česky. Pokud potřebuješ konkrétní data, požádej o upřesnění.`;
    
    // Pouze poslední 3 zprávy z historie
    const recentMessages = messages.slice(-6);
    
    const apiMessages = [
        { role: "system", content: systemPrompt },
        ...recentMessages
    ];
    
    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${CONFIG.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo", // ZMĚNA MODELU!
                messages: apiMessages,
                temperature: 0.7,
                max_tokens: 500
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'OpenAI API Error');
        }
        
        const data = await response.json();
        return data.choices[0].message.content;
        
    } catch (error) {
        console.error('API Error:', error);
        
        // Pokud stále problém, zkusit minimální verzi
        if (error.message.includes('Request too large') || error.message.includes('tokens')) {
            const minimalMessages = [
                {
                    role: "system",
                    content: "Jsi asistent pro Tabidoo CRM. V databázi jsou tabulky: Aktivity, Kontakty, Obchodní případy, Firma. Odpověz stručně česky."
                },
                {
                    role: "user",
                    content: currentQuery
                }
            ];
            
            const response = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${CONFIG.OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: "gpt-3.5-turbo",
                    messages: minimalMessages,
                    temperature: 0.7,
                    max_tokens: 200
                })
            });
            
            if (!response.ok) {
                throw new Error('API stále přetížené. Zkuste to později.');
            }
            
            const data = await response.json();
            return data.choices[0].message.content + "\n\n*[Pro detailní data se ptejte na konkrétní záznamy]*";
        }
        
        throw error;
    }
}

// Funkce pro vyhledání konkrétních dat
async function searchSpecificData(query) {
    // Tuto funkci můžete rozšířit pro vyhledávání konkrétních záznamů
    const results = [];
    
    for (const tableId in tablesData) {
        const table = tablesData[tableId];
        const tableData = Array.isArray(table.data) ? table.data : 
                         (table.data?.items || []);
        
        const matches = tableData.filter(record => {
            const recordStr = JSON.stringify(record).toLowerCase();
            return recordStr.includes(query.toLowerCase());
        }).slice(0, 5); // Max 5 výsledků
        
        if (matches.length > 0) {
            results.push({
                table: table.name,
                matches: matches
            });
        }
    }
    
    return results;
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
        // Pokud uživatel hledá konkrétní data
        if (messageText.toLowerCase().includes('najdi') || 
            messageText.toLowerCase().includes('vyhledej') || 
            messageText.toLowerCase().includes('ukáž')) {
            
            const searchTerm = messageText.split(' ').slice(-1)[0];
            const searchResults = await searchSpecificData(searchTerm);
            
            if (searchResults.length > 0) {
                let resultText = `Našel jsem následující výsledky pro "${searchTerm}":\n\n`;
                searchResults.forEach(result => {
                    resultText += `**${result.table}:**\n`;
                    result.matches.forEach(match => {
                        resultText += `- ${JSON.stringify(match)}\n`;
                    });
                });
                addMessage('assistant', resultText);
                return;
            }
        }
        
        // Normální dotaz přes ChatGPT
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
    
    const dataLoaded = await loadTabidooData();
    
    if (dataLoaded) {
        chatMessages.innerHTML = '';
        addMessage('system', 'Jsem připraven odpovídat na vaše dotazy. Pro vyhledání konkrétních dat použijte "najdi", "vyhledej" nebo "ukáž".');
    } else {
        chatMessages.innerHTML = '';
        addMessage('error', 'Nepodařilo se načíst data z Tabidoo. Zkontrolujte nastavení API.');
    }
    
    document.getElementById('chat-input').addEventListener('keydown', function(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });
}

// Spuštění při načtení stránky
window.onload = init;
