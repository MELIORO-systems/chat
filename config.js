// Konfigurace aplikace - ČISTÁ VERZE

const CONFIG = {
    // Seznam tabulek (může být přepsán wizardem)
    TABLES: [
        { id: "Activities", name: "Aktivity" },
        { id: "Contacts", name: "Kontakty" },
        { id: "Deals", name: "Obchodní případy" },
        { id: "Customers", name: "Firma" }
    ],
    
    // Konfigurovatelné příklady dotazů
    EXAMPLE_QUERIES: [
        { icon: '📊', text: 'Kolik firem je v systému?' },
        { icon: '📋', text: 'Vypiš všechny firmy' },
        { icon: '🔍', text: 'Najdi firmu Alza' },
        { icon: '👥', text: 'Kolik kontaktů máme?' },
        { icon: '💼', text: 'Vypiš obchodní případy' },
        { icon: '📈', text: 'Kolik aktivit proběhlo?' }
    ],
    
    // API nastavení
    API: {
        OPENAI: {
            MODEL: "gpt-3.5-turbo",
            TEMPERATURE: 0.3,
            MAX_TOKENS: 1000
        },
        TABIDOO: {
            BASE_URL: "https://app.tabidoo.cloud/api/v2",
            RECORDS_LIMIT: 100
        }
    },
    
    // Zobrazení
    DISPLAY: {
        MAX_RECORDS_TO_SHOW: 20,
        PREVIEW_FIELDS_COUNT: 5
    },
    
    // Mapování polí
    FIELD_MAPPINGS: {
        IMPORTANT_FIELDS: ['name', 'nazev', 'jmeno', 'prijmeni', 'email', 'telefon', 'company', 'owner', 'status', 'title'],
        HIDDEN_FIELDS: ['_id', '_created', '_modified', '_creator'],
        FIELD_LABELS: {
            'name': 'Jméno',
            'nazev': 'Název',
            'jmeno': 'Jméno',
            'prijmeni': 'Příjmení',
            'email': 'E-mail',
            'telefon': 'Telefon',
            'company': 'Společnost',
            'owner': 'Vlastník',
            'status': 'Stav',
            'title': 'Název'
        }
    },
    
    // Cache nastavení
    CACHE: {
        DATA_KEY: 'tabidoo_data',
        DATA_TIMESTAMP_KEY: 'tabidoo_data_timestamp',
        DIAGNOSTICS_KEY: 'diagnostics_completed'
    },
    
    // Validace API klíčů
    VALIDATION: {
        API_KEY_PATTERNS: {
            OPENAI: /^sk-[a-zA-Z0-9]{48,}$/,
            TABIDOO: /^eyJ[a-zA-Z0-9\._-]+$/
        }
    },
    
    // Základní zprávy
    MESSAGES: {
        WELCOME: "⚙️ Vítejte! Pro začátek nastavte API klíče v nastavení (ikona ⚙️ vpravo nahoře).",
        DATA_LOAD_ERROR: "Nepodařilo se načíst data z Tabidoo. Zkontrolujte nastavení API.",
        NO_RESULTS: 'Nenašel jsem žádné záznamy odpovídající "{query}".'
    },
    
    // Diagnostické zprávy (pro wizard)
    DIAGNOSTICS: {
        TESTING_OPENAI: "Testuji OpenAI API klíč...",
        TESTING_TABIDOO: "Testuji Tabidoo API token...",
        LOADING_TABLE: "Načítám tabulku {tableName}...",
        OPENAI_SUCCESS: "OpenAI API klíč je platný",
        TABIDOO_SUCCESS: "Tabidoo API funguje - aplikace: {appName}",
        TABLE_SUCCESS: "Tabulka {tableName}: {count} záznamů",
        TABLE_ERROR: "Tabulka {tableName}: Nepodařilo se načíst",
        COMPLETED: "Diagnostika dokončena!",
        CLOSE_BUTTON: "Zavřít diagnostiku a pokračovat"
    }
};

// Export
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
} else if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
