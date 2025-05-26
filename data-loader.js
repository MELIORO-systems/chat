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

// Načtení dat z cache nebo API
async function loadTabidooData() {
    const cachedData = localStorage.getItem(CONFIG.CACHE.DATA_KEY);
    const cacheTimestamp = localStorage.getItem(CONFIG.CACHE.DATA_TIMESTAMP_KEY);
    
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
            localStorage.removeItem(CONFIG.CACHE.DATA_KEY);
            localStorage.removeItem(CONFIG.CACHE.DATA_TIMESTAMP_KEY);
        }
    }
    
    console.log('Načítám data z Tabidoo API...');
    tablesData = {};
    
    for (const table of CONFIG.TABLES) {
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
        localStorage.setItem(CONFIG.CACHE.DATA_KEY, JSON.stringify(tablesData));
        localStorage.setItem(CONFIG.CACHE.DATA_TIMESTAMP_KEY, Date.now().toString());
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

// Obnovení dat
async function refreshData() {
    if (!confirm('Opravdu chcete znovu načíst data z Tabidoo? Toto smaže cache a vyhledávací index.')) {
        return;
    }
    
    localStorage.removeItem(CONFIG.CACHE.DATA_KEY);
    localStorage.removeItem(CONFIG.CACHE.DATA_TIMESTAMP_KEY);
    localStorage.removeItem(CONFIG.CACHE.EMBEDDINGS_KEY);
    localStorage.removeItem(CONFIG.CACHE.EMBEDDINGS_TIMESTAMP_KEY);
    
    location.reload();
}
