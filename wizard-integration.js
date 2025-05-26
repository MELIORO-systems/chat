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

// Hook do inicializace systému - JEN ROZŠÍŘENÍ, NE PŘEPISOVÁNÍ
const originalHybridInit = window.hybridInit;
if (originalHybridInit) {
    window.hybridInit = async function() {
        console.log('🔗 Enhanced hybrid init with wizard support');
        
        // Načíst wizard konfiguraci PŘED původní inicializací
        const wizardLoaded = loadWizardConfig();
        
        if (wizardLoaded) {
            console.log('📋 Using wizard configuration');
        }
        
        // Zkusit automaticky spustit wizard
        const wizardStarted = autoStartWizardIfNeeded();
        
        if (wizardStarted) {
            console.log('🧙‍♂️ Wizard started, skipping normal init');
            return;
        }
        
        // Pokračovat s původní inicializací
        await originalHybridInit();
        
        // Rozšířit query processor POUZE pokud není wizard spuštěn
        if (wizardLoaded) {
            enhanceQueryProcessorWithWizard();
        }
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

// Spustit při načtení stránky
document.addEventListener('DOMContentLoaded', function() {
    updateHeaderWithWizardInfo();
    setTimeout(addWizardResetButton, 1000); // Počkat až se načte UI
});
