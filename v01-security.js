// Jednoduchá obousměrná šifrovací funkce
class SecurityManager {
    constructor() {
        // Generovat nebo načíst unikátní klíč pro tento prohlížeč
        this.deviceKey = this.getOrCreateDeviceKey();
    }
    
    // Získat nebo vytvořit unikátní klíč zařízení
    getOrCreateDeviceKey() {
        let key = localStorage.getItem('device_key');
        if (!key) {
            // Generovat náhodný klíč
            key = this.generateKey();
            localStorage.setItem('device_key', key);
        }
        return key;
    }
    
    // Generovat náhodný klíč
    generateKey() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }
    
    // Jednoduchá XOR šifra s klíčem
    encrypt(text, key) {
        if (!text) return '';
        let result = '';
        for (let i = 0; i < text.length; i++) {
            result += String.fromCharCode(
                text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
            );
        }
        return btoa(result); // Base64 encode
    }
    
    // Dešifrování
    decrypt(encoded, key) {
        if (!encoded) return '';
        try {
            const text = atob(encoded); // Base64 decode
            let result = '';
            for (let i = 0; i < text.length; i++) {
                result += String.fromCharCode(
                    text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
                );
            }
            return result;
        } catch (e) {
            return '';
        }
    }
    
    // Uložit zabezpečenou hodnotu
    saveSecure(key, value) {
        const encrypted = this.encrypt(value, this.deviceKey);
        localStorage.setItem(`secure_${key}`, encrypted);
    }
    
    // Načíst zabezpečenou hodnotu
    loadSecure(key) {
        const encrypted = localStorage.getItem(`secure_${key}`);
        return this.decrypt(encrypted, this.deviceKey);
    }
    
    // Vymazat všechny zabezpečené hodnoty
    clearSecure() {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith('secure_')) {
                localStorage.removeItem(key);
            }
        });
    }
}

// Globální instance
const security = new SecurityManager();
