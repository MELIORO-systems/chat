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

// Funkce pro obnovení dat z Tabidoo
async function refreshData() {
    if (!confirm('Opravdu chcete znovu načíst data z Tabidoo? Toto smaže cache a vyhledávací index.')) {
        return;
    }
    
    // Smazat vše včetně embeddings
    localStorage.removeItem('tabidoo_data');
    localStorage.removeItem('tabidoo_data_timestamp');
    localStorage.removeItem('tabidoo_embeddings');
    localStorage.removeItem('tabidoo_embeddings_timestamp');
    
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

// Smart volání OpenAI s relevantními daty
async function smartCallOpenAI(query) {
   try {
       // Najít relevantní data pomocí embeddings
       const relevantData = await findRelevantData(query, 10); // Top 10 výsledků
       
       if (relevantData.length === 0) {
           return "Nenašel jsem žádné relevantní záznamy k vašemu dotazu.";
       }
       
       // Připravit kontext s relevantními daty
       let context = "Relevantní data z databáze:\n\n";
       
       // Seskupit podle tabulek
       const groupedData = {};
       for (const item of relevantData) {
           if (!groupedData[item.tableName]) {
               groupedData[item.tableName] = [];
           }
           groupedData[item.tableName].push(item);
       }
       
       // Formátovat data
       for (const [tableName, items] of Object.entries(groupedData)) {
           context += `### ${tableName}:\n`;
           for (const item of items.slice(0, 3)) { // Max 3 záznamy na tabulku
               // Zobrazit pouze důležité informace
               const record = item.record;
               const summary = [];
               
               // Prioritní pole
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
       
       // Volat OpenAI s kontextem
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
           throw new Error(error.error?.message || 'OpenAI API Error');
       }
       
       const data = await response.json();
       let answer = data.choices[0].message.content;
       
       // Přidat informaci o relevanci
       answer += `\n\n_Nalezeno ${relevantData.length} relevantních záznamů (zobrazena nejrelevantnější data)._`;
       
       return answer;
       
   } catch (error) {
       console.error('Smart search error:', error);
       
       // Fallback na jednoduché zobrazení výsledků
       const results = fallbackTextSearch(query, 5);
       if (results && results.length > 0) {
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

// Odeslání zprávy - upravená verze
async function sendMessage() {
   const chatInput = document.getElementById('chat-input');
   const sendButton = document.getElementById('send-button');
   const messageText = chatInput.value.trim();
   
   if (!messageText) {
       return;
   }
   
   // Kontrola, zda jsou nastaveny API klíče
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
       // Použít smart search
       const response = await smartCallOpenAI(messageText);
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

// Inicializace při načtení stránky - upravená
async function init() {
   loadConfig();
   
   const chatMessages = document.getElementById('chat-messages');
   
   // Pokud nejsou nastaveny API klíče, zobrazit pouze upozornění
   if (!CONFIG.OPENAI_API_KEY || !CONFIG.TABIDOO_API_TOKEN || !CONFIG.TABIDOO_APP_ID) {
       chatMessages.innerHTML = '';
       addMessage('system', '⚙️ Vítejte! Pro začátek nastavte API klíče v nastavení (ikona ⚙️ vpravo nahoře).');
       return;
   }
   
   chatMessages.innerHTML = '<div class="message system-message">Načítám data...</div>';
   
   // Načíst data
   const dataLoaded = await loadTabidooData();
   
   if (dataLoaded) {
       chatMessages.innerHTML = '';
       
       // Zkontrolovat embeddings
       if (!checkEmbeddings()) {
           addMessage('system', 'Vytvářím vyhledávací index pro rychlé a přesné vyhledávání...');
           
           try {
               await createEmbeddings(tablesData, (progress) => {
                   console.log(`Progress: ${progress}%`);
               });
               embeddingsReady = true;
               addMessage('system', '✓ Vyhledávací index vytvořen! Systém je připraven.');
           } catch (error) {
               console.error('Chyba při vytváření embeddings:', error);
               addMessage('error', 'Nepodařilo se vytvořit vyhledávací index. Bude použito základní vyhledávání.');
           }
       } else {
           embeddingsReady = true;
           addMessage('system', '✓ Systém je připraven k inteligentnímu vyhledávání.');
       }
       
       // Přidat nápovědu
       setTimeout(() => {
           addMessage('assistant', 
               'Můžete se ptát na cokoliv z vašich dat. Například:\n' +
               '• "Najdi všechny kontakty z Prahy"\n' +
               '• "Jaké máme aktivní obchodní případy?"\n' +
               '• "Ukáž mi firmy s více než 10 zaměstnanci"\n' +
               '• "Kdo má narozeniny tento měsíc?"'
           );
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
