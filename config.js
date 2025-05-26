// Konfigurace aplikace
const CONFIG = {
    // API klíče - NEUKLÁDAT SKUTEČNÉ KLÍČE!
    DEFAULT_API_KEYS: {
        OPENAI_API_KEY: "",
        TABIDOO_APP_ID: "",
        TABIDOO_API_TOKEN: ""
    },
    
    // Seznam tabulek
    TABLES: [
        { id: "Activities", name: "Aktivity" },
        { id: "Contacts", name: "Kontakty" },
        { id: "Deals", name: "Obchodní případy" },
        { id: "Customers", name: "Firma" }
    ],
    
    // Nastavení API
    API: {
        OPENAI: {
            MODEL: "gpt-3.5-turbo",
            TEMPERATURE: 0.7,
            MAX_TOKENS: 1500,
            EMBEDDINGS_MODEL: "text-embedding-ada-002"
        },
        TABIDOO: {
            BASE_URL: "https://app.tabidoo.cloud/api/v2",
            RECORDS_LIMIT: 100
        }
    },
    
    // Nastavení zobrazení
    DISPLAY: {
        MAX_RECORDS_TO_SHOW: 20,
        MAX_SEARCH_RESULTS: 10,
        PREVIEW_FIELDS_COUNT: 5,
        MAX_FIELD_LENGTH: 50
    },
    
    // Prompty pro GPT
    PROMPTS: {
        SYSTEM: {
            DEFAULT: "Jsi asistent pro Tabidoo CRM. Máš přístup ke kompletním datům z databáze. Odpovídej na dotazy přesně podle poskytnutých dat. Když se tě někdo zeptá na seznam nebo konkrétní data, vypiš je. V systému jsou firmy a jiné události uložené pod ID, s těmy samosřejmě pracuj, ale uživatelům odpovídej v konkrétních názvech firem a pod. Odpovídej česky.",
            WITH_DATA: "Jsi asistent pro Tabidoo CRM. Odpovídej na základě poskytnutých dat. Odpovídej stručně a věcně česky.",
            ANALYTICS: "Jsi asistent pro Tabidoo CRM. Odpovídej na základě poskytnutých statistik. Odpovídej stručně česky.",
            MINIMAL: "Jsi asistent pro Tabidoo CRM. Odpovídej stručně česky."
        }
    },
    
    // Zprávy pro uživatele
    MESSAGES: {
        WELCOME: "⚙️ Vítejte! Pro začátek nastavte API klíče v nastavení (ikona ⚙️ vpravo nahoře).",
        LOADING_DATA: "Načítám data...",
        CREATING_INDEX: "Vytvářím vyhledávací index pro rychlé vyhledávání...",
        SYSTEM_READY: "✓ Systém je připraven k inteligentnímu vyhledávání.",
        SYSTEM_READY_BASIC: "✓ Systém je připraven.",
        INDEX_CREATED: "✓ Vyhledávací index vytvořen! Systém je připraven.",
        INDEX_FAILED: "⚠️ Používám základní vyhledávání.",
        DATA_LOAD_ERROR: "Nepodařilo se načíst data z Tabidoo. Zkontrolujte nastavení API.",
        API_KEY_ERROR: "Nejprve nastavte API klíče v nastavení!",
        HELP_TEXT: 'Můžete se ptát na cokoliv z vašich dat. Například:\n• "Vypiš všechny firmy"\n• "Jaké kontakty máme v systému?"\n• "Kolik máme aktivních obchodních případů?"\n• "Najdi firmu ABC"',
        NO_RESULTS: 'Nenašel jsem žádné záznamy odpovídající "{query}".\n\nTip: Zkuste zadat konkrétní jméno, email nebo název firmy.',
        ERROR_PREFIX: "Omlouvám se, nastala chyba při zpracování dotazu.\n\nZkuste se zeptat jinak nebo použijte konkrétní příkazy jako:\n",
        ERROR_EXAMPLES: '• "vypiš všechny firmy"\n• "najdi kontakt Jana"\n• "kolik máme aktivit"'
    },
    
    // Diagnostické zprávy
    DIAGNOSTICS: {
        TITLE: "🔧 Spouštím diagnostiku systému...",
        TESTING_OPENAI: "Testuji OpenAI API klíč...",
        TESTING_TABIDOO: "Testuji Tabidoo API token...",
        TESTING_TABLES: "Testuji přístup k tabulkám...",
        LOADING_TABLE: "Načítám tabulku {tableName}...",
        OPENAI_SUCCESS: "OpenAI API klíč je platný",
        TABIDOO_SUCCESS: "Tabidoo API funguje - aplikace: {appName}",
        TABLE_SUCCESS: "Tabulka {tableName}: {count} záznamů",
        TABLE_WARNING: "Tabulka {tableName}: 0 záznamů",
        TABLE_ERROR: "Tabulka {tableName}: Nepodařilo se načíst",
        API_ERROR: "Některé API klíče nejsou správně nastaveny. Zkontrolujte nastavení.",
        NO_DATA_WARNING: "Žádná tabulka neobsahuje data",
        COMPLETED: "Diagnostika dokončena!",
        CLOSE_BUTTON: "Zavřít diagnostiku a pokračovat"
    },
    
    // Mapování polí
    FIELD_MAPPINGS: {
        IMPORTANT_FIELDS: ['name', 'nazev', 'Name', 'jmeno', 'prijmeni', 'email', 'telefon', 'firma', 'company'],
        HIDDEN_FIELDS: ['_id', '_created', '_modified', '_creator'],
        FIELD_LABELS: {
    'name': 'Jméno',
    'nazev': 'Název',
    'jmeno': 'Jméno',
    'prijmeni': 'Příjmení',
    'email': 'E-mail',
    'telefon': 'Telefon',
    'firma': 'Firma',
    'company': 'Společnost',
    'owner': 'Vlastník',
    'status': 'Stav',
    'type': 'Typ',
    'category': 'Kategorie',
    'title': 'Název',
    'clients': 'Klienti',
    'activities': 'Aktivity',
    'city': 'Město',
    'street': 'Ulice',
    'ZIP': 'PSČ'
        }
    },
    
    // Nastavení vyhledávání
    SEARCH: {
        MIN_TERM_LENGTH: 2,
        FIELD_WEIGHTS: {
            DEFAULT: 1,
            IMPORTANT: 2
        },
        EMBEDDINGS: {
            BATCH_SIZE: 10,
            MAX_TEXT_LENGTH: 1000
        }
    },
    
    // Cache nastavení
    CACHE: {
        DATA_KEY: 'tabidoo_data',
        DATA_TIMESTAMP_KEY: 'tabidoo_data_timestamp',
        EMBEDDINGS_KEY: 'tabidoo_embeddings',
        EMBEDDINGS_TIMESTAMP_KEY: 'tabidoo_embeddings_timestamp',
        DIAGNOSTICS_KEY: 'diagnostics_completed'
    },
    
     // Validace
    VALIDATION: {
        API_KEY_PATTERNS: {
            OPENAI: /^sk-[a-zA-Z0-9]{48,}$/,
            TABIDOO: /^eyJ[a-zA-Z0-9\._-]+$/
        }
    }
};
