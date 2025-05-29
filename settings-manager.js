// Settings Manager - My Connect AI
class SettingsManager {
    constructor() {
        this.isOpen = false;
        this.hasUnsavedChanges = false;
        this.currentTab = 'ai-models';
        
        // Reference na ostatní managery
        this.aiModels = null;
        this.appConnectors = null;
        this.uiManager = null;
        
        this.initializeManagers();
        this.setupEventListeners();
    }
    
    // Inicializace referencí na ostatní managery
    initializeManagers() {
        // Počkat na načtení ostatních managerů
        setTimeout(() => {
            this.aiModels = window.aiModelsManager;
            this.appConnectors = window.appConnectorsManager;
            this.uiManager = window.uiManager;
        }, 100);
    }
    
    // Nastavit event listenery
    setupEventListeners() {
        // Poslouchat změny v nastavení
        document.addEventListener('change', (e) => {
            if (e.target.closest('.settings-panel')) {
                this.markAsChanged();
            }
        });
        
        // Poslouchat ESC klávesy pro zavření
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.toggle();
            }
        });
    }
    
    // Otevřít/zavřít nastavení
    toggle() {
        const panel = document.getElementById('settings-panel');
        if (!panel) {
            console.error('Settings panel not found!');
            return;
        }
        
        this.isOpen = !this.isOpen;
        
        if (this.isOpen) {
            this.open();
        } else {
            this.close();
        }
    }
    
    // Otevřít nastavení
    open() {
        const panel = document.getElementById('settings-panel');
        panel.style.display = 'block';
        this.isOpen = true;
        
        // Načíst aktuální hodnoty
        this.loadCurrentValues();
        
        // Aplikovat správné zobrazení AI modelu
        setTimeout(() => {
            this.updateAIModelDisplay();
        }, 50);
        
        console.log('⚙️ Settings panel opened');
    }
    
    // Zavřít nastavení
    close() {
        if (this.hasUnsavedChanges) {
            if (!confirm('Máte neuložené změny. Opravdu chcete zavřít nastavení?')) {
                return false;
            }
        }
        
        const panel = document.getElementById('settings-panel');
        panel.style.display = 'none';
        this.isOpen = false;
        this.hasUnsavedChanges = false;
        
        console.log('⚙️ Settings panel closed');
        return true;
    }
    
    // Načíst aktuální hodnoty do formuláře
    loadCurrentValues() {
        // AI model selection
        const aiModelSelect = document.getElementById('ai-model-select');
        if (aiModelSelect && this.aiModels) {
            aiModelSelect.value = this.aiModels.getSelectedModel();
        }
        
        // API klíče - vyčistit a nastavit placeholdery
        this.loadApiKeys();
        
        // App connectors
        this.loadAppConnectorValues();
        
        // Obecné nastavení
        this.loadGeneralSettings();
    }
    
    // Načíst API klíče
    loadApiKeys() {
        const models = ['openai', 'gemini', 'claude'];
        
        models.forEach(model => {
            const field = document.getElementById(`${model}-key`);
            if (field) {
                const hasKey = !!(this.aiModels && this.aiModels.getApiKey(model));
                field.value = '';
                field.placeholder = hasKey ? 
                    'API klíč je nastaven (pro změnu zadejte nový)' : 
                    this.getDefaultPlaceholder(model);
            }
        });
    }
    
    // Získat výchozí placeholder pro model
    getDefaultPlaceholder(model) {
        const placeholders = {
            'openai': 'sk-...',
            'gemini': 'AIza...',
            'claude': 'sk-ant-...'
        };
        return placeholders[model] || 'API klíč';
    }
    
    // Načíst hodnoty app konektorů
    loadAppConnectorValues() {
        // Tabidoo
        const tabidooToken = document.getElementById('tabidoo-token');
        const tabidooAppId = document.getElementById('tabidoo-app-id');
        
        if (tabidooToken) {
            const hasToken = !!(this.appConnectors && 
                this.appConnectors.checkConnectionStatus('tabidoo') === 'connected');
            tabidooToken.value = '';
            tabidooToken.placeholder = hasToken ? 
                'Token je nastaven (pro změnu zadejte nový)' : 'eyJ...';
        }
        
        if (tabidooAppId) {
            tabidooAppId.value = security.loadSecure('tabidoo_app_id') || '';
        }
        
        // Aktualizovat statusy
        this.updateAppStatuses();
    }
    
    // Načíst obecné nastavení
    loadGeneralSettings() {
        // Tema se načte automaticky z UI manageru
        if (this.uiManager) {
            this.uiManager.updateThemeSelector();
        }
    }
    
    // Aktualizovat zobrazení AI modelu
    updateAIModelDisplay() {
        const selectedModel = document.getElementById('ai-model-select')?.value || 'openai';
        
        // Skrýt všechna nastavení AI modelů
        document.querySelectorAll('.ai-model-settings').forEach(settings => {
            settings.style.display = 'none';
        });
        
        // Zobrazit vybrané nastavení
        const selectedSettings = document.getElementById(selectedModel + '-settings');
        if (selectedSettings) {
            selectedSettings.style.display = 'block';
        }
        
        console.log('🤖 AI model display updated:', selectedModel);
    }
    
    // Aktualizovat statusy aplikací
    updateAppStatuses() {
        if (!this.appConnectors) return;
        
        const connectors = this.appConnectors.getAllConnectors();
        connectors.forEach(connector => {
            const statusElement = document.getElementById(`${connector.key}-status`);
            if (statusElement) {
                const statusText = this.appConnectors.getStatusText(connector.status);
                statusElement.textContent = statusText;
                statusElement.className = `app-connector-status ${connector.status.replace('_', '-')}`;
            }
        });
    }
    
    // Označit jako změněno
    markAsChanged() {
        this.hasUnsavedChanges = true;
        
        // Vizuální indikace změn
        const saveButton = document.querySelector('.primary-btn');
        if (saveButton && !saveButton.classList.contains('has-changes')) {
            saveButton.classList.add('has-changes');
            saveButton.textContent = 'Uložit změny *';
        }
    }
    
    // Uložit všechna nastavení
    async save() {
        try {
            const results = {
                aiModel: await this.saveAIModelSettings(),
                appConnectors: await this.saveAppConnectorSettings(),
                general: await this.saveGeneralSettings()
            };
            
            this.hasUnsavedChanges = false;
            
            // Reset vizuálních indikací
            const saveButton = document.querySelector('.primary-btn');
            if (saveButton) {
                saveButton.classList.remove('has-changes');
                saveButton.textContent = 'Uložit nastavení';
            }
            
            // Aktualizovat statusy
            this.updateAppStatuses();
            
            console.log('💾 All settings saved:', results);
            
            // Zobrazit úspěšnou zprávu
            this.showSuccessMessage('Nastavení bylo úspěšně uloženo!');
            
            // Zavřít panel
            setTimeout(() => this.close(), 1000);
            
            // Reload pokud je potřeba
            if (results.appConnectors.needsReload) {
                setTimeout(() => location.reload(), 1500);
            }
            
            return results;
            
        } catch (error) {
            console.error('❌ Error saving settings:', error);
            this.showErrorMessage(`Chyba při ukládání: ${error.message}`);
            throw error;
        }
    }
    
    // Uložit nastavení AI modelů
    async saveAIModelSettings() {
        const selectedModel = document.getElementById('ai-model-select')?.value;
        const results = { selectedModel, savedKeys: [] };
        
        if (selectedModel && this.aiModels) {
            this.aiModels.setSelectedModel(selectedModel);
            results.selectedModel = selectedModel;
        }
        
        // Uložit API klíče
        const models = ['openai', 'gemini', 'claude'];
        for (const model of models) {
            const keyField = document.getElementById(`${model}-key`);
            if (keyField && keyField.value.trim()) {
                const apiKey = keyField.value.trim();
                if (this.aiModels && this.aiModels.saveApiKey(model, apiKey)) {
                    results.savedKeys.push(model);
                    console.log(`🔑 ${model} API key saved`);
                }
            }
        }
        
        return results;
    }
    
    // Uložit nastavení app konektorů
    async saveAppConnectorSettings() {
        const results = { saved: [], needsReload: false };
        
        // Tabidoo
        const tabidooToken = document.getElementById('tabidoo-token')?.value.trim();
        const tabidooAppId = document.getElementById('tabidoo-app-id')?.value.trim();
        
        if (tabidooToken && tabidooAppId && this.appConnectors) {
            try {
                const result = await this.appConnectors.saveConnectorSettings('tabidoo', {
                    apiToken: tabidooToken,
                    appId: tabidooAppId
                });
                
                results.saved.push('tabidoo');
                results.needsReload = true;
                console.log('📊 Tabidoo settings saved:', result);
            } catch (error) {
                console.error('❌ Tabidoo save error:', error);
                throw new Error(`Tabidoo: ${error.message}`);
            }
        }
        
        return results;
    }
    
    // Uložit obecné nastavení
    async saveGeneralSettings() {
        const results = {};
        
        // Barevné schéma se ukládá automaticky při změně
        if (this.uiManager) {
            results.theme = this.uiManager.getCurrentTheme();
        }
        
        return results;
    }
    
    // Zobrazit zprávu o úspěchu
    showSuccessMessage(message) {
        this.showMessage(message, 'success');
    }
    
    // Zobrazit chybovou zprávu
    showErrorMessage(message) {
        this.showMessage(message, 'error');
    }
    
    // Zobrazit zprávu
    showMessage(message, type = 'info') {
        // Vytvoř notifikaci
        const notification = document.createElement('div');
        notification.className = `settings-notification ${type}`;
        notification.textContent = message;
        
        // Přidej do settings panelu
        const panel = document.getElementById('settings-panel');
        if (panel) {
            panel.insertBefore(notification, panel.firstChild);
            
            // Odstranit po 3 sekundách
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 3000);
        }
    }
    
    // Export konfigurace
    exportConfiguration() {
        const config = {
            timestamp: new Date().toISOString(),
            version: '1.0',
            aiModels: this.aiModels ? {
                selected: this.aiModels.getSelectedModel(),
                available: this.aiModels.getAllModels().map(m => ({
                    key: m.key,
                    name: m.name,
                    hasApiKey: m.hasApiKey
                }))
            } : {},
            appConnectors: this.appConnectors ? this.appConnectors.exportConfiguration() : {},
            general: {
                theme: localStorage.getItem('selectedAppTheme') || 'claude'
            }
        };
        
        return config;
    }
    
    // Import konfigurace
    async importConfiguration(config) {
        try {
            if (config.aiModels && config.aiModels.selected) {
                localStorage.setItem('selected_ai_model', config.aiModels.selected);
            }
            
            if (config.general && config.general.theme) {
                localStorage.setItem('selectedAppTheme', config.general.theme);
            }
            
            console.log('📥 Configuration imported successfully');
            return true;
        } catch (error) {
            console.error('❌ Import error:', error);
            throw error;
        }
    }
    
    // Vymazat všechna data
    clearAllData() {
        if (confirm('Opravdu chcete vymazat všechna data včetně API klíčů?\n\nTato akce je nevratná!')) {
            localStorage.clear();
            if (typeof security !== 'undefined' && security.clearSecure) {
                security.clearSecure();
            }
            
            alert('Všechna data byla vymazána.');
            location.reload();
        }
    }
    
    // Diagnostika nastavení
    async runDiagnostics() {
        const results = {
            timestamp: new Date().toISOString(),
            aiModels: {},
            appConnectors: {},
            general: {}
        };
        
        // AI Models diagnostika
        if (this.aiModels) {
            const models = this.aiModels.getAllModels();
            for (const model of models) {
                try {
                    if (model.hasApiKey) {
                        const testResult = await this.aiModels.testConnection(model.key);
                        results.aiModels[model.key] = {
                            name: model.name,
                            status: testResult.success ? 'ok' : 'error',
                            message: testResult.success ? 'Připojení OK' : testResult.error
                        };
                    } else {
                        results.aiModels[model.key] = {
                            name: model.name,
                            status: 'not_configured',
                            message: 'Není nastaven API klíč'
                        };
                    }
                } catch (error) {
                    results.aiModels[model.key] = {
                        name: model.name,
                        status: 'error',
                        message: error.message
                    };
                }
            }
        }
        
        // App Connectors diagnostika
        if (this.appConnectors) {
            results.appConnectors = await this.appConnectors.runDiagnostics();
        }
        
        // Obecná diagnostika
        results.general = {
            theme: localStorage.getItem('selectedAppTheme') || 'claude',
            browser: navigator.userAgent,
            localStorage: typeof Storage !== 'undefined'
        };
        
        return results;
    }
}

// Globální instance
const settingsManager = new SettingsManager();

// Export pro ostatní moduly
if (typeof window !== 'undefined') {
    window.settingsManager = settingsManager;
}

// Globální funkce pro kompatibilitu
window.toggleSettings = () => settingsManager.toggle();
window.saveSettings = () => settingsManager.save();
window.clearAllData = () => settingsManager.clearAllData();
