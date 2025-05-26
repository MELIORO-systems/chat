// Analytické funkce

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
