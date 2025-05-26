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

// Pomocná funkce pro získání zobrazitelné hodnoty z pole
function getDisplayValue(value, fieldName) {
    // Pokud je hodnota null nebo undefined
    if (value === null || value === undefined) {
        return '';
    }
    
    // Pokud je to objekt s fields (reference na jiný záznam)
    if (typeof value === 'object' && value.fields) {
        // Prioritní pole pro zobrazení osoby
        if (value.fields.name && value.fields.surname) {
            return `${value.fields.name} ${value.fields.surname}`;
        }
        // Název firmy nebo obecný název
        if (value.fields.name) {
            return value.fields.name;
        }
        if (value.fields.nazev) {
            return value.fields.nazev;
        }
        if (value.fields.company) {
            return value.fields.company;
        }
        if (value.fields.title) {
            return value.fields.title;
        }
        // Pokud nic z toho není, zkusit první neprázdnou hodnotu
        for (const [key, val] of Object.entries(value.fields)) {
            if (val && typeof val !== 'object' && !key.startsWith('_')) {
                return String(val);
            }
        }
        return 'Nepojmenovaný záznam';
    }
    
    // Pokud je to objekt s count (kolekce záznamů)
    if (typeof value === 'object' && typeof value.count === 'number') {
        const label = fieldName || 'záznamů';
        return `${value.count} ${label}`;
    }
    
    // Pokud je to email objekt
    if (typeof value === 'object' && value.href && value.isMailto) {
        return value.href.replace('mailto:', '');
    }
    
    // Pokud je to pole
    if (Array.isArray(value)) {
        return value.map(item => getDisplayValue(item, fieldName)).join(', ');
    }
    
    // Pokud je to jiný objekt
    if (typeof value === 'object') {
        // Zkusit převést na string, ale pouze pokud to dává smysl
        const str = JSON.stringify(value);
        if (str.length < 50) {
            return str;
        }
        return '[složitý objekt]';
    }
    
    // Pro jednoduché hodnoty
    return String(value);
}

// Formátovat záznamy pro zobrazení - UPRAVENÁ VERZE
function formatRecordsForDisplay(records, tableName, maxRecords = CONFIG.DISPLAY.MAX_RECORDS_TO_SHOW) {
    if (!records || records.length === 0) {
        return `Nenašel jsem žádné záznamy v tabulce ${tableName}.`;
    }
    
    let output = `**${tableName}** (celkem ${records.length} záznamů):\n\n`;
    
    const displayRecords = records.slice(0, maxRecords);
    
    displayRecords.forEach((record, index) => {
        output += `${index + 1}. `;
        
        // Získat zobrazitelná pole
        const displayFields = [];
        
        // Nejdřív zkusit prioritní pole
        const priorityFields = ['name', 'nazev', 'title', 'company', 'jmeno', 'prijmeni', 'email'];
        for (const fieldName of priorityFields) {
            if (record[fieldName]) {
                const value = getDisplayValue(record[fieldName], fieldName);
                if (value) {
                    const label = CONFIG.FIELD_MAPPINGS.FIELD_LABELS[fieldName] || fieldName;
                    displayFields.push(`${label}: ${value}`);
                }
            }
        }
        
        // Pokud máme fields objekt, zpracovat i ten
        if (record.fields) {
            for (const fieldName of priorityFields) {
                if (record.fields[fieldName] && !displayFields.some(f => f.includes(fieldName))) {
                    const value = getDisplayValue(record.fields[fieldName], fieldName);
                    if (value) {
                        const label = CONFIG.FIELD_MAPPINGS.FIELD_LABELS[fieldName] || fieldName;
                        displayFields.push(`${label}: ${value}`);
                    }
                }
            }
        }
        
        // Přidat další důležitá pole pokud ještě nejsou zobrazena
        const additionalFields = ['owner', 'status', 'type', 'category'];
        for (const fieldName of additionalFields) {
            const fieldData = record[fieldName] || (record.fields && record.fields[fieldName]);
            if (fieldData && displayFields.length < CONFIG.DISPLAY.PREVIEW_FIELDS_COUNT) {
                const value = getDisplayValue(fieldData, fieldName);
                if (value && !displayFields.some(f => f.includes(value))) {
                    const label = CONFIG.FIELD_MAPPINGS.FIELD_LABELS[fieldName] || fieldName;
                    displayFields.push(`${label}: ${value}`);
                }
            }
        }
        
        // Pokud stále nemáme žádná pole, zobrazit první dostupná
        if (displayFields.length === 0) {
            const fieldsToCheck = record.fields || record;
            const entries = Object.entries(fieldsToCheck)
                .filter(([key, value]) => {
                    return value && 
                           !CONFIG.FIELD_MAPPINGS.HIDDEN_FIELDS.some(hidden => key.includes(hidden)) &&
                           !key.startsWith('_');
                })
                .slice(0, CONFIG.DISPLAY.PREVIEW_FIELDS_COUNT);
            
            for (const [key, value] of entries) {
                const displayValue = getDisplayValue(value, key);
                if (displayValue) {
                    const label = CONFIG.FIELD_MAPPINGS.FIELD_LABELS[key] || key;
                    displayFields.push(`${label}: ${displayValue}`);
                }
            }
        }
        
        // Vypsat pole nebo alespoň ID
        if (displayFields.length > 0) {
            output += displayFields.join(', ');
        } else {
            output += `ID: ${record.id || 'neznámé'}`;
        }
        
        output += '\n';
    });
    
    if (records.length > maxRecords) {
        output += `\n... a dalších ${records.length - maxRecords} záznamů.`;
    }
    
    return output;
}
