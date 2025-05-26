// Inicializační a diagnostické funkce

// Test OpenAI API
async function testOpenAIAPI() {
    addDiagnosticMessage(CONFIG.DIAGNOSTICS.TESTING_OPENAI);
    
    try {
        const response = await fetch("https://api.openai.com/v1/models", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${APP_CONFIG.OPENAI_API_KEY}`
            }
        });
        
        if (response.ok) {
            addDiagnosticMessage(CONFIG.DIAGNOSTICS.OPENAI_SUCCESS, 'success');
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
    addDiagnosticMessage(CONFIG.DIAGNOSTICS.TESTING_TABIDOO);
    
    try {
        const url = `${CONFIG.API.TABIDOO.BASE_URL}/apps/${APP_CONFIG.TABIDOO_APP_ID}`;
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${APP_CONFIG.TABIDOO_API_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            addDiagnosticMessage(
                CONFIG.DIAGNOSTICS.TABIDOO_SUCCESS.replace('{appName}', data.name || APP_CONFIG.TABIDOO_APP_ID), 
                'success'
            );
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

// Diagnostický test všech tabulek
async function runDiagnostics() {
    const chatMessages = document.getElementById('chat-messages');
    chatMessages.innerHTML = `<div class="message system-message">${CONFIG.DIAGNOSTICS.TITLE}</div>`;
    
    // Test OpenAI
    const openaiOk = await testOpenAIAPI();
    
    // Test Tabidoo
    const tabidooOk = await testTabidooAPI();
    
    if (!openaiOk || !tabidooOk) {
        addDiagnosticMessage(CONFIG.DIAGNOSTICS.API_ERROR, 'error');
        
        const closeButton = document.createElement('button');
        closeButton.textContent = CONFIG.DIAGNOSTICS.CLOSE_BUTTON;
        closeButton.className = 'primary-btn';
        closeButton.style.margin = '20px auto';
        closeButton.style.display = 'block';
        closeButton.onclick = () => {
            chatMessages.innerHTML = '';
            addMessage('system', CONFIG.MESSAGES.WELCOME);
        };
        chatMessages.appendChild(closeButton);
        
        return false;
    }
    
    // Test tabulek
    addDiagnosticMessage(CONFIG.DIAGNOSTICS.TESTING_TABLES);
    let hasAnyData = false;
    
    for (const table of CONFIG.TABLES) {
        const data = await getTableData(table.id, table.name, true);
        if (data) {
            hasAnyData = true;
        }
    }
    
    if (!hasAnyData) {
        addDiagnosticMessage(CONFIG.DIAGNOSTICS.NO_DATA_WARNING, 'warning');
    }
    
    addDiagnosticMessage(CONFIG.DIAGNOSTICS.COMPLETED, 'success');
    
    const closeButton = document.createElement('button');
    closeButton.textContent = CONFIG.DIAGNOSTICS.CLOSE_BUTTON;
    closeButton.className = 'primary-btn';
    closeButton.style.margin = '20px auto';
    closeButton.style.display = 'block';
    closeButton.onclick = () => {
        init(true);
    };
    chatMessages.appendChild(closeButton);
    
    return true;
}

// Hlavní inicializace
async function init(skipDiagnostics = false) {
    console.log('Initializing...');
    
    if (typeof security === 'undefined') {
        console.error('Security manager not loaded!');
        setTimeout(() => init(skipDiagnostics), 100);
        return;
    }
    
    loadConfig();
    
    const chatMessages = document.getElementById('chat-messages');
    
    if (!APP_CONFIG.OPENAI_API_KEY || !APP_CONFIG.TABIDOO_API_TOKEN || !APP_CONFIG.TABIDOO_APP_ID) {
        chatMessages.innerHTML = '';
        addMessage('system', CONFIG.MESSAGES.WELCOME);
        
        document.getElementById('chat-input').addEventListener('keydown', function(event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
            }
        });
        return;
    }
    
    // Spustit diagnostiku při prvním spuštění
    if (!skipDiagnostics && !localStorage.getItem(CONFIG.CACHE.DIAGNOSTICS_KEY)) {
        const diagnosticsOk = await runDiagnostics();
        localStorage.setItem(CONFIG.CACHE.DIAGNOSTICS_KEY, 'true');
        return;
    }
    
    chatMessages.innerHTML = `<div class="message system-message">${CONFIG.MESSAGES.LOADING_DATA}</div>`;
    
    const dataLoaded = await loadTabidooData();
    
    if (dataLoaded) {
        chatMessages.innerHTML = '';
        
        // Zkontrolovat embeddings
        if (typeof checkEmbeddings !== 'undefined' && checkEmbeddings()) {
            embeddingsReady = true;
            addMessage('system', CONFIG.MESSAGES.SYSTEM_READY);
        } else if (typeof createEmbeddings !== 'undefined') {
            addMessage('system', CONFIG.MESSAGES.CREATING_INDEX);
            
            try {
                await createEmbeddings(tablesData, (progress) => {
                    console.log(`Progress: ${progress}%`);
                });
                embeddingsReady = true;
                addMessage('system', CONFIG.MESSAGES.INDEX_CREATED);
            } catch (error) {
                console.error('Chyba při vytváření embeddings:', error);
                addMessage('system', CONFIG.MESSAGES.INDEX_FAILED);
                embeddingsReady = false;
            }
        } else {
            embeddingsReady = false;
            addMessage('system', CONFIG.MESSAGES.SYSTEM_READY_BASIC);
        }
        
        setTimeout(() => {
            addMessage('assistant', CONFIG.MESSAGES.HELP_TEXT);
        }, 1000);
        
    } else {
        chatMessages.innerHTML = '';
        addMessage('error', CONFIG.MESSAGES.DATA_LOAD_ERROR);
    }
    
    document.getElementById('chat-input').addEventListener('keydown', function(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });
}
