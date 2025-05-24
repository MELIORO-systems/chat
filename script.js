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
    tablesData = {};
    
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

// Analyzovat typ dotazu
function analyzeQueryType(query) {
    const lowerQuery = query.toLowerCase();
    
    // Systémové dotazy
    if (lowerQuery.includes('verz') || lowerQuery.includes('gpt') || lowerQuery.includes('model') ||
        lowerQuery.includes('kdo jsi') || lowerQuery.includes('co umíš')) {
        return 'system';
    }
    
    // Analytické dotazy
    if (lowerQuery.includes('kolik') || lowerQuery.includes('počet') || lowerQuery.includes('součet') ||
        lowerQuery.includes('průměr') || lowerQuery.includes('celkem') || lowerQuery.includes('statistik')) {
        return 'analytics';
    }
    
    // Vyhledávací dotazy
    if (lowerQuery.includes('najdi') || lowerQuery.includes('vyhledej') || lowerQuery.includes('ukáž') ||
        lowerQuery.includes('seznam') || lowerQuery.includes('zobraz')) {
        return 'search';
    }
    
    // Výchozí je analytics (pro otázky o datech)
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
        const tableData = Array.isArray(table.data) ? table.data : (table.data?.items || []);
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
    
    // Specifické analýzy podle dotazu
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
    
    // Pokud není specifický dotaz, zobrazit vše
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
    
    console.log('Fallback search for terms:', searchTerms);
    
    for (const tableId in tablesData) {
        const table = tablesData[tableId];
        const tableData = Array.isArray(table.data) ? table.data : (table.data?.items || []);
        
        for (const record of tableData) {
            const recordText = JSON.stringify(record).toLowerCase();
            let score = 0;
            
            // Spočítat skóre podle počtu nalezených termínů
            for (const term of searchTerms) {
                if (recordText.includes(term)) {
                    score += 1;
                    
                    // Bonus za shodu v důležitých polích
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
    
    console.log(`Fallback search found ${results.length} results`);
    
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
        
        // Systémové dotazy - odpovědět přímo
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
        
        // Analytické dotazy - analyzovat data lokálně
        if (queryType === 'analytics') {
            const analysis = analyzeDataForQuery(query);
            
            // Pokud máme dobrou lokální odpověď, použít ji
            if (analysis && analysis.length > 20) {
                return analysis;
            }
            
            // Jinak zkusit GPT s kontextem
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
        
        // Vyhledávací dotazy - použít embeddings nebo fallback
        if (queryType === 'search') {
            let relevantData;
            
            if (embeddingsReady) {
                relevantData = await findRelevantData(query, 10);
            } else {
                relevantData = fallbackTextSearch(query, 10);
            }
            
            if (relevantData.length === 0) {
                // Zkusit ještě jednoduché vyhledávání
                const searchTerm = query.split(' ').pop().toLowerCase();
                relevantData = fallbackTextSearch(searchTerm, 5);
                
                if (relevantData.length === 0) {
                    return `Nenašel jsem žádné záznamy odpovídající "${query}".\n\nTip: Zkuste zadat konkrétní jméno, email nebo název firmy.`;
                }
            }
            
            // Formátovat výsledky
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
                    
                    // Prioritní pole pro zobrazení
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
        
        // Obecný dotaz - zkusit odpovědět pomocí GPT s kontextem
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
        
        // Pokud je chyba s API klíčem
        if (error.message.includes('Incorrect API key')) {
            return 'Chyba: Neplatný OpenAI API klíč. Zkontrolujte nastavení.';
        }
        
        // Pokud je jiná chyba, zkusit alespoň základní odpověď
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
