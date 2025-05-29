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
        if (!chatInput
