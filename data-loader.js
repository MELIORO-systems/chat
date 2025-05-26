// Načítání dat z Tabidoo - ČISTÁ VERZE

// Získání dat z konkrétní tabulky
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
                addDiagnosticMessage(CONFIG.DIAGNOSTICS.TABLE_ERROR.replace('{tableName}', tableName), 'error');
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`Data for ${tableName}:`, data);
        
        // Určit počet záznamů
        const recordCount = getRecordCount(data);
        
        if (isDiagnostic) {
            if (recordCount > 0) {
                addDiagnosticMessage(
                    CONFIG.DIAGNOSTICS.TABLE_SUCCESS
                        .replace('{tableName}', tableName)
                        .replace('{count}', recordCount), 
                    'success'
                );
            } else {
                addDiagnosticMessage(`Tabulka ${tableName}: 0 záznamů`, 'warning');
            }
        }
        
        return data;
        
    } catch (error) {
        console.error(`Chyba při získávání dat tabulky ${tableName}:`, error);
        if (isDiagnostic) {
            addDiagnosticMessage(CONFIG.DIAGNOSTICS.TABLE_ERROR.replace('{tableName}', tableName), 'error');
        }
        return null;
    }
}

// Načtení všech dat z Tabidoo
async function loadTabidooData() {
    // Kontrola cache
    const cachedData = localStorage.getItem(CONFIG.CACHE.DATA_KEY);
    const cacheTimestamp = localStorage.getItem(CONFIG.CACHE.DATA_TIMESTAMP_KEY);
    
    if (cachedData && cacheTimestamp) {
        const cacheAge = Date.now() - parseInt(cacheTimestamp);
        const cacheAgeHours = cacheAge / (1000 * 60 * 60);
        
        // Použít cache pokud je mladší než 24 hodin
        if (cacheAgeHours < 24) {
            try {
                tablesData = JSON.parse(cachedData);
                console.log('Data načtena z cache, stáří:', cacheAgeHours.toFixed(1), 'hodin');
                console.log('Loaded tables:', Object.keys(tablesData));
                return true;
            } catch (error) {
                console.error('Chyba při načítání dat z cache:', error);
                // Pokračovat s načítáním z API
            }
        }
    }
    
    // Načíst nová data z API
    console.log('Načítám data z Tabidoo API...');
    tablesData = {};
    let successCount = 0;
    
    for (const table of CONFIG.TABLES) {
        try {
            const data = await getTableData(table.id, table.name, false);
            
            if (data) {
                tablesData[table.id] = {
                    name: table.name,
                    data: data
                };
                
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
    
    // Uložit do cache pokud máme alespoň nějaká data
    if (successCount > 0) {
        const timestamp = Date.now();
        localStorage.setItem(CONFIG.CACHE.DATA_KEY, JSON.stringify(tablesData));
        localStorage.setItem(CONFIG.CACHE.DATA_TIMESTAMP_KEY, timestamp.toString());
        
        console.log(`✓ Data uložena do cache (${successCount}/${CONFIG.TABLES.length} tabulek úspěšně)`);
        return true;
    } else {
        console.error('✗ Nepodařilo se načíst žádná data');
        return false;
    }
}

// Pomocné funkce
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
    if (!confirm('Opravdu chcete znovu načíst data z Tabidoo?')) {
        return;
    }
    
    // Vymazat cache
    localStorage.removeItem(CONFIG.CACHE.DATA_KEY);
    localStorage.removeItem(CONFIG.CACHE.DATA_TIMESTAMP_KEY);
    
    location.reload();
}
