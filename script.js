// Globální proměnné
let CONFIG = {};
let tablesData = {};
let messages = [];
let embeddingsReady = false;

// Načtení konfigurace - BEZPEČNÁ VERZE
function loadConfig() {
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

// Uložení nastavení
function saveSettings() {
    const openaiKey = document.getElementById('openai-key').value.trim();
    const tabidooToken = document.getElementById('tabidoo-token').value.trim();
    const tabidooAppId = document.getElementById('tabidoo-app-id').value.trim();
    
    console.log('Saving settings...');
    
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

// Přidání diagnostické zprávy
function addDiagnosticMessage(text, status = 'info') {
    const diagnosticArea = document.getElementById('chat-messages');
    const messageElement = document.createElement('div');
    messageElement.className = 'message diagnostic-message';
    
    let icon = '🔍';
    if (status === 'success') icon = '✅';
    if (status === 'error') icon = '❌';
    if (status === 'warning') icon = '⚠️';
    
    messageElement.innerHTML = `${icon} ${text}`;
    diagnosticArea.appendChild(messageElement);
}

// Test OpenAI API
async function testOpenAIAPI() {
    addDiagnosticMessage('Testuji OpenAI API klíč...');
    
    try {
        const response = await fetch("https://api.openai.com/v1/models", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${CONFIG.OPENAI_API_KEY}`
            }
        });
        
        if (response.ok) {
            addDiagnosticMessage('OpenAI API klíč je platný', 'success');
            return true;
        } else {
            const error = await response.json();
            addDiagnosticMessage(`OpenAI API chyba: ${error.error?.message || 'Neplatný klíč'}`, 'error');
            return false;
        }
    } catch (error) {
        addDiagnosticMessage(`OpenAI API nedostupné: ${error.message}`, 'error');
        return false;
    }
}

// Test Tabidoo API
async function testTabidooAPI() {
    addDiagnosticMessage('Testuji Tabidoo API token...');
    
    try {
        const url = `https://app.tabidoo.cloud/api/v2/apps/${CONFIG.TABIDOO_APP_ID}`;
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${CONFIG.TABIDOO_API_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            addDiagnosticMessage(`Tabidoo API funguje - aplikace: ${data.name || CONFIG.TABIDOO_APP_ID}`, 'success');
            return true;
        } else {
            addDiagnosticMessage(`Tabidoo API chyba: ${response.status} ${response.statusText}`, 'error');
            return false;
        }
    } catch (error) {
        addDiagnosticMessage(`Tabidoo API nedostupné: ${error.message}`, 'error');
        return false;
    }
}

// Získání dat z Tabidoo s diagnostikou
async function getTableData(tableId, tableName, isDiagnostic = false) {
    try {
        if (isDiagnostic) {
            addDiagnosticMessage(`Načítám tabulku ${tableName}...`);
        }
        
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
            if (isDiagnostic) {
                addDiagnosticMessage(`Tabulka ${tableName}: Chyba ${response.status}`, 'error');
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`Data for ${tableName}:`, data);
        
        // Určit počet záznamů
        let recordCount = 0;
        if (Array.isArray(data)) {
            recordCount = data.length;
        } else if (data.items && Array.isArray(data.items)) {
            recordCount = data.items.length;
        } else if (data.data && Array.isArray(data.data)) {
            recordCount = data.data.length;
        } else if (data.records && Array.isArray(data.records)) {
            recordCount = data.records.length;
        }
        
        if (isDiagnostic) {
            if (recordCount > 0) {
                addDiagnosticMessage(`Tabulka ${tableName}: ${recordCount} záznamů`, 'success');
            } else {
                addDiagnosticMessage(`Tabulka ${tableName}: 0 záznamů`, 'warning');
            }
        }
        
        return data;
    } catch (error) {
        console.error(`Chyba při získávání dat tabulky ${tableName}:`, error);
        if (isDiagnostic) {
            addDiagnosticMessage(`Tabulka ${tableName}: Nepodařilo se načíst`, 'error');
        }
        return null;
    }
}

// Diagnostický test všech tabulek
async function runDiagnostics() {
    const chatMessages = document.getElementById('chat-messages');
    chatMessages.innerHTML = '<div class="message system-message">🔧 Spouštím diagnostiku systému...</div>';
    
    // Test OpenAI
    const openaiOk = await testOpenAIAPI();
    
    // Test Tabidoo
    const tabidooOk = await testTabidooAPI();
    
    if (!openaiOk || !tabidooOk) {
        addDiagnosticMessage('Některé API klíče nejsou správně nastaveny. Zkontrolujte nastavení.', 'error');
        
        // Přidat tlačítko pro zavření diagnostiky
        const closeButton = document.createElement('button');
        closeButton.textContent = 'Zavřít diagnostiku a přejít do chatu';
        closeButton.className = 'primary-btn';
        closeButton.style.margin = '20px auto';
        closeButton.style.display = 'block';
        closeButton.onclick = () => {
            chatMessages.innerHTML = '';
            addMessage('system', '⚙️ Pro správnou funkci nastavte API klíče v nastavení (ikona ⚙️).');
        };
        chatMessages.appendChild(closeButton);
        
        return false;
    }
    
    // Test tabulek
    addDiagnosticMessage('Testuji přístup k tabulkám...');
    let hasAnyData = false;
    
    for (const table of TABLES) {
        const data = await getTableData(table.id, table.name, true);
        if (data) {
            hasAnyData = true;
        }
    }
    
    if (!hasAnyData) {
        addDiagnosticMessage('Žádná tabulka neobsahuje data', 'warning');
    }
    
    addDiagnosticMessage('Diagnostika dokončena!', 'success');
    
    // Přidat tlačítko pro zavření diagnostiky
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Zavřít diagnostiku a pokračovat';
    closeButton.className = 'primary-btn';
    closeButton.style.margin = '20px auto';
    closeButton.style.display = 'block';
    closeButton.onclick = () => {
        init(true); // Spustit init bez diagnostiky
    };
    chatMessages.appendChild(closeButton);
    
    return true;
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
            return true;
        } catch (error) {
            console.error('Chyba při načítání dat z cache:', error);
            localStorage.removeItem('tabidoo_data');
            localStorage.removeItem('tabidoo_data_timestamp');
        }
    }
    
    console.log('Načítám data z Tabidoo API...');
    tablesData = {};
    
    for (const table of TABLES) {
        try {
            const data = await getTableData(table.id, table.name, false);
            
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
        return true;
    }
    
    return false;
}

// Získat skutečná data z tabulky
function getActualTableData(table) {
    if (Array.isArray(table.data)) {
        return table.data;
    } else if (table.data?.items && Array.isArray(table.data.items)) {
        return table.data.items;
    } else if (table.data?.data && Array.isArray(table.data.data)) {
        return table.data.data;
    } else if (table.data?.records && Array.isArray(table.data.records)) {
        return table.data.records;
    }
    return [];
}

// Analyzovat typ dotazu
function analyzeQueryType(query) {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('verz') || lowerQuery.includes('gpt') || lowerQuery.includes('model') ||
        lowerQuery.includes('kdo jsi') || lowerQuery.includes('co umíš')) {
        return 'system';
    }
    
    if (lowerQuery.includes('kolik') || lowerQuery.includes('počet') || lowerQuery.includes('součet') ||
        lowerQuery.includes('průměr') || lowerQuery.includes('celkem') || lowerQuery.includes('statistik')) {
        return 'analytics';
    }
    
    if (lowerQuery.includes('najdi') || lowerQuery.includes('vyhledej') || lowerQuery.includes('ukáž') ||
        lowerQuery.includes('seznam') || lowerQuery.includes('zobraz')) {
        return 'search';
    }
    
    return 'analytics';
}

// Získat statistiky dat
function getDataStatistics() {
    const stats = {
        totalRecords: 0,
        byTable: {}
    };
    
    for (const tableId in tablesData) {
        const table = tablesData[tableId];
        const tableData = getActualTableData(table);
        const count = tableData.length;
        
        stats.totalRecords += count;
        stats.byTable[table.name] = count;
    }
    
    return stats;
}

// Analyzovat data pro odpověď
function analyzeDataForQuery(query) {
    const lowerQuery = query.toLowerCase();
    const stats = getDataStatistics();
    let analysis = "";
    
    if (lowerQuery.includes('fir')) {
        const firmy = stats.byTable['Firma'] || 0;
        analysis = `V databázi máte celkem ${firmy} firem.\n`;
    }
    
    if (lowerQuery.includes('kontakt')) {
        const kontakty = stats.byTable['Kontakty'] || 0;
        analysis += `V databázi máte celkem ${kontakty} kontaktů.\n`;
    }
    
    if (lowerQuery.includes('aktiv')) {
        const aktivity = stats.byTable['Aktivity'] || 0;
        analysis += `V databázi máte celkem ${aktivity} aktivit.\n`;
    }
    
    if (lowerQuery.includes('obchod') || lowerQuery.includes('případ')) {
        const obchody = stats.byTable['Obchodní případy'] || 0;
        analysis += `V databázi máte celkem ${obchody} obchodních případů.\n`;
    }
    
    if (!analysis) {
        analysis = "Přehled dat v databázi:\n\n";
        for (const [tableName, count] of Object.entries(stats.byTable)) {
            analysis += `• ${tableName}: ${count} záznamů\n`;
        }
        analysis += `\nCelkem: ${stats.totalRecords} záznamů`;
    }
    
    return analysis;
}

// Fallback textové vyhledávání
function fallbackTextSearch(query, topK = 5) {
    const results = [];
    const searchTerms = query.toLowerCase().split(' ').filter(t => t.length > 1);
    
    for (const tableId in tablesData) {
        const table = tablesData[tableId];
        const tableData = getActualTableData(table);
        
        for (const record of tableData) {
            const recordText = JSON.stringify(record).toLowerCase();
            let score = 0;
            
            for (const term of searchTerms) {
                if (recordText.includes(term)) {
                    score += 1;
                    
                    const importantFields = ['name', 'nazev', 'jmeno', 'prijmeni', 'email', 'firma'];
                    for (const field of importantFields) {
                        if (record[field] && String(record[field]).toLowerCase().includes(term)) {
                            score += 2;
                        }
                    }
                }
            }
            
            if (score > 0) {
                results.push({
                    tableId: tableId,
                    tableName: table.name,
                    record: record,
                    similarity: score / searchTerms.length
                });
            }
        }
    }
    
    return results
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK);
}

// Smart volání OpenAI
async function smartCallOpenAI(query) {
    console.log('Smart call OpenAI for query:', query);
    
    try {
        const queryType = analyzeQueryType(query);
        console.log('Query type:', queryType);
        
        if (queryType === 'system') {
            const systemResponses = {
                'verz': 'Používám model GPT-3.5-turbo od OpenAI. Jsem asistent pro práci s vašimi daty z Tabidoo CRM.',
                'gpt': 'Používám model GPT-3.5-turbo, což je rychlý a efektivní model od OpenAI.',
                'model': 'Můj model je GPT-3.5-turbo. Pro vyhledávání používám embeddings model text-embedding-ada-002.',
                'kdo': 'Jsem AI asistent specializovaný na práci s vašimi daty z Tabidoo CRM. Umím vyhledávat, analyzovat a odpovídat na dotazy o vašich datech.',
                'umíš': 'Umím:\n• Vyhledávat v datech (např. "najdi kontakt Jana")\n• Analyzovat data (např. "kolik máme firem")\n• Odpovídat na dotazy o datech\n• Filtrovat a třídit záznamy'
            };
            
            for (const [key, response] of Object.entries(systemResponses)) {
                if (query.toLowerCase().includes(key)) {
                    return response;
                }
            }
            
            return 'Jsem AI asistent pro Tabidoo CRM. Používám model GPT-3.5-turbo.';
        }
        
        if (queryType === 'analytics') {
            const analysis = analyzeDataForQuery(query);
            
            if (analysis && analysis.length > 20) {
                return analysis;
            }
            
            const stats = getDataStatistics();
            const context = `Statistiky databáze:\n${JSON.stringify(stats, null, 2)}`;
            
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
                            content: "Jsi asistent pro Tabidoo CRM. Odpovídej na základě poskytnutých statistik. Odpovídej stručně česky."
                        },
                        {
                            role: "user",
                            content: `${context}\n\nDotaz: ${query}`
                        }
                    ],
                    temperature: 0.3,
                    max_tokens: 200
                })
            });
            
            if (!response.ok) {
                return analysis || 'Nepodařilo se analyzovat data.';
            }
            
            const data = await response.json();
            return data.choices[0].message.content;
        }
        
        if (queryType === 'search') {
            let relevantData;
            
            if (embeddingsReady) {
                relevantData = await findRelevantData(query, 10);
            } else {
                relevantData = fallbackTextSearch(query, 10);
            }
            
            if (relevantData.length === 0) {
                const searchTerm = query.split(' ').pop().toLowerCase();
                relevantData = fallbackTextSearch(searchTerm, 5);
                
                if (relevantData.length === 0) {
                    return `Nenašel jsem žádné záznamy odpovídající "${query}".\n\nTip: Zkuste zadat konkrétní jméno, email nebo název firmy.`;
                }
            }
            
            let response = `Našel jsem ${relevantData.length} relevantních záznamů:\n\n`;
            
            const grouped = {};
            for (const item of relevantData.slice(0, 10)) {
                if (!grouped[item.tableName]) {
                    grouped[item.tableName] = [];
                }
                grouped[item.tableName].push(item.record);
            }
            
            for (const [tableName, records] of Object.entries(grouped)) {
                response += `**${tableName}:**\n`;
                for (const record of records.slice(0, 5)) {
                    const info = [];
                    
                    const displayFields = ['name', 'nazev', 'jmeno', 'prijmeni', 'email', 'telefon', 'firma'];
                    for (const field of displayFields) {
                        if (record[field]) {
                            info.push(`${field}: ${record[field]}`);
                        }
                    }
                    
                    if (info.length > 0) {
                        response += `• ${info.slice(0, 3).join(', ')}\n`;
                    }
                }
                response += '\n';
            }
            
            return response;
        }
        
        const stats = getDataStatistics();
        const context = `Máš přístup k databázi Tabidoo CRM s těmito tabulkami: ${Object.keys(stats.byTable).join(', ')}. Celkem ${stats.totalRecords} záznamů.`;
        
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
                        content: `Jsi asistent pro Tabidoo CRM. ${context} Odpovídej stručně česky.`
                    },
                    {
                        role: "user",
                        content: query
                    }
                ],
                temperature: 0.7,
                max_tokens: 300
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'OpenAI API Error');
        }
        
        const data = await response.json();
        return data.choices[0].message.content;
        
    } catch (error) {
        console.error('Smart search error:', error);
        
        if (error.message.includes('Incorrect API key')) {
            return 'Chyba: Neplatný OpenAI API klíč. Zkontrolujte nastavení.';
        }
        
        return `Omlouvám se, nastala chyba při zpracování dotazu.\n\nZkuste se zeptat jinak nebo použijte konkrétní příkazy jako:\n• "kolik máme firem"\n• "najdi kontakty"\n• "ukáž aktivity"`;
    }
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
    
    if (!CONFIG.OPENAI_API_KEY || !CONFIG.TABIDOO_API_TOKEN) {
        alert('Nejprve nastavte API klíče v nastavení!');
        toggleSettings();
        return;
    }
    
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
async function init(skipDiagnostics = false) {
    console.log('Initializing...');
    
    if (typeof security === 'undefined') {
        console.error('Security manager not loaded!');
        setTimeout(() => init(skipDiagnostics), 100);
        return;
    }
    
    loadConfig();
    
    const chatMessages = document.getElementById('chat-messages');
    
    if (!CONFIG.OPENAI_API_KEY || !CONFIG.TABIDOO_API_TOKEN || !CONFIG.TABIDOO_APP_ID) {
        chatMessages.innerHTML = '';
        addMessage('system', '⚙️ Vítejte! Pro začátek nastavte API klíče v nastavení (ikona ⚙️ vpravo nahoře).');
        
        document.getElementById('chat-input').addEventListener('keydown', function(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
               event.preventDefault();
               sendMessage();
           }
       });
       return;
   }
   
   // Spustit diagnostiku při prvním spuštění
   if (!skipDiagnostics && !localStorage.getItem('diagnostics_completed')) {
       const diagnosticsOk = await runDiagnostics();
       localStorage.setItem('diagnostics_completed', 'true');
       return;
   }
   
   chatMessages.innerHTML = '<div class="message system-message">Načítám data...</div>';
   
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
               addMessage('system', '⚠️ Používám základní vyhledávání.');
               embeddingsReady = false;
           }
       } else {
           embeddingsReady = true;
           addMessage('system', '✓ Systém je připraven k inteligentnímu vyhledávání.');
       }
       
       setTimeout(() => {
           addMessage('assistant', 
               'Můžete se ptát na cokoliv z vašich dat. Například:\n' +
               '• "Kolik máme firem?"\n' +
               '• "Najdi kontakty"\n' +
               '• "Jakou verzi GPT používáš?"\n' +
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
   setTimeout(init, 100);
};
