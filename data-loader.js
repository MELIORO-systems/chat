// Funkce pro načítání a správu dat

// Získání dat z Tabidoo
async function getTableData(tableId, tableName, isDiagnostic = false) {
    try {
        if (isDiagnostic) {
            addDiagnosticMessage(CONFIG.DIAGNOSTICS.LOADING_TABLE.replace('{tableName}', tableName));
        }
        
        const url = `${CONFIG.API.TABIDOO.BASE_URL}/apps/${APP_CONFIG.TABIDOO_APP_ID}/tables/${tableId}/data?limit=${CONFIG.API.TABIDOO.RECORDS_LIMIT}`;
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${APP_CONFIG.TABIDOO_API_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`HTTP error! status: ${response.status}, body: ${errorText}`);
            if (isDiagnostic) {
                addDiagnosticMessage(
                    CONFIG.DIAGNOSTICS.TABLE_ERROR.replace('{tableName}', tableName), 
                    'error'
                );
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
                addDiagnosticMessage(
                    CONFIG.DIAGNOSTICS.TABLE_SUCCESS
                        .replace('{tableName}', tableName)
                        .replace('{count}', recordCount), 
                    'success'
                );
            } else {
                addDiagnosticMessage(
                    CONFIG.DIAGNOSTICS.TABLE_WARNING.replace('{tableName}', tableName), 
                    'warning'
                );
            }
        }
        
        return data;
    } catch (error) {
        console.error(`Chyba při získávání dat tabulky ${tableName}:`, error);
        if (isDiagnostic) {
            addDiagnosticMessage(
                CONFIG.DIAGNOSTICS.TABLE_ERROR.replace('{tableName}', tableName), 
                'error'
            );
        }
        return null;
    }
}

// UPRAVENÁ FUNKCE - Načtení dat s inteligentním cache managementem
async function loadTabidooData() {
    const cachedData = localStorage.getItem(CONFIG.CACHE.DATA_KEY);
    const cacheTimestamp = localStorage.getItem(CONFIG.CACHE.DATA_TIMESTAMP_KEY);
    
    // Kontrola, zda je cache platná
    const shouldRefreshCache = checkCacheValidity(cacheTimestamp);
    
    if (cachedData && cacheTimestamp && !shouldRefreshCache) {
        const cacheAge = Date.now() - parseInt(cacheTimestamp);
        const cacheAgeHours = cacheAge / (1000 * 60 * 60);
        
        try {
            tablesData = JSON.parse(cachedData);
            console.log('Data načtena z cache, stáří:', cacheAgeHours.toFixed(1), 'hodin');
            console.log('Loaded tables:', Object.keys(tablesData));
            return true;
        } catch (error) {
            console.error('Chyba při načítání dat z cache:', error);
            localStorage.removeItem(CONFIG.CACHE.DATA_KEY);
            localStorage.removeItem(CONFIG.CACHE.DATA_TIMESTAMP_KEY);
        }
    }
    
    // Cache je neplatná nebo neexistuje - načíst nová data
    console.log('Načítám nová data z Tabidoo API...');
    return await fetchFreshData();
}

// NOVÁ FUNKCE - Kontrola platnosti cache
function checkCacheValidity(cacheTimestamp) {
    if (!cacheTimestamp) {
        return true; // Žádná cache - musíme načíst nová data
    }
    
    const cacheAge = Date.now() - parseInt(cacheTimestamp);
    const cacheAgeHours = cacheAge / (1000 * 60 * 60);
    
    // Automatické obnovení každých 24 hodin
    if (cacheAgeHours > 24) {
        console.log(`Cache je příliš stará (${cacheAgeHours.toFixed(1)} hodin), obnovuji...`);
        return true;
    }
    
    // Kontrola, zda je dnes pracovní den a je čas pro obnovení
    const now = new Date();
    const isWeekday = now.getDay() >= 1 && now.getDay() <= 5; // Pondělí-Pátek
    const currentHour = now.getHours();
    
    // Pracovní dny: obnovit po 8 hodinách mezi 7:00-18:00
    if (isWeekday && currentHour >= 7 && currentHour <= 18 && cacheAgeHours > 8) {
        console.log('Pracovní den - obnovuji cache po 8 hodinách');
        return true;
    }
    
    // Víkendy: obnovit pouze pokud je cache starší než 48 hodin
    if (!isWeekday && cacheAgeHours > 48) {
        console.log('Víkend - obnovuji cache po 48 hodinách');
        return true;
    }
    
    return false; // Cache je platná
}

// NOVÁ FUNKCE - Načtení nových dat z API
async function fetchFreshData() {
    tablesData = {};
    let successCount = 0;
    
    console.log('Začínám načítání dat z Tabidoo...');
    
    for (const table of CONFIG.TABLES) {
        try {
            console.log(`Načítám tabulku: ${table.name}`);
            const data = await getTableData(table.id, table.name, false);
            
            if (data) {
                tablesData[table.id] = {
                    name: table.name,
                    data: data
                };
                
                // Logování počtu záznamů
                const recordCount = getRecordCount(data);
                console.log(`✓ Tabulka ${table.name} načtena: ${recordCount} záznamů`);
                successCount++;
            } else {
                console.warn(`⚠ Tabulka ${table.name} se nepodařila načíst`);
            }
        } catch (error) {
            console.error(`✗ Chyba při načítání tabulky ${table.name}:`, error);
        }
    }
    
    // Uložit data pouze pokud se podařilo načíst alespoň nějaká data
    if (successCount > 0) {
        const timestamp = Date.now();
        localStorage.setItem(CONFIG.CACHE.DATA_KEY, JSON.stringify(tablesData));
        localStorage.setItem(CONFIG.CACHE.DATA_TIMESTAMP_KEY, timestamp.toString());
        
        console.log(`✓ Data uložena do cache (${successCount}/${CONFIG.TABLES.length} tabulek úspěšně)`);
        
        // Invalidovat embeddings cache, protože máme nová data
        invalidateEmbeddingsCache();
        
        return true;
    } else {
        console.error('✗ Nepodařilo se načíst žádná data');
        return false;
    }
}

// NOVÁ FUNKCE - Spočítat počet záznamů v datech
function getRecordCount(data) {
    if (Array.isArray(data)) {
        return data.length;
    } else if (data?.items && Array.isArray(data.items)) {
        return data.items.length;
    } else if (data?.data && Array.isArray(data.data)) {
        return data.data.length;
    } else if (data?.records && Array.isArray(data.records)) {
        return data.records.length;
    }
    return 0;
}

// NOVÁ FUNKCE - Invalidace embeddings cache
function invalidateEmbeddingsCache() {
    localStorage.removeItem('tabidoo_embeddings');
    localStorage.removeItem('tabidoo_embeddings_timestamp');
    console.log('Embeddings cache invalidována kvůli novým datům');
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

// UPRAVENÁ FUNKCE - Obnovení dat s uživatelským potvrzením
async function refreshData() {
    const lastRefresh = localStorage.getItem(CONFIG.CACHE.DATA_TIMESTAMP_KEY);
    let refreshMessage = 'Opravdu chcete znovu načíst data z Tabidoo?\n\nToto smaže cache a vyhledávací index.';
    
    if (lastRefresh) {
        const lastRefreshDate = new Date(parseInt(lastRefresh));
        const cacheAge = Date.now() - parseInt(lastRefresh);
        const cacheAgeHours = cacheAge / (1000 * 60 * 60);
        
        refreshMessage += `\n\nPosledně aktualizováno: ${lastRefreshDate.toLocaleString('cs-CZ')} (před ${cacheAgeHours.toFixed(1)} hodinami)`;
    }
    
    if (!confirm(refreshMessage)) {
        return;
    }
    
    // Vymazat všechny cache
    clearAllCache();
    
    // Zobrazit loading zprávu
    const chatMessages = document.getElementById('chat-messages');
    chatMessages.innerHTML = '<div class="message system-message">Obnovuji data z Tabidoo...</div>';
    
    // Načíst nová data
    const success = await fetchFreshData();
    
    if (success) {
        // Úspěch - reload stránky pro reinicializaci
        location.reload();
    } else {
        // Chyba - zobrazit chybovou zprávu
        chatMessages.innerHTML = '<div class="message error-message">Chyba při načítání dat. Zkontrolujte připojení a API nastavení.</div>';
    }
}

// NOVÁ FUNKCE - Vymazání všech cache
function clearAllCache() {
    // Data cache
    localStorage.removeItem(CONFIG.CACHE.DATA_KEY);
    localStorage.removeItem(CONFIG.CACHE.DATA_TIMESTAMP_KEY);
    
    // Embeddings cache
    localStorage.removeItem('tabidoo_embeddings');
    localStorage.removeItem('tabidoo_embeddings_timestamp');
    
    // Diagnostics cache
    localStorage.removeItem(CONFIG.CACHE.DIAGNOSTICS_KEY);
    
    console.log('Všechny cache vymazány');
}

// NOVÁ FUNKCE - Získání informací o cache
function getCacheInfo() {
    const dataTimestamp = localStorage.getItem(CONFIG.CACHE.DATA_TIMESTAMP_KEY);
    const embeddingsTimestamp = localStorage.getItem('tabidoo_embeddings_timestamp');
    
    const info = {
        hasData: !!dataTimestamp,
        hasEmbeddings: !!embeddingsTimestamp,
        dataAge: null,
        embeddingsAge: null,
        dataLastUpdate: null,
        embeddingsLastUpdate: null
    };
    
    if (dataTimestamp) {
        const dataDate = new Date(parseInt(dataTimestamp));
        info.dataAge = (Date.now() - parseInt(dataTimestamp)) / (1000 * 60 * 60); // hodiny
        info.dataLastUpdate = dataDate.toLocaleString('cs-CZ');
    }
    
    if (embeddingsTimestamp) {
        const embeddingsDate = new Date(parseInt(embeddingsTimestamp));
        info.embeddingsAge = (Date.now() - parseInt(embeddingsTimestamp)) / (1000 * 60 * 60); // hodiny
        info.embeddingsLastUpdate = embeddingsDate.toLocaleString('cs-CZ');
    }
    
    return info;
}

// NOVÁ FUNKCE - Automatická kontrola a obnovení dat při spuštění
async function checkAndRefreshDataOnStartup() {
    const cacheInfo = getCacheInfo();
    
    console.log('Cache info na startupu:', cacheInfo);
    
    // Pokud nemáme žádná data, načíst je
    if (!cacheInfo.hasData) {
        console.log('Žádná data v cache - načítám nová data');
        return await fetchFreshData();
    }
    
    // Pokud jsou data velmi stará (více než 7 dní), automaticky obnovit
    if (cacheInfo.dataAge > 24 * 7) {
        console.log('Data jsou příliš stará (více než 7 dní) - automaticky obnovuji');
        return await fetchFreshData();
    }
    
    // Pokud je pracovní den a data jsou starší než 24 hodin, navrhnout obnovení
    const now = new Date();
    const isWeekday = now.getDay() >= 1 && now.getDay() <= 5;
    const currentHour = now.getHours();
    
    if (isWeekday && currentHour >= 8 && currentHour <= 17 && cacheInfo.dataAge > 24) {
        console.log('Pracovní doba a stará data - zvažuji obnovení');
        // Můžeme zde přidat logiku pro automatické obnovení nebo notifikaci uživatele
    }
    
    return true; // Data jsou v pořádku
}
