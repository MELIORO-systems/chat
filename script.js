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

// Získání dat z Tabidoo
async function getTableData(tableId, tableName) {
    try {
        console.log(`Získávám data tabulky ${tableName} (${tableId})...`);
        
        const url = `https://app.tabidoo.cloud/api/v2/apps/${CONFIG.TABIDOO_APP_ID}/tables/${tableId}/data?limit=20`; // Sníženo na 20
        
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
        console.log(`Data tabulky ${tableName} získána`);
        
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

// KRITICKÁ ZMĚNA - Nová minimální komunikace s OpenAI
async function callOpenAI(userMessages) {
    // Vytvořit velmi krátký souhrn dat
    let dataInfo = "Databáze obsahuje: ";
    for (const tableId in tablesData) {
        const table = tablesData[tableId];
        const count = Array.isArray(table.data) ? table.data.length : 
                     (table.data?.items?.length || 0);
        dataInfo += `${table.name} (${count} záznamů), `;
    }
    
    // Pouze poslední dotaz
    const lastMessage = userMessages[userMessages.length - 1];
    
    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${CONFIG.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo", // DŮLEŽITÉ - ne gpt-4o!
                messages: [
                    {
                        role: "system",
                        content: `Jsi asistent pro Tabidoo CRM. ${dataInfo}. Odpovídej velmi stručně česky.`
                    },
                    {
                        role: "user",
                        content: lastMessage.content
                    }
                ],
                temperature: 0.7,
                max_tokens: 150 // Omezení odpovědi
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            console.error('API Error:', error);
            
            // Pokud stále překračuje limit, vrátit jednoduchou odpověď
            if (error.error?.message?.includes('tokens') || error.error?.message?.includes('Request too large')) {
                return "Omlouvám se, dotaz je příliš složitý. Zkuste se zeptat jednodušeji nebo na konkrétní informaci.";
            }
            
            throw new Error(error.error?.message || 'OpenAI API Error');
        }
        
        const data = await response.json();
        return data.choices[0].message.content;
        
    } catch (error) {
        console.error('Chyba při volání API:', error);
        throw error;
    }
}

// Lokální vyhledávání v datech
function searchInData(query) {
    const searchTerm = query.toLowerCase();
    const results = [];
    
    for (const tableId in tablesData) {
        const table = tablesData[tableId];
        const tableData = Array.isArray(table.data) ? table.data : 
                         (table.data?.items || []);
        
        tableData.forEach(record => {
            const recordStr = JSON.stringify(record).toLowerCase();
            if (recordStr.includes(searchTerm)) {
                results.push({
                    table: table.name,
                    record: record
                });
            }
        });
    }
    
    return results.slice(0, 5); // Max 5 výsledků
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
        // Nejdřív zkusit lokální vyhledávání
        if (messageText.includes('?') || messageText.toLowerCase().includes('najdi') || 
            messageText.toLowerCase().includes('ukáž') || messageText.toLowerCase().includes('seznam')) {
            
            // Extrahovat klíčové slovo
            const words = messageText.split(' ');
            const keyword = words[words.length - 1].replace('?', '');
            
            const searchResults = searchInData(keyword);
            
            if (searchResults.length > 0) {
                let response = `Našel jsem ${searchResults.length} výsledků:\n\n`;
                searchResults.forEach((result, index) => {
                    response += `${index + 1}. ${result.table}: `;
                    // Zobrazit jen klíčové informace
                    const record = result.record;
                    const preview = Object.entries(record)
                        .slice(0, 3)
                        .map(([key, value]) => `${key}: ${value}`)
                        .join(', ');
                    response += preview + '\n';
                });
                
                addMessage('assistant', response);
                return;
            }
        }
        
        // Pokud lokální vyhledávání nenašlo nic, použít ChatGPT
        const response = await callOpenAI(messages);
        addMessage('assistant', response);
        
    } catch (error) {
        console.error('Chyba:', error);
        
        // Pokud je chyba s tokeny, nabídnout alternativu
        if (error.message.includes('token') || error.message.includes('Request too large')) {
            addMessage('assistant', 'Data jsou příliš velká pro zpracování. Zkuste se zeptat na konkrétní informaci, například:\n- "Najdi kontakt Jana"\n- "Seznam firem"\n- "Ukáž aktivity"');
        } else {
            addMessage('error', 'Chyba: ' + error.message);
        }
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
        addMessage('system', 'Vítejte! Mohu vám pomoci s daty z Tabidoo. Zkuste se zeptat na konkrétní informace.');
        
        // Přidat nápovědu
        setTimeout(() => {
            addMessage('assistant', 'Tip: Ptejte se například:\n- "Najdi kontakt Pavel"\n- "Seznam firem"\n- "Kolik máme aktivit?"\n- "Ukáž obchodní případy"');
        }, 1000);
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
