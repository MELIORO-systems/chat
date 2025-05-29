// UI Manager - My Connect AI
class UIManager {
    constructor() {
        this.currentTheme = 'claude';
        this.themes = {
            claude: {
                name: 'Claude',
                description: 'Výchozí téma inspirované Claude.ai',
                colors: {
                    primary: '#C96442',
                    background: '#FAF9F5',
                    surface: '#F0EEE6'
                }
            },
            google: {
                name: 'Google',
                description: 'Čisté téma ve stylu Google',
                colors: {
                    primary: '#1a73e8',
                    background: '#ffffff',
                    surface: '#f8f9fa'
                }
            },
            replit: {
                name: 'Replit',
                description: 'Tmavé téma pro vývojáře',
                colors: {
                    primary: '#f56565',
                    background: '#0e1525',
                    surface: '#1c2333'
                }
            }
        };
        
        this.loadTheme();
        this.setupEventListeners();
    }
    
    // Načíst téma z localStorage
    loadTheme() {
        const savedTheme = localStorage.getItem('selectedAppTheme') || 'claude';
        this.setTheme(savedTheme);
    }
    
    // Nastavit téma
    setTheme(themeKey) {
        if (!this.themes[themeKey]) {
            console.warn(`Theme ${themeKey} not found, using claude`);
            themeKey = 'claude';
        }
        
        // Odstranit všechny theme třídy
        document.body.classList.remove('theme-claude', 'theme-google', 'theme-replit');
        
        // Přidat třídu pro nové téma (kromě výchozího claude)
        if (themeKey !== 'claude') {
            document.body.classList.add(`theme-${themeKey}`);
        }
        
        // Uložit do localStorage
        localStorage.setItem('selectedAppTheme', themeKey);
        this.currentTheme = themeKey;
        
        // Aktualizovat theme selector
        this.updateThemeSelector();
        
        console.log(`🎨 Theme changed to: ${themeKey}`);
    }
    
    // Získat aktuální téma
    getCurrentTheme() {
        return this.currentTheme;
    }
    
    // Získat informace o tématu
    getThemeInfo(themeKey = null) {
        const key = themeKey || this.currentTheme;
        return this.themes[key];
    }
    
    // Získat všechna témata
    getAllThemes() {
        return Object.keys(this.themes).map(key => ({
            key: key,
            ...this.themes[key],
            isActive: key === this.currentTheme
        }));
    }
    
    // Aktualizovat theme selector v UI
    updateThemeSelector() {
        document.querySelectorAll('.theme-option').forEach(option => {
            option.classList.remove('active');
        });
        
        const activeOption = document.querySelector(`.theme-${this.currentTheme}`);
        if (activeOption) {
            activeOption.classList.add('active');
        }
    }
    
    // Nastavit event listenery
    setupEventListeners() {
        // Theme selector clicks
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('theme-option')) {
                const themeKey = Array.from(e.target.classList)
                    .find(cls => cls.startsWith('theme-'))
                    ?.replace('theme-', '');
                
                if (themeKey) {
                    this.setTheme(themeKey);
                }
            }
        });
        
        // Keyboard shortcuts for themes
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.altKey) {
                switch (e.key) {
                    case '1':
                        this.setTheme('claude');
                        e.preventDefault();
                        break;
                    case '2':
                        this.setTheme('google');
                        e.preventDefault();
                        break;
                    case '3':
                        this.setTheme('replit');
                        e.preventDefault();
                        break;
                }
            }
        });
    }
    
    // Zobrazit/skrýt welcome screen
    showWelcomeScreen() {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;
        
        chatMessages.innerHTML = `
            <div class="welcome-container">
                <div class="example-queries" id="example-queries">
                    <!-- Příklady budou načteny dynamicky -->
                </div>
            </div>
        `;
        
        this.loadExampleQueries();
    }
    
    // Skrýt welcome screen
    hideWelcomeScreen() {
        const welcomeContainer = document.querySelector('.welcome-container');
        if (welcomeContainer) {
            welcomeContainer.style.display = 'none';
        }
    }
    
    // Načíst příklady dotazů
    loadExampleQueries() {
        const exampleQueriesContainer = document.getElementById('example-queries');
        if (!exampleQueriesContainer) return;
        
        let examples = [];
        if (typeof CONFIG !== 'undefined' && CONFIG.EXAMPLE_QUERIES) {
            examples = CONFIG.EXAMPLE_QUERIES;
        } else {
            examples = [
                { text: 'Kolik firem je v systému?' },
                { text: 'Vypiš všechny firmy' },
                { text: 'Najdi firmu Alza' },
                { text: 'Kolik kontaktů máme?' },
                { text: 'Vypiš obchodní případy' },
                { text: 'Kolik aktivit proběhlo?' }
            ];
        }
        
        exampleQueriesContainer.innerHTML = examples.map(example => `
            <div class="example-query" onclick="uiManager.clickExampleQuery('${example.text.replace(/'/g, "\\'")}')">
                ${example.text}
            </div>
        `).join('');
    }
    
    // Klik na příklad dotazu
    clickExampleQuery(query) {
        const chatInput = document.getElementById('chat-input');
        if (!chatInput) return;
        
        chatInput.value = query;
        chatInput.focus();
        
        // Auto-resize textarea
        chatInput.style.height = 'auto';
        chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
        
        this.hideWelcomeScreen();
    }
    
    // Správa menu
    toggleMainMenu() {
        const dropdown = document.getElementById('mainMenu');
        if (dropdown) {
            dropdown.classList.toggle('show');
        }
    }
    
    closeMainMenu() {
        const dropdown = document.getElementById('mainMenu');
        if (dropdown) {
            dropdown.classList.remove('show');
        }
    }
    
    // Správa viditelnosti hesel
    toggleVisibility(fieldId) {
        const field = document.getElementById(fieldId);
        if (!field) return;
        
        const button = field.parentNode.querySelector('.toggle-btn');
        if (field.type === 'password') {
            field.type = 'text';
            if (button) button.textContent = 'Skrýt';
        } else {
            field.type = 'password';
            if (button) button.textContent = 'Zobrazit';
        }
    }
    
    // Správa app konektorů v UI
    toggleAppConnector(appName) {
        const connector = document.getElementById(appName + '-connector');
        const button = event.target;
        
        if (connector.style.display === 'none' || !connector.style.display) {
            connector.style.display = 'block';
            button.textContent = 'Skrýt';
        } else {
            connector.style.display = 'none';
            button.textContent = 'Nastavit';
        }
    }
    
    // Aktualizovat status aplikace
    updateAppStatus(appName, status) {
        const statusElement = document.getElementById(appName + '-status');
        if (statusElement) {
            statusElement.textContent = status;
            statusElement.className = `app-connector-status ${status.toLowerCase().replace(/\s+/g, '-')}`;
        }
    }
    
    // Auto-resize pro textarea
    setupAutoResize() {
        const chatInput = document.getElementById('chat-input');
        if (!chatInput) return;
        
        chatInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 120) + 'px';
        });
        
        chatInput.addEventListener('keydown', function(event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                if (typeof sendMessage === 'function') {
                    sendMessage();
                }
            }
        });
    }
    
    // Zobrazit systémovou nápovědu
    showSystemHelp() {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;
        
        const helpContent = `
            <div class="system-help">
                <div class="help-header">
                    <h3>Jak systém funguje</h3>
                    <button class="help-close-btn" onclick="uiManager.showWelcomeScreen()">&times;</button>
                </div>
                
                <div class="help-content">
                    <div class="help-section">
                        <h4>Hybridní AI Connect přístup</h4>
                        <p>Kombinuje rychlé lokální vyhledávání s inteligentní AI komunikací. 
                        Vaše data zpracovávám lokálně pro rychlost a přesnost, AI používám jen pro formulaci odpovědí.</p>
                    </div>
                    
                    <div class="help-section">
                        <h4>Klíčové výhody</h4>
                        <ul class="help-list">
                            <li>Okamžité odpovědi bez čekání na API</li>
                            <li>100% přesnost při počítání záznamů</li>
                            <li>Inteligentní rozpoznávání různých tvarů slov</li>
                            <li>Chytré vyhledávání nezávislé na velikosti písmen</li>
                        </ul>
                    </div>
                    
                    <div class="help-section">
                        <h4>Co umím</h4>
                        <ul class="help-list">
                            <li>Počítat záznamy - "Kolik firem máme?"</li>
                            <li>Vypisovat seznamy - "Vypiš všechny kontakty"</li>
                            <li>Vyhledávat konkrétní záznamy - "Najdi firmu XYZ"</li>
                            <li>Najít související informace - "Jaké aktivity má firma ABC?"</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
        
        chatMessages.innerHTML = helpContent;
    }
    
    // Zobrazit informace o ochraně dat
    showDataProtection() {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;
        
        const dataProtectionContent = `
            <div class="system-help">
                <div class="help-header">
                    <h3>🔒 Ochrana dat a soukromí</h3>
                    <button class="help-close-btn" onclick="uiManager.showWelcomeScreen()">&times;</button>
                </div>
                
                <div class="help-content">
                    <div class="help-section">
                        <h4>🛡️ GDPR Compliance</h4>
                        <p>My Connect AI je plně v souladu s nařízením GDPR. Vaše osobní data jsou chráněna podle nejvyšších evropských standardů a máte plnou kontrolu nad jejich zpracováním.</p>
                    </div>
                    
                    <div class="help-section">
                        <h4>🔐 Zabezpečení dat</h4>
                        <ul class="help-list">
                            <li><strong>Lokální šifrování:</strong> API klíče jsou šifrovány a uloženy pouze ve vašem prohlížeči</li>
                            <li><strong>Žádné sledování:</strong> Neukládáme žádné osobní údaje na našich serverech</li>
                            <li><strong>Přímé připojení:</strong> Komunikujeme přímo s externími API</li>
                            <li><strong>Transparentnost:</strong> Veškerý kód je open source a kontrolovatelný</li>
                        </ul>
                    </div>
                    
                    <div class="help-section">
                        <h4>👤 Vaše práva</h4>
                        <ul class="help-list">
                            <li><strong>Plná kontrola:</strong> Kdykoliv můžete smazat všechna svá data</li>
                            <li><strong>Export dat:</strong> Můžete exportovat svou konfiguraci</li>
                            <li><strong>Anonymita:</strong> Nepotřebujeme žádnou registraci ani osobní údaje</li>
                            <li><strong>Odejít kdykoliv:</strong> Žádné závazky nebo předplatné</li>
                        </ul>
                    </div>
                    
                    <div class="help-section">
                        <h4>🏢 Zpracování firemních dat</h4>
                        <ul class="help-list">
                            <li><strong>Lokální zpracování:</strong> Veškerá analýza probíhá ve vašem prohlížeči</li>
                            <li><strong>Bez ukládání:</strong> Neukládáme kopie vašich dat</li>
                            <li><strong>Šifrovaná komunikace:</strong> Veškerá komunikace probíhá přes HTTPS</li>
                            <li><strong>Audit trail:</strong> Všechny akce jsou protokolovány pro bezpečnost</li>
                        </ul>
                    </div>
                    
                    <div class="help-section">
                        <h4>🌍 Mezinárodní standardy</h4>
                        <p>Systém My Connect AI dodržuje mezinárodní standardy pro ochranu dat včetně GDPR (EU), CCPA (California), a dalších regionálních předpisů. Vaše data nikdy neopustí váš prohlížeč bez vašeho výslovného souhlasu.</p>
                    </div>
                    
                    <div class="help-section">
                        <h4>📞 Kontakt a podpora</h4>
                        <p>V případě dotazů ohledně ochrany dat nás kontaktujte na: <strong>privacy@melioro.cz</strong></p>
                        <p>Reakce do 24 hodin • Česká podpora • Odborné poradenství</p>
                    </div>
                </div>
                
                <div class="help-footer" style="background: var(--surface); padding: 1rem 2rem; border-top: 1px solid var(--border); text-align: center;">
                    <p style="margin: 0; font-size: 0.875rem; color: var(--text-secondary);">
                        <strong>My Connect AI</strong> - Bezpečný, transparentní a v souladu s GDPR
                    </p>
                </div>
            </div>
        `;
        
        chatMessages.innerHTML = dataProtectionContent;
    }
    
    // Přidat zprávu do chatu
    addMessage(role, content) {
        console.log('Adding message:', role, content.substring(0, 100));
        
        // Skrýt welcome screen při první user/assistant zprávě
        if ((role === 'user' || role === 'assistant')) {
            this.hideWelcomeScreen();
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
    }
    
    // Přidat diagnostickou zprávu
    addDiagnosticMessage(text, status = 'info') {
        this.hideWelcomeScreen();
        
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
    
    // Inicializace UI - OPRAVENO
    initialize() {
        console.log('🎨 UI Manager initializing...');
        
        // Základní inicializace
        this.loadTheme();
        this.setupAutoResize();
        this.updateThemeSelector();
        
        // Nastavit globální funkce pro kompatibilitu
        this.setupGlobalFunctions();
        
        // Pokusit se načíst welcome screen s fallbackem
        setTimeout(() => {
            try {
                this.showWelcomeScreen();
            } catch (error) {
                console.warn('⚠️ Welcome screen init warning:', error);
            }
        }, 100);
        
        console.log('🎨 UI Manager ready');
    }
    
    // Nastavit globální funkce - BEZPEČNÉ
    setupGlobalFunctions() {
        // Bezpečné přiřazení s kontrolou existence
        const safeAssign = (name, func) => {
            try {
                window[name] = func;
            } catch (error) {
                console.warn(`⚠️ Failed to assign global function ${name}:`, error);
            }
        };
        
        safeAssign('setAppTheme', (theme) => this.setTheme(theme));
        safeAssign('toggleMainMenu', () => this.toggleMainMenu());
        safeAssign('closeMainMenu', () => this.closeMainMenu());
        safeAssign('toggleVisibility', (fieldId) => this.toggleVisibility(fieldId));
        safeAssign('toggleAppConnector', (appName) => this.toggleAppConnector(appName));
        safeAssign('updateAppStatus', (appName, status) => this.updateAppStatus(appName, status));
        safeAssign('showWelcomeScreen', () => this.showWelcomeScreen());
        safeAssign('showSystemHelp', () => this.showSystemHelp());
        safeAssign('showDataProtection', () => this.showDataProtection());
        safeAssign('clickExampleQuery', (query) => this.clickExampleQuery(query));
        safeAssign('addMessage', (role, content) => this.addMessage(role, content));
        safeAssign('addDiagnosticMessage', (text, status) => this.addDiagnosticMessage(text, status));
    }
    
    // Export konfigurace UI
    exportUIConfig() {
        return {
            theme: this.currentTheme,
            welcomeScreenVisible: !!document.querySelector('.welcome-container:not([style*="display: none"])'),
            settingsOpen: this.isSettingsOpen()
        };
    }
    
    // Zkontrolovat, zda jsou nastavení otevřená
    isSettingsOpen() {
        const panel = document.getElementById('settings-panel');
        return panel && panel.style.display !== 'none';
    }
}

// Globální instance
const uiManager = new UIManager();

// Export pro ostatní moduly
if (typeof window !== 'undefined') {
    window.uiManager = uiManager;
}

// Inicializace při načtení DOM
document.addEventListener('DOMContentLoaded', () => {
    uiManager.initialize();
});

// Fallback pro už načtený DOM
if (document.readyState !== 'loading') {
    setTimeout(() => {
        uiManager.initialize();
    }, 100);
}
