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
        
        const url = `https://app.tabidoo.cloud/api/v2/apps/${CONFIG.TABIDOO_APP_ID}/tables/${tableId}/data?limit=100`;
        
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
                            (table.data.items && Array.isArray(table.data.items) ? table.data.items.length : 'neznámý počet');
            summaryHtml += `- ${table.name}: ${dataCount} záznamů<br>`;
        }
    }
    
    if (hasData) {
        dataSummary.innerHTML = summaryHtml + additionalInfo;
        dataSummary.style.display = 'block';
    }
}

// Funkce pro extrakci klíčových slov z dotazu
function extractKeywords(query) {
    // Odstranit české stopwords a vrátit klíčová slova
    const stopwords = ['a', 'aby', 'aj', 'ale', 'ano', 'asi', 'az', 'bez', 'bude', 'budem', 'budes', 'by', 'byl', 'byla', 'byli', 'bylo', 'byly', 'co', 'jak', 'jake', 'je', 'jeho', 'jej', 'jeji', 'jest', 'jeste', 'ji', 'jine', 'jiz', 'jsem', 'jses', 'jsi', 'jsme', 'jsou', 'jste', 'k', 'kam', 'kde', 'kdo', 'kdy', 'kdyz', 'ke', 'ktera', 'ktere', 'kteri', 'kterou', 'ktery', 'ma', 'mate', 'me', 'mezi', 'mi', 'mit', 'mne', 'mnou', 'mohl', 'mohou', 'moji', 'muj', 'muze', 'my', 'na', 'nad', 'nam', 'nami', 'nas', 'nase', 'nasi', 'ne', 'nebo', 'nebot', 'necht', 'nejsi', 'nejsou', 'nel', 'nelze', 'nem', 'nema', 'nemaji', 'nemate', 'nemame', 'nemel', 'neni', 'nez', 'nic', 'nich', 'nim', 'nove', 'novy', 'nybrz', 'o', 'od', 'ode', 'on', 'ona', 'oni', 'ono', 'ony', 'pak', 'po', 'pod', 'podle', 'pokud', 'pouze', 'prave', 'pred', 'pres', 'pri', 'pro', 'proc', 'proto', 'protoze', 'prvni', 'pta', 're', 's', 'se', 'si', 'sice', 'skrz', 'sve', 'svuj', 'svych', 'svym', 'svymi', 'ta', 'tak', 'take', 'tato', 'te', 'tebe', 'ted', 'tedy', 'tema', 'ten', 'tento', 'teto', 'tim', 'timto', 'tipy', 'to', 'toho', 'tohoto', 'tom', 'tomto', 'tomu', 'tomuto', 'tu', 'tuto', 'tvoj', 'tve', 'tvuj', 'ty', 'tyto', 'u', 'uz', 'v', 'vam', 'vami', 'vas', 'vase', 'vasi', 've', 'vedle', 'vice', 'vsak', 'vsechno', 'vy', 'vždy', 'z', 'za', 'zda', 'zde', 'ze', 'zpet', 'zpravy'];
    
    const words = query.toLowerCase().split(/\s+/);
    return words.filter(word => word.length > 2 && !stopwords.includes(word));
}

// Funkce pro filtrování relevantních dat podle dotazu
function filterRelevantData(query) {
    const keywords = extractKeywords(query);
    const filteredData = {};
    
    for (const tableId in tablesData) {
        const table = tablesData[tableId];
        const tableData = Array.isArray(table.data) ? table.data : 
                         (table.data?.items || []);
        
        if (!tableData.length) continue;
        
        // Filtrovat záznamy, které obsahují klíčová slova
        const relevantRecords = tableData.filter(record => {
            const recordStr = JSON.stringify(record).toLowerCase();
            return keywords.some(keyword => recordStr.includes(keyword));
        });
        
        // Pokud jsou relevantní záznamy, přidat je
        if (relevantRecords.length > 0) {
            filteredData[tableId] = {
                name: table.name,
                data: relevantRecords.slice(0, 20), // Max 20 záznamů na tabulku
                totalCount: tableData.length,
                filteredCount: relevantRecords.length
            };
        } else if (keywords.some(keyword => table.name.toLowerCase().includes(keyword))) {
            // Pokud název tabulky obsahuje klíčové slovo, přidat ukázku dat
            filteredData[tableId] = {
                name: table.name,
                data: tableData.slice(0, 10), // Max 10 záznamů
                totalCount: tableData.length,
                filteredCount: 10
            };
        }
    }
    
    // Pokud není nic relevantního, vrátit strukturu tabulek s minimem dat
    if (Object.keys(filteredData).length === 0) {
        for (const tableId in tablesData) {
            const table = tablesData[tableId];
            const tableData = Array.isArray(table.data) ? table.data : 
                             (table.data?.items || []);
            
            filteredData[tableId] = {
                name: table.name,
                data: tableData.slice(0, 5), // Jen 5 ukázkových záznamů
                totalCount: tableData.length,
                filteredCount: 5
            };
        }
    }
    
    return filteredData;
}

// UPRAVENÁ komunikace s OpenAI - používá filtrovaná data
async function callOpenAI(userMessages) {
    // Získat poslední uživatelský dotaz pro filtrování
    const lastUserMessage = [...userMessages].reverse().find(m => m.role === 'user');
    const currentQuery = lastUserMessage?.content || '';
    
    // Filtrovat relevantní data podle dotazu
    const relevantData = filterRelevantData(currentQuery);
    
    let systemPrompt = "Jsi asistent pro data z Tabidoo CRM. Odpovídej česky a stručně. ";
    systemPrompt += "Pracuješ s daty z databáze. Pokud potřebuješ více informací o konkrétním záznamu, ";
    systemPrompt += "požádej uživatele o upřesnění (např. ID nebo název).\n\n";
    
    systemPrompt += "Máš přístup k následujícím tabulkám:\n\n";
    
    // Přidat pouze relevantní data
    for (const tableId in relevantData) {
        const table = relevantData[tableId];
        systemPrompt += `## Tabulka: ${table.name} (ID: ${tableId})\n`;
        systemPrompt += `Celkový počet záznamů v tabulce: ${table.totalCount}\n`;
        systemPrompt += `Zobrazeno záznamů: ${table.filteredCount}\n\n`;
        
        if (table.data && table.data.length > 0) {
            // Zobrazit strukturu prvního záznamu
            const firstRecord = table.data[0];
            const fields = Object.keys(firstRecord);
            systemPrompt += `Pole v tabulce: ${fields.join(', ')}\n\n`;
            
            // Přidat data
            systemPrompt += "Data:\n";
            systemPrompt += JSON.stringify(table.data, null, 2) + "\n\n";
        }
    }
    
    // Omezit délku system promptu
    if (systemPrompt.length > 15000) {
        systemPrompt = systemPrompt.substring(0, 15000) + "\n\n[Data zkrácena kvůli limitu]";
    }
    
    // Omezit historii konverzace - pouze posledních 5 výměn
    const recentMessages = userMessages.slice(-10);
    
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
                model: "gpt-3.5-turbo-16k", // Změna na model s větším kontextem
                messages: apiMessages,
                temperature: 0.7,
                max_tokens: 1000
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'OpenAI API Error');
        }
        
        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        // Pokud stále překračujeme limit, zkusit ještě menší data
        if (error.message.includes('Request too large')) {
            console.log('Zkouším menší kontext...');
            
            // Ještě více zredukovat data
            const minimalPrompt = "Jsi asistent pro Tabidoo CRM. V databázi jsou tabulky: " +
                Object.values(relevantData).map(t => `${t.name} (${t.totalCount} záznamů)`).join(', ') +
                ". Odpověz stručně na dotaz.";
            
            const minimalMessages = [
                { role: "system", content: minimalPrompt },
                lastUserMessage
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
                    max_tokens: 500
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'OpenAI API Error');
            }
            
            const data = await response.json();
            return data.choices[0].message.content + "\n\n*[Odpověď byla zkrácena kvůli velikosti dat. Pro detailnější informace se ptejte na konkrétní záznamy.]*";
        }
        
        throw error;
    }
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
    
    const dataLoaded = await loadTabidooData();
    
    if (dataLoaded) {
        chatMessages.innerHTML = '';
        addMessage('system', 'Jsem připraven odpovídat na vaše dotazy ohledně dat z Tabidoo CRM.');
    } else {
        chatMessages.innerHTML = '';
        addMessage('error', 'Nepodařilo se načíst žádná data z Tabidoo. Zkontrolujte nastavení API.');
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
