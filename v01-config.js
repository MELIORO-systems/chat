// Konfigurace - NEUKLÁDAT SKUTEČNÉ KLÍČE!
const DEFAULT_CONFIG = {
    OPENAI_API_KEY: "", // Nechat prázdné
    TABIDOO_APP_ID: "", // Nechat prázdné
    TABIDOO_API_TOKEN: "" // Nechat prázdné
};

// Seznam tabulek
const TABLES = [
    { id: "Activities", name: "Aktivity" },
    { id: "Contacts", name: "Kontakty" },
    { id: "Deals", name: "Obchodní případy" },
    { id: "Customers", name: "Firma" }
];

// Validace API klíčů
const API_KEY_PATTERNS = {
    OPENAI: /^sk-[a-zA-Z0-9]{48,}$/,
    TABIDOO: /^eyJ[a-zA-Z0-9\._-]+$/
};
