// Integrace Setup Wizard s existujícím systémem

// Zabránit konfliktu se starým init systémem
let HYBRID_SYSTEM_ACTIVE = true;

// Rozšíření CONFIG objektu o wizard konfiguraci
function loadWizardConfig() {
    const wizardConfig = localStorage.getItem('tabidoo_wizard_config');
    const wizardCompleted = localStorage.getItem('tabidoo_wizard_completed');
    
    if (wizardConfig && wizardCompleted) {
        try {
            const config = JSON.parse(wizardConfig);
            console.log('📋 Loading wizard configuration:', config);
            
            // Přepsat CONFIG.TABLES
            CONFIG.TABLES = config.tables.map(table => ({
                id: table.id,
                name: table.name
            }));
            
            // Přepsat CONFIG.EXAMPLE_QUERIES
            if (config.exampleQueries && config.exampleQueries.length > 0) {
                CONFIG.EXAMPLE_QUERIES = config.exampleQueries;
            }
            
            // Uložit rozšířené informace o tabulkách
            CONFIG.TABLE_MAPPINGS = config.tables.reduce((acc, table) => {
                acc[table.id] = {
                    type: table.type,
                    keywords: table.keywords || []
                };
                return acc;
            }, {});
            
            console.log('✅ Wizard configuration applied');
            return true;
            
        } catch (error) {
            console.error('❌ Error loading wizard config:', error);
            return false;
        }
    }
    
    return false;
}

// Rozšíření query processoru o wizard mapování
function enhanceQueryProcessorWithWizard() {
    if (!CONFIG.TABLE_MAPPINGS) return;
    
    // Přepsat extractEntity funkci pro podporu wizard keywords
    const originalExtractEntity = QueryProcessor.prototype.extractEntity;
    
    QueryProcessor.prototype.extractEntity = function(query) {
        console.log('🔍 Enhanced extractEntity with wizard config');
        
        // Projít všechna mapování z wizardu
        for (const [tableId, mapping] of Object.entries(CONFIG.TABLE_MAPPINGS)) {
            if (mapping.keywords) {
                for (const keyword of mapping.keywords) {
                    if (query.includes(keyword.toLowerCase())) {
                        console.log(`✅ Found wizard keyword "${keyword}" → ${mapping.type}`);
                        return mapping.type;
                    }
                }
            }
        }
        
        // Fallback na původní logiku
        return originalExtractEntity.call(this, query);
    };
    
    console.log('✅ Query processor enhanced with wizard config');
}

// Kontrola, zda je potřeba spustit wizard
function shouldStartWizard() {
    const wizardCompleted = localStorage.getItem('tabidoo_wizard_completed');
    const hasBasicConfig = security.loadSecure('tabidoo_app_id') && security.loadSecure('tabidoo_token');
    
    // Spustit wizard pokud:
    // 1. Ještě nebyl dokončen A
    // 2. Nemáme základní konfiguraci
    return !wizardCompleted && !hasBasicConfig;
}

// Automatické spuštění wizardu
function autoStartWizardIfNeeded() {
    if (shouldStartWizard()) {
        console.log('🧙‍♂️ Auto-starting Setup Wizard');
        setTimeout(() => {
            setupWizard.start();
        }, 1000);
        return true;
    }
    return false;
}

// BLOKOVÁNÍ STARÉHO SYSTÉMU
// Přepsat původní init funkci
if (typeof window.init !== 'undefined') {
    const originalInit = window.init;
    window.init = function(skipDiagnostics = false) {
        if (HYBRID_SYSTEM_ACTIVE) {
            console.log('🚫 Blocking old init - hybrid system is active');
            return;
        }
        
        console.log('🔄 Running old init as fallback');
        return originalInit(skipDiagnostics);
    };
}

// Hook do inicializace systému
const originalHybridInit = window.hybridInit;
if (originalHybridInit) {
    window.hybridInit = async function() {
        console.log('🔗 Enhanced hybrid init with wizard support');
        
        // Načíst wizard konfiguraci
        const wizardLoaded = loadWizardConfig();
        
        if (wizardLoaded) {
            console.log('📋 Using wizard configuration');
            
            // Pokračovat s původní inicializací
            await originalHybridInit();
            
            // Rozšířit query processor
            enhanceQueryProcessorWithWizard();
            
        } else {
            // Zkusit automaticky spustit wizard
            const wizardStarted = autoStartWizardIfNeeded();
            
            if (!wizardStarted) {
                // Pokračovat s původní inicializací
                await originalHybridInit();
            }
        }
    };
} else {
    // Pokud není originalHybridInit, vytvořit vlastní
    window.hybridInit = async function() {
        console.log('🚀 Starting new hybrid init...');
        
        if (typeof security === 'undefined') {
            console.error('❌ Security manager not loaded!');
            setTimeout(() => window.hybridInit(), 100);
            return;
        }
        
        loadConfig();
        
        const chatMessages = document.getElementById('chat-messages');
        
        // Pokud nemáme API klíče
        if (!APP_CONFIG.TABIDOO_API_TOKEN || !APP_CONFIG.TABIDOO_APP_ID) {
            chatMessages.innerHTML = '';
            showWelcomeScreen(); // Použít nový welcome screen
            
            document.getElementById('chat-input').addEventListener('keydown', function(event) {
                if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    sendMessage();
                }
            });
            return;
        }
        
        // Zkusit automaticky spustit wizard
        const wizardStarted = autoStartWizardIfNeeded();
        
        if (wizardStarted) {
            return;
        }
        
        // Zobrazit loading zprávu
        chatMessages.innerHTML = `<div class="message system-message">🔄 Načítám data a inicializuji hybridní systém...</div>`;
        
        try {
            // 1. Načíst data
            console.log('📊 Loading Tabidoo data...');
            const dataLoaded = await loadTabidooData();
            
            if (!dataLoaded) {
                throw new Error('Failed to load Tabidoo data');
            }
            
            // 2. Inicializovat query processor
            console.log('🧠 Initializing query processor...');
            const processorReady = initializeQueryProcessor();
            
            if (!processorReady) {
                throw new Error('Failed to initialize query processor');
            }
            
            // 3. Úspěšná inicializace
            chatMessages.innerHTML = '';
            addMessage('system', '✅ Hybridní systém je připraven!');
            
            // Zobrazit welcome screen místo dlouhého textu
            setTimeout(() => {
                showWelcomeScreen();
            }, 500);
            
            // Debug info
            const stats = queryProcessor.getEntityStats();
            console.log('📈 System ready with data:', stats);
            
        } catch (error) {
            console.error('❌ Hybrid initialization failed:', error);
            chatMessages.innerHTML = '';
            addMessage('error', '❌ Chyba při inicializaci hybridního systému. Zkontrolujte nastavení API.');
            
            // Povolit starý systém jako fallback
            HYBRID_SYSTEM_ACTIVE = false;
            
            console.log('🔄 Falling back to old system...');
            setTimeout(() => {
                if (typeof init !== 'undefined') {
                    init(true); // Spustit starý systém
                }
            }, 2000);
        }
        
        // Přidat event listener pro Enter
        document.getElementById('chat-input').addEventListener('keydown', function(event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
            }
        });
    };
}

// Aktualizace hlavičky s informací o konfiguraci
function updateHeaderWithWizardInfo() {
    const wizardConfig = localStorage.getItem('tabidoo_wizard_config');
    if (wizardConfig) {
        try {
            const config = JSON.parse(wizardConfig);
            const headerSubtitle = document.querySelector('.header-subtitle');
            if (headerSubtitle) {
                headerSubtitle.textContent = `${config.appId} | Powered by MELIORO Systems`;
            }
        } catch (error) {
            console.error('Error updating header:', error);
        }
    }
}

// Spustit při načtení stránky
document.addEventListener('DOMContentLoaded', function() {
    updateHeaderWithWizardInfo();
});

// Přidat tlačítko pro reset wizardu do nastavení
function addWizardResetButton() {
    const settingsFooter = document.querySelector('.settings-footer');
    if (settingsFooter) {
        const wizardButton = document.createElement('button');
        wizardButton.className = 'link-btn';
        wizardButton.textContent = '🧙‍♂️ Překonfigurovat aplikaci';
        wizardButton.onclick = function() {
            if (confirm('Opravdu chcete znovu nastavit aplikaci pomocí průvodce?\n\nToto přemaže současnou konfiguraci.')) {
                localStorage.removeItem('tabidoo_wizard_completed');
                localStorage.removeItem('tabidoo_wizard_config');
                startSetupWizard();
            }
        };
        settingsFooter.appendChild(wizardButton);
    }
}

// Aktualizace hlavičky s informací o konfiguraci
function updateHeaderWithWizardInfo() {
    const wizardConfig = localStorage.getItem('tabidoo_wizard_config');
    if (wizardConfig) {
        try {
            const config = JSON.parse(wizardConfig);
            const headerSubtitle = document.querySelector('.header-subtitle');
            if (headerSubtitle) {
                headerSubtitle.textContent = `${config.appId} | Powered by MELIORO Systems`;
            }
        } catch (error) {
            console.error('Error updating header:', error);
        }
    }
}

// Spustit při načtení stránky
document.addEventListener('DOMContentLoaded', function() {
    updateHeaderWithWizardInfo();
});

// Přidat tlačítko pro reset wizardu do nastavení
function addWizardResetButton() {
    const settingsFooter = document.querySelector('.settings-footer');
    if (settingsFooter) {
        const wizardButton = document.createElement('button');
        wizardButton.className = 'link-btn';
        wizardButton.textContent = '🧙‍♂️ Překonfigurovat aplikaci';
        wizardButton.onclick = function() {
            if (confirm('Opravdu chcete znovu nastavit aplikaci pomocí průvodce?\n\nToto přemaže současnou konfiguraci.')) {
                localStorage.removeItem('tabidoo_wizard_completed');
                localStorage.removeItem('tabidoo_wizard_config');
                startSetupWizard();
            }
        };
        settingsFooter.appendChild(wizardButton);
    }
}
