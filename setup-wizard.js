// Setup Wizard - Průvodce nastavením pro Tabidoo aplikace - OPRAVENÁ VERZE

class SetupWizard {
    constructor() {
        this.currentStep = 0;
        this.config = {
            appId: '',
            apiToken: '',
            openaiKey: '',
            tables: [],
            entityMappings: {},
            exampleQueries: []
        };
        this.detectedTables = [];
    }

    // Spustit průvodce
    async start() {
        console.log('🧙‍♂️ Starting Setup Wizard...');
        
        // Skrýt hlavní chat
        document.getElementById('chat-messages').innerHTML = '';
        document.getElementById('chat-input-area').style.display = 'none';
        
        // Zobrazit wizard
        this.showStep(0);
    }

    // Zobrazit konkrétní krok
    showStep(stepNumber) {
        this.currentStep = stepNumber;
        const chatMessages = document.getElementById('chat-messages');
        
        switch (stepNumber) {
            case 0:
                this.showWelcomeStep(chatMessages);
                break;
            case 1:
                this.showApiKeysStep(chatMessages);
                break;
            case 2:
                this.showLoadingStep(chatMessages);
                break;
            case 3:
                this.showTablesStep(chatMessages);
                break;
            case 4:
                this.showEntityMappingStep(chatMessages);
                break;
            case 5:
                this.showExamplesStep(chatMessages);
                break;
            case 6:
                this.showCompletionStep(chatMessages);
                break;
        }
    }

    // Krok 0: Uvítání - OPRAVENO s tlačítkem Zrušit
    showWelcomeStep(container) {
        container.innerHTML = `
            <div class="wizard-container">
                <div class="wizard-header">
                    <h2>Průvodce nastavením</h2>
                    <p>Pomůžu vám nastavit Tabidoo CRM Asistenta pro vaši aplikaci</p>
                </div>
                
                <div class="wizard-content">
                    <div class="wizard-features">
                        <div class="feature-item">
                            <div>
                                <strong>Automatická detekce</strong>
                                <p>Zjistím strukturu vaší Tabidoo aplikace</p>
                            </div>
                        </div>
                        <div class="feature-item">
                            <div>
                                <strong>Inteligentní mapování</strong>
                                <p>Navrhu, jak pracovat s vašimi daty</p>
                            </div>
                        </div>
                        <div class="feature-item">
                            <div>
                                <strong>Rychlé nastavení</strong>
                                <p>Za 2 minuty budete moci začít používat asistenta</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="wizard-actions start">
                    <button class="wizard-btn cancel" onclick="cancelSetupWizard()">
                        Zrušit
                    </button>
                    <button class="wizard-btn primary" onclick="setupWizard.nextStep()">
                        Začít nastavení
                    </button>
                </div>
            </div>
        `;
    }

    // Krok 1: API klíče
    showApiKeysStep(container) {
        container.innerHTML = `
            <div class="wizard-container">
                <div class="wizard-header">
                    <div class="wizard-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: 20%"></div>
                        </div>
                        <span class="progress-text">Krok 1 z 5</span>
                    </div>
                    <h2>API přístupové údaje</h2>
                    <p>Potřebuji přístup k vaší Tabidoo aplikaci a OpenAI</p>
                </div>
                
                <div class="wizard-content">
                    <div class="wizard-form">
                        <div class="form-group">
                            <label for="wizard-tabidoo-app-id">
                                Tabidoo App ID
                            </label>
                            <input type="text" id="wizard-tabidoo-app-id" 
                                   placeholder="např. CRM Start" 
                                   value="${this.config.appId}">
                            <small>Název vaší aplikace v Tabidoo</small>
                        </div>
                        
                        <div class="form-group">
                            <label for="wizard-tabidoo-token">
                                Tabidoo API Token
                            </label>
                            <div class="input-with-toggle">
                                <input type="password" id="wizard-tabidoo-token" 
                                       placeholder="eyJ..." 
                                       value="${this.config.apiToken}">
                                <button type="button" class="toggle-btn" onclick="this.togglePasswordVisibility('wizard-tabidoo-token')">Zobrazit</button>
                            </div>
                            <small>Najdete v Tabidoo → Nastavení → API</small>
                        </div>
                        
                        <div class="form-group">
                            <label for="wizard-openai-key">
                                OpenAI API klíč
                            </label>
                            <div class="input-with-toggle">
                                <input type="password" id="wizard-openai-key" 
                                       placeholder="sk-..." 
                                       value="${this.config.openaiKey}">
                                <button type="button" class="toggle-btn" onclick="this.togglePasswordVisibility('wizard-openai-key')">Zobrazit</button>
                            </div>
                            <small>Získejte na <a href="https://platform.openai.com/api-keys" target="_blank">platform.openai.com</a></small>
                        </div>
                    </div>
                </div>
                
                <div class="wizard-actions">
                    <button class="wizard-btn cancel" onclick="cancelSetupWizard()">
                        Zrušit
                    </button>
                    <button class="wizard-btn primary" onclick="setupWizard.validateAndNext()">
                        Pokračovat
                    </button>
                </div>
            </div>
        `;
    }

    // Krok 2: Načítání dat
    showLoadingStep(container) {
        container.innerHTML = `
            <div class="wizard-container">
                <div class="wizard-header">
                    <div class="wizard-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: 40%"></div>
                        </div>
                        <span class="progress-text">Krok 2 z 5</span>
                    </div>
                    <h2>Analyza aplikace</h2>
                    <p>Zjišťuji strukturu vaší Tabidoo aplikace...</p>
                </div>
                
                <div class="wizard-content">
                    <div class="loading-animation">
                        <div class="spinner"></div>
                        <div class="loading-steps">
                            <div class="loading-step active" id="step-connect">
                                <span class="step-text">Připojuji se k Tabidoo API</span>
                            </div>
                            <div class="loading-step" id="step-tables">
                                <span class="step-text">Načítám seznam tabulek</span>
                            </div>
                            <div class="loading-step" id="step-analyze">
                                <span class="step-text">Analyzuji strukturu dat</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="wizard-actions center">
                    <button class="wizard-btn cancel" onclick="cancelSetupWizard()">
                        Zrušit
                    </button>
                </div>
            </div>
        `;
        
        // Spustit načítání dat
        this.loadTabidooData();
    }

    // Krok 3: Zobrazení nalezených tabulek
    showTablesStep(container) {
        container.innerHTML = `
            <div class="wizard-container">
                <div class="wizard-header">
                    <div class="wizard-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: 60%"></div>
                        </div>
                        <span class="progress-text">Krok 3 z 5</span>
                    </div>
                    <h2>Nalezené tabulky</h2>
                    <p>Našel jsem tyto tabulky ve vaší aplikaci. Vyberte, které chcete použít:</p>
                </div>
                
                <div class="wizard-content">
                    <div class="tables-grid">
                        ${this.detectedTables.map((table, index) => `
                            <div class="table-card ${table.selected ? 'selected' : ''}" 
                                 onclick="setupWizard.toggleTable(${index})">
                                <div class="table-card-header">
                                    <input type="checkbox" ${table.selected ? 'checked' : ''} 
                                           onchange="setupWizard.toggleTable(${index})">
                                    <h3>${table.name}</h3>
                                </div>
                                <div class="table-card-content">
                                    <div class="table-stats">
                                        <span class="stat">${table.recordCount} záznamů</span>
                                        <span class="stat">${table.fieldCount} polí</span>
                                    </div>
                                    <div class="table-fields">
                                        <strong>Hlavní pole:</strong>
                                        <div class="field-tags">
                                            ${table.mainFields.slice(0, 4).map(field => 
                                                `<span class="field-tag">${field}</span>`
                                            ).join('')}
                                            ${table.mainFields.length > 4 ? '<span class="field-tag more">+' + (table.mainFields.length - 4) + '</span>' : ''}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="wizard-actions">
                    <button class="wizard-btn cancel" onclick="cancelSetupWizard()">
                        Zrušit
                    </button>
                    <button class="wizard-btn primary" onclick="setupWizard.nextStep()" 
                            ${this.getSelectedTablesCount() === 0 ? 'disabled' : ''}>
                        Pokračovat (${this.getSelectedTablesCount()} tabulek)
                    </button>
                </div>
            </div>
        `;
    }

    // Krok 4: Mapování entit
    showEntityMappingStep(container) {
        const selectedTables = this.detectedTables.filter(table => table.selected);
        
        container.innerHTML = `
            <div class="wizard-container">
                <div class="wizard-header">
                    <div class="wizard-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: 80%"></div>
                        </div>
                        <span class="progress-text">Krok 4 z 5</span>
                    </div>
                    <h2>Mapování entit</h2>
                    <p>Pomozte mi pochopit, co jednotlivé tabulky reprezentují:</p>
                </div>
                
                <div class="wizard-content">
                    <div class="entity-mapping">
                        ${selectedTables.map((table, index) => `
                            <div class="mapping-card">
                                <div class="mapping-header">
                                    <h3>${table.name}</h3>
                                    <span class="record-count">${table.recordCount} záznamů</span>
                                </div>
                                
                                <div class="mapping-content">
                                    <div class="mapping-question">
                                        <label>Co tato tabulka reprezentuje?</label>
                                        <div class="entity-options">
                                            ${this.getEntityOptions(table).map(option => `
                                                <label class="entity-option">
                                                    <input type="radio" name="entity-${index}" value="${option.value}"
                                                           ${option.selected ? 'checked' : ''}
                                                           onchange="setupWizard.setEntityType(${index}, '${option.value}')">
                                                    <span class="option-text">${option.label}</span>
                                                </label>
                                            `).join('')}
                                        </div>
                                    </div>
                                    
                                    <div class="mapping-keywords">
                                        <label>Jak se má entita nazývat? (pro vyhledávání)</label>
                                        <input type="text" 
                                               placeholder="např. firem, společností, klientů..."
                                               value="${table.keywords || ''}"
                                               onchange="setupWizard.setKeywords(${index}, this.value)">
                                        <small>Zadejte slova, kterými budete tabulku hledat</small>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="wizard-actions">
                    <button class="wizard-btn cancel" onclick="cancelSetupWizard()">
                        Zrušit
                    </button>
                    <button class="wizard-btn primary" onclick="setupWizard.nextStep()">
                        Pokračovat
                    </button>
                </div>
            </div>
        `;
    }

    // Krok 5: Příklady dotazů
    showExamplesStep(container) {
        container.innerHTML = `
            <div class="wizard-container">
                <div class="wizard-header">
                    <div class="wizard-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: 100%"></div>
                        </div>
                        <span class="progress-text">Krok 5 z 5</span>
                    </div>
                    <h2>Příklady dotazů</h2>
                    <p>Vygeneroval jsem příklady dotazů pro vaši aplikaci. Můžete je upravit:</p>
                </div>
                
                <div class="wizard-content">
                    <div class="examples-editor">
                        <div class="examples-grid">
                            ${this.config.exampleQueries.map((example, index) => `
                                <div class="example-card">
                                    <div class="example-header">
                                        <button class="remove-btn" onclick="setupWizard.removeExample(${index})">×</button>
                                    </div>
                                    <textarea class="example-text" 
                                              onchange="setupWizard.updateExample(${index}, 'text', this.value)"
                                              placeholder="Příklad dotazu...">${example.text}</textarea>
                                </div>
                            `).join('')}
                            
                            <div class="example-card add-new" onclick="setupWizard.addExample()">
                                <div class="add-text">Přidat příklad</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="wizard-actions">
                    <button class="wizard-btn cancel" onclick="cancelSetupWizard()">
                        Zrušit
                    </button>
                    <button class="wizard-btn primary" onclick="setupWizard.completeSetup()">
                        Dokončit nastavení
                    </button>
                </div>
            </div>
        `;
    }

    // Krok 6: Dokončení
    showCompletionStep(container) {
        container.innerHTML = `
            <div class="wizard-container">
                <div class="wizard-header">
                    <h2>Nastavení dokončeno!</h2>
                    <p>Váš Tabidoo CRM Asistent je připraven k použití</p>
                </div>
                
                <div class="wizard-content">
                    <div class="completion-summary">
                        <div class="summary-item">
                            <div>
                                <strong>${this.getSelectedTablesCount()} tabulek nakonfigurováno</strong>
                                <p>${this.detectedTables.filter(t => t.selected).map(t => t.name).join(', ')}</p>
                            </div>
                        </div>
                        
                        <div class="summary-item">
                            <div>
                                <strong>${this.config.exampleQueries.length} příkladů dotazů</strong>
                                <p>Připravených pro rychlé použití</p>
                            </div>
                        </div>
                        
                        <div class="summary-item">
                            <div>
                                <strong>Hybridní systém aktivní</strong>
                                <p>Rychlé lokální vyhledávání + AI komunikace</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="wizard-actions center">
                    <button class="wizard-btn primary large" onclick="setupWizard.startUsingApp()">
                        Začít používat asistenta
                    </button>
                </div>
            </div>
        `;
    }

    // === HELPER FUNKCE ===

    togglePasswordVisibility(inputId) {
        const input = document.getElementById(inputId);
        const button = input.nextElementSibling;
        if (input.type === 'password') {
            input.type = 'text';
            button.textContent = 'Skrýt';
        } else {
            input.type = 'password';
            button.textContent = 'Zobrazit';
        }
    }

    async validateAndNext() {
        // Získat hodnoty z formuláře
        this.config.appId = document.getElementById('wizard-tabidoo-app-id').value.trim();
        this.config.apiToken = document.getElementById('wizard-tabidoo-token').value.trim();
        this.config.openaiKey = document.getElementById('wizard-openai-key').value.trim();

        // Validace
        if (!this.config.appId || !this.config.apiToken) {
            alert('Vyplňte prosím všechna povinná pole (App ID a API token)');
            return;
        }

        // Uložit do localStorage
        security.saveSecure('tabidoo_app_id', this.config.appId);
        security.saveSecure('tabidoo_token', this.config.apiToken);
        if (this.config.openaiKey) {
            security.saveSecure('openai_key', this.config.openaiKey);
        }

        this.nextStep();
    }

    async loadTabidooData() {
        try {
            // Animace kroků
            await this.animateLoadingStep('step-connect');
            
            // Test připojení k Tabidoo API
            const appResponse = await fetch(`https://app.tabidoo.cloud/api/v2/apps/${this.config.appId}`, {
                headers: {
                    'Authorization': `Bearer ${this.config.apiToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!appResponse.ok) {
                throw new Error('Nepodařilo se připojit k Tabidoo API');
            }

            await this.animateLoadingStep('step-tables');

            // Získat seznam tabulek
            const appData = await appResponse.json();
            const tablesResponse = await fetch(`https://app.tabidoo.cloud/api/v2/apps/${this.config.appId}/tables`, {
                headers: {
                    'Authorization': `Bearer ${this.config.apiToken}`,
                    'Content-Type': 'application/json'
                }
            });

            const tablesData = await tablesResponse.json();
            
            await this.animateLoadingStep('step-analyze');

            // Analyzovat každou tabulku
            this.detectedTables = [];
            for (const table of tablesData) {
                const tableAnalysis = await this.analyzeTable(table);
                if (tableAnalysis) {
                    this.detectedTables.push(tableAnalysis);
                }
            }

            // Pokračovat na další krok
            setTimeout(() => {
                this.nextStep();
            }, 1000);

        } catch (error) {
            console.error('Error loading Tabidoo data:', error);
            alert('Chyba při načítání dat: ' + error.message);
            // Přidat možnost zrušit i při chybě
            const container = document.getElementById('chat-messages');
            container.innerHTML += `
                <div class="wizard-actions center" style="margin-top: 20px;">
                    <button class="wizard-btn cancel" onclick="cancelSetupWizard()">
                        Zrušit a vrátit se zpět
                    </button>
                </div>
            `;
        }
    }

    async animateLoadingStep(stepId) {
        return new Promise(resolve => {
            const step = document.getElementById(stepId);
            if (step) {
                step.classList.add('active');
                setTimeout(resolve, 800);
            } else {
                resolve();
            }
        });
    }

    async analyzeTable(tableInfo) {
        try {
            // Získat vzorková data z tabulky
            const dataResponse = await fetch(
                `https://app.tabidoo.cloud/api/v2/apps/${this.config.appId}/tables/${tableInfo.id}/data?limit=5`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.config.apiToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!dataResponse.ok) {
                return null;
            }

            const data = await dataResponse.json();
            const records = Array.isArray(data) ? data : (data.data || data.items || []);

            if (records.length === 0) {
                return null;
            }

            // Analyzovat strukturu
            const sampleRecord = records[0];
            const fields = sampleRecord.fields || sampleRecord;
            const mainFields = Object.keys(fields)
                .filter(key => !key.startsWith('_') && fields[key])
                .slice(0, 8);

            return {
                id: tableInfo.id,
                name: tableInfo.name || tableInfo.id,
                recordCount: records.length,
                fieldCount: mainFields.length,
                mainFields: mainFields,
                selected: true, // Defaultně vybrané
                suggestedType: this.suggestEntityType(tableInfo.name, mainFields),
                keywords: this.suggestKeywords(tableInfo.name)
            };

        } catch (error) {
            console.error(`Error analyzing table ${tableInfo.id}:`, error);
            return null;
        }
    }

    suggestEntityType(tableName, fields) {
        const name = tableName.toLowerCase();
        const fieldsStr = fields.join(' ').toLowerCase();

        if (name.includes('customer') || name.includes('client') || name.includes('firm') || 
            fieldsStr.includes('company') || fieldsStr.includes('email')) {
            return 'company';
        }
        if (name.includes('contact') || name.includes('person') || name.includes('user') ||
            fieldsStr.includes('firstname') || fieldsStr.includes('jmeno')) {
            return 'contact';
        }
        if (name.includes('deal') || name.includes('sale') || name.includes('order') ||
            name.includes('obchod') || name.includes('prodej')) {
            return 'deal';
        }
        if (name.includes('task') || name.includes('activity') || name.includes('event') ||
            name.includes('aktivit') || name.includes('ukol')) {
            return 'activity';
        }

        return 'other';
    }

    suggestKeywords(tableName) {
        const suggestions = {
            'customers': 'zákazník, zákazníků, klient, klientů',
            'companies': 'firma, firem, společnost, společností',
            'contacts': 'kontakt, kontaktů, osoba, osob',
            'deals': 'obchod, obchodů, prodej, prodeje',
            'activities': 'aktivita, aktivit, úkol, úkolů',
            'projects': 'projekt, projektů',
            'tasks': 'úkol, úkolů, task, tasků'
        };

        const name = tableName.toLowerCase();
        for (const [key, value] of Object.entries(suggestions)) {
            if (name.includes(key) || key.includes(name)) {
                return value;
            }
        }

        return tableName.toLowerCase();
    }

    getEntityOptions(table) {
        const options = [
            { value: 'company', label: 'Firmy/Společnosti' },
            { value: 'contact', label: 'Kontakty/Osoby' },
            { value: 'deal', label: 'Obchody/Prodeje' },
            { value: 'activity', label: 'Aktivity/Úkoly' },
            { value: 'project', label: 'Projekty' },
            { value: 'product', label: 'Produkty' },
            { value: 'other', label: 'Jiné' }
        ];

        return options.map(option => ({
            ...option,
            selected: option.value === table.suggestedType
        }));
    }

    toggleTable(index) {
        this.detectedTables[index].selected = !this.detectedTables[index].selected;
        this.showStep(3); // Refresh step
    }

    getSelectedTablesCount() {
        return this.detectedTables.filter(table => table.selected).length;
    }

    setEntityType(tableIndex, entityType) {
        this.detectedTables[tableIndex].entityType = entityType;
    }

    setKeywords(tableIndex, keywords) {
        this.detectedTables[tableIndex].keywords = keywords;
    }

    generateExampleQueries() {
        this.config.exampleQueries = [];
        const selectedTables = this.detectedTables.filter(table => table.selected);

        for (const table of selectedTables) {
            const entityType = table.entityType || table.suggestedType;
            const keywords = table.keywords || table.name.toLowerCase();
            const firstKeyword = keywords.split(',')[0].trim();

            // Přidat příklad počítání
            this.config.exampleQueries.push({
                text: `Kolik ${firstKeyword} je v systému?`
            });

            // Přidat příklad výpisu
            this.config.exampleQueries.push({
                text: `Vypiš všechny ${firstKeyword.replace('ů', 'y').replace('í', 'e')}`
            });
        }

        // Přidat obecné příklady
        if (this.config.exampleQueries.length < 6) {
            this.config.exampleQueries.push({
                text: 'Najdi záznam XYZ'
            });
        }

        // Omezit na 6 příkladů
        this.config.exampleQueries = this.config.exampleQueries.slice(0, 6);
    }

    updateExample(index, field, value) {
        if (this.config.exampleQueries[index]) {
            this.config.exampleQueries[index][field] = value;
        }
    }

    removeExample(index) {
        this.config.exampleQueries.splice(index, 1);
        this.showStep(5); // Refresh
    }

    addExample() {
        this.config.exampleQueries.push({
            text: 'Nový příklad dotazu'
        });
        this.showStep(5); // Refresh
    }

    async completeSetup() {
        try {
            // Vygenerovat konfiguraci
            const finalConfig = this.generateFinalConfig();

            // Uložit do localStorage
            localStorage.setItem('tabidoo_wizard_config', JSON.stringify(finalConfig));
            localStorage.setItem('tabidoo_wizard_completed', 'true');

            this.nextStep();

        } catch (error) {
            console.error('Error completing setup:', error);
            alert('Chyba při dokončování nastavení: ' + error.message);
        }
    }

    generateFinalConfig() {
        const selectedTables = this.detectedTables.filter(table => table.selected);

        return {
            appId: this.config.appId,
            tables: selectedTables.map(table => ({
                id: table.id,
                name: table.name,
                type: table.entityType || table.suggestedType,
                keywords: table.keywords ? table.keywords.split(',').map(k => k.trim()) : [table.name.toLowerCase()]
            })),
            exampleQueries: this.config.exampleQueries,
            timestamp: new Date().toISOString()
        };
    }

    startUsingApp() {
        // Reload aplikace s novou konfigurací
        window.location.reload();
    }

    // Navigace
    nextStep() {
        if (this.currentStep === 4) {
            this.generateExampleQueries();
        }
        
        this.showStep(this.currentStep + 1);
    }

    prevStep() {
        if (this.currentStep > 0) {
            this.showStep(this.currentStep - 1);
        }
    }
}

// Globální instance průvodce
const setupWizard = new SetupWizard();

// Funkce pro spuštění průvodce
function startSetupWizard() {
    setupWizard.start();
}
