// Zobrazování dat - ČISTÁ VERZE

let welcomeScreenHidden = false;

// Přidání zprávy do chatu
function addMessage(role, content) {
    console.log('Adding message:', role, content.substring(0, 100));
    
    // Skrýt welcome screen při první user/assistant zprávě
    if ((role === 'user' || role === 'assistant') && !welcomeScreenHidden) {
        hideWelcomeScreen();
    }
    
    const chatMessages = document.getElementById('chat-messages');
    const messageElement = document.createElement('div');
    messageElement.className = 'message ' + role + '-message';
    
    // Markdown pro tučný text
    if (role === 'assistant' && content.includes('**')) {
        content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        messageElement.innerHTML = content;
    } else {
        messageElement.textContent = content;
    }
    
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Uložit do historie
    if (role === 'user' || role === 'assistant') {
        messages.push({ role, content });
    }
}

// Welcome Screen Management
function hideWelcomeScreen() {
    const welcomeContainer = document.querySelector('.welcome-container');
    if (welcomeContainer && !welcomeScreenHidden) {
        welcomeContainer.style.display = 'none';
        welcomeScreenHidden = true;
    }
}

function showWelcomeScreen() {
    const chatMessages = document.getElementById('chat-messages');
    welcomeScreenHidden = false;
    
    chatMessages.innerHTML = `
        <div class="welcome-container">
            <div class="welcome-title">Tabidoo CRM Asistent</div>
            <div class="welcome-subtitle">Hybridní AI systém je připraven k použití</div>
            
            <div class="welcome-actions">
                <button class="welcome-action-btn help-btn" onclick="showSystemHelp()">
                    <span class="action-icon">💡</span>
                    <span class="action-text">Jak systém funguje</span>
                </button>
                <button class="welcome-action-btn examples-btn" onclick="toggleExamples()">
                    <span class="action-icon">🎯</span>
                    <span class="action-text">Příklady dotazů</span>
                </button>
            </div>
            
            <div class="example-queries" id="example-queries" style="display: none;">
                <!-- Příklady budou načteny dynamicky -->
            </div>
        </div>
    `;
    
    loadExampleQueries();
}

// System Help
function showSystemHelp() {
    const stats = getSystemStats();
    const helpContent = `
        <div class="system-help">
            <div class="help-header">
                <h3>🤖 Hybridní AI Systém</h3>
                <button class="help-close-btn" onclick="showWelcomeScreen()">×</button>
            </div>
            
            <div class="help-content">
                <div class="help-section">
                    <h4>🚀 Jak funguje</h4>
                    <p>Kombinuje <strong>rychlé lokální vyhledávání</strong> s <strong>inteligentní AI komunikací</strong>. 
                    Vaše data zpracovávám lokálně pro rychlost a přesnost, ChatGPT používám jen pro formulaci odpovědí.</p>
                </div>
                
                <div class="help-section">
                    <h4>✨ Klíčové výhody</h4>
                    <ul class="help-list">
                        <li><strong>Okamžité odpovědi</strong> - Žádné čekání na API</li>
                        <li><strong>100% přesnost</strong> - ${stats.companies} firem znamená přesně ${stats.companies}</li>
                        <li><strong>Inteligentní rozpoznávání</strong> - Rozumí různým tvarům slov</li>
                        <li><strong>Chytré vyhledávání</strong> - Najde "Alza" i když zadáte "alza"</li>
                    </ul>
                </div>
                
                <div class="help-section">
                    <h4>🎯 Co umím</h4>
                    <div class="capability-grid">
                        <div class="capability-item">
                            <span class="cap-icon">📊</span>
                            <div>
                                <strong>Počítání</strong>
                                <small>"Kolik firem máme?"</small>
                            </div>
                        </div>
                        <div class="capability-item">
                            <span class="cap-icon">📋</span>
                            <div>
                                <strong>Výpisy</strong>
                                <small>"Vypiš všechny kontakty"</small>
                            </div>
                        </div>
                        <div class="capability-item">
                            <span class="cap-icon">🔍</span>
                            <div>
                                <strong>Vyhledávání</strong>
                                <small>"Najdi firmu XYZ"</small>
                            </div>
                        </div>
                        <div class="capability-item">
                            <span class="cap-icon">🔗</span>
                            <div>
                                <strong>Souvislosti</strong>
                                <small>"Jaké aktivity má firma ABC?"</small>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="help-section">
                    <h4>📈 Vaše data</h4>
                    <div class="data-summary">
                        <div class="data-item">
                            <span class="data-count">${stats.companies}</span>
                            <span class="data-label">Firem</span>
                        </div>
                        <div class="data-item">
                            <span class="data-count">${stats.contacts}</span>
                            <span class="data-label">Kontaktů</span>
                        </div>
                        <div class="data-item">
                            <span class="data-count">${stats.activities}</span>
                            <span class="data-label">Aktivit</span>
                        </div>
                        <div class="data-item">
                            <span class="data-count">${stats.deals}</span>
                            <span class="data-label">Obchodů</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="help-footer">
                <button class="primary-btn" onclick="showWelcomeScreen()">Začít používat</button>
            </div>
        </div>
    `;
    
    const chatMessages = document.getElementById('chat-messages');
    chatMessages.innerHTML = helpContent;
}

// Example Queries
function toggleExamples() {
    const examples = document.getElementById('example-queries');
    const isHidden = examples.style.display === 'none';
    
    examples.style.display = isHidden ? 'grid' : 'none';
    
    const btn = document.querySelector('.examples-btn .action-text');
    if (btn) {
        btn.textContent = isHidden ? 'Skrýt příklady' : 'Příklady dotazů';
    }
}

function loadExampleQueries() {
    const exampleQueriesContainer = document.getElementById('example-queries');
    if (!exampleQueriesContainer) return;
    
    const examples = CONFIG.EXAMPLE_QUERIES || [];
    
    exampleQueriesContainer.innerHTML = examples.map(example => `
        <div class="example-query" onclick="clickExampleQuery('${example.text.replace(/'/g, "\\'")}')">
            <span class="example-query-icon">${example.icon}</span>
            ${example.text}
        </div>
    `).join('');
}

function clickExampleQuery(query) {
    const chatInput = document.getElementById('chat-input');
    chatInput.value = query;
    chatInput.focus();
    
    // Auto-resize textarea
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
    
    hideWelcomeScreen();
}

// Utilities
function getSystemStats() {
    if (window.hybridSystem && window.hybridSystem.getStats) {
        return window.hybridSystem.getStats();
    }
    
    // Fallback
    return {
        companies: 0,
        contacts: 0,
        activities: 0,
        deals: 0,
        total: 0
    };
}

function addDiagnosticMessage(text, status = 'info') {
    hideWelcomeScreen();
    
    const diagnosticArea = document.getElementById('chat-messages');
    const messageElement = document.createElement('div');
    messageElement.className = 'message diagnostic-message';
    
    let icon = '🔍';
    if (status === 'success') icon = '✅';
    if (status === 'error') icon = '❌';
    if (status === 'warning') icon = '⚠️';
    
    messageElement.innerHTML = `${icon} ${text}`;
    diagnosticArea.appendChild(messageElement);
    diagnosticArea.scrollTop = diagnosticArea.scrollHeight;
}

// Data formatting
function getDisplayValue(value, fieldName) {
    if (!value) return '';
    
    if (typeof value === 'object' && value.fields) {
        // Reference na jiný záznam
        if (value.fields.name) return value.fields.name;
        if (value.fields.nazev) return value.fields.nazev;
        if (value.fields.company) return value.fields.company;
        return 'Nepojmenovaný záznam';
    }
    
    if (typeof value === 'object' && value.href && value.isMailto) {
        return value.href.replace('mailto:', '');
    }
    
    if (Array.isArray(value)) {
        return value.map(item => getDisplayValue(item, fieldName)).join(', ');
    }
    
    return String(value);
}

function formatRecordsForDisplay(records, tableName, maxRecords = CONFIG.DISPLAY.MAX_RECORDS_TO_SHOW) {
    if (!records || records.length === 0) {
        return `Nenašel jsem žádné záznamy v tabulce ${tableName}.`;
    }
    
    let output = `**${tableName}** (celkem ${records.length} záznamů):\n\n`;
    
    const displayRecords = records.slice(0, maxRecords);
    
    displayRecords.forEach((record, index) => {
        output += `${index + 1}. `;
        
        const data = record.fields || record;
        const displayFields = [];
        
        // Prioritní pole
        const priorityFields = ['name', 'nazev', 'title', 'company', 'jmeno', 'prijmeni', 'email'];
        for (const fieldName of priorityFields) {
            if (data[fieldName]) {
                const value = getDisplayValue(data[fieldName], fieldName);
                if (value) {
                    const label = CONFIG.FIELD_MAPPINGS.FIELD_LABELS[fieldName] || fieldName;
                    displayFields.push(`${label}: ${value}`);
                    if (displayFields.length >= CONFIG.DISPLAY.PREVIEW_FIELDS_COUNT) break;
                }
            }
        }
        
        // Vypsat pole nebo ID
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

// Auto-resize textarea
function setupAutoResize() {
    const chatInput = document.getElementById('chat-input');
    if (!chatInput) return;
    
    chatInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });
    
    chatInput.addEventListener('keydown', function(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });
}

// Inicializace
document.addEventListener('DOMContentLoaded', function() {
    setupAutoResize();
});
