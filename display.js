// Funkce pro zobrazování dat

// Přidání zprávy do chatu
function addMessage(role, content) {
    console.log('Adding message:', role, content.substring(0, 100));
    
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

// Formátovat záznamy pro zobrazení
function formatRecordsForDisplay(records, tableName, maxRecords = CONFIG.DISPLAY.MAX_RECORDS_TO_SHOW) {
    if (!records || records.length === 0) {
        return `Nenašel jsem žádné záznamy v tabulce ${tableName}.`;
    }
    
    let output = `**${tableName}** (celkem ${records.length} záznamů):\n\n`;
    
    const displayRecords = records.slice(0, maxRecords);
    
    displayRecords.forEach((record, index) => {
        output += `${index + 1}. `;
        
        // Zjistit všechna pole záznamu
        const fields = Object.entries(record)
            .filter(([key, value]) => {
                return value && 
                       !CONFIG.FIELD_MAPPINGS.HIDDEN_FIELDS.some(hidden => key.includes(hidden));
            })
            .slice(0, CONFIG.DISPLAY.PREVIEW_FIELDS_COUNT);
        
        if (fields.length > 0) {
            const formattedFields = fields.map(([key, value]) => {
                // Použít label pokud existuje
                const label = CONFIG.FIELD_MAPPINGS.FIELD_LABELS[key] || key;
                
                // Zkrátit dlouhé hodnoty
                const displayValue = String(value).length > CONFIG.DISPLAY.MAX_FIELD_LENGTH ? 
                    String(value).substring(0, CONFIG.DISPLAY.MAX_FIELD_LENGTH) + '...' : value;
                
                return `${label}: ${displayValue}`;
            });
            output += formattedFields.join(', ');
        } else {
            // Pokud nejsou žádná pole, zobrazit ID
            output += `ID: ${record.id || 'neznámé'}`;
        }
        
        output += '\n';
    });
    
    if (records.length > maxRecords) {
        output += `\n... a dalších ${records.length - maxRecords} záznamů.`;
    }
    
    return output;
}
