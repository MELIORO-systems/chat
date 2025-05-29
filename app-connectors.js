// App Connectors Manager - My Connect AI
class AppConnectorsManager {
    constructor() {
        this.connectors = {
            tabidoo: {
                name: 'Tabidoo CRM',
                description: 'Cloudová CRM platforma pro správu zákazníků',
                icon: '📊',
                status: 'disconnected',
                apiBaseUrl: 'https://app.tabidoo.cloud/api/v2',
                requiredFields: ['appId', 'apiToken'],
                testEndpoint: '/apps/{appId}',
                setupUrl: 'https://app.tabidoo.cloud',
                documentationUrl: 'https://developers.tabidoo.cloud',
                enabled: true
            },
            // Připraveno pro budoucí rozšíření
            pipedrive: {
                name: 'Pipedrive CRM',
                description: 'CRM pro prodejní týmy',
                icon: '🔄',
                status: 'coming_soon',
                enabled: false
            },
            hubspot: {
                name: 'HubSpot CRM',
                description: 'Marketing a prodejní platforma',
                icon: '🎯',
                status: 'coming_soon',
                enabled: false
            },
            salesforce: {
                name: 'Salesforce',
                description: 'Enterprise CRM řešení',
                icon: '☁️',
                status: 'coming_soon',
                enabled: false
            }
        };
        
        this.loadConnectorStates();
    }
    
    // Načíst stavy konektoru z localStorage
    loadConnectorStates() {
        Object.keys(this.connectors).forEach(key => {
            const connector = this.connectors[key];
            if (connector.enabled) {
                connector.status = this.checkConnectionStatus(key);
            }
        });
    }
    
    // Zkontrolovat stav připojení
    checkConnectionStatus(connectorKey) {
        switch (connectorKey) {
            case 'tabidoo':
                const hasToken = !!security.loadSecure('tabidoo_token');
                const hasAppId = !!security.loadSecure('tabidoo_app_id');
                return (hasToken && hasAppId) ? 'connected' : 'disconnected';
            default:
                return 'disconnected';
        }
    }
    
    // Získat všechny konektory
    getAllConnectors() {
        return Object.keys(this.connectors).map(key => ({
            key: key,
            ...this.connectors[key]
        }));
    }
    
    // Získat konfiguraci konkrétního konektoru
    getConnector(connectorKey) {
        return this.connectors[connectorKey];
    }
    
    // Získat aktivní konektory
    getActiveConnectors() {
        return this.getAllConnectors().filter(connector => 
            connector.enabled && connector.status === 'connected'
        );
    }
    
    // Uložit nastavení konektoru
    async saveConnectorSettings(connectorKey, settings) {
        const connector = this.getConnector(connectorKey);
        if (!connector || !connector.enabled) {
            throw new Error(`Konektor ${connectorKey} není dostupný`);
        }
        
        switch (connectorKey) {
            case 'tabidoo':
                return await this.saveTabidooSettings(settings);
            default:
                throw new Error(`Uložení nastavení pro ${connectorKey} není implementováno`);
        }
    }
    
    // Uložit Tabidoo nastavení
    async saveTabidooSettings(settings) {
        const { appId, apiToken } = settings;
        
        if (!appId || !apiToken) {
            throw new Error('App ID a API token jsou povinné');
        }
        
        // Validace API tokenu
        if (!apiToken.startsWith('eyJ')) {
            throw new Error('Neplatný formát API tokenu');
        }
        
        // Test připojení
        const testResult = await this.testTabidooConnection(appId, apiToken);
        if (!testResult.success) {
            throw new Error(testResult.error);
        }
        
        // Uložit nastavení
        security.saveSecure('tabidoo_app_id', appId);
        security.saveSecure('tabidoo_token', apiToken);
        
        // Aktualizovat stav
        this.connectors.tabidoo.status = 'connected';
        
        return {
            success: true,
            message: 'Tabidoo úspěšně připojeno',
            appName: testResult.appName
        };
    }
    
    // Test Tabidoo připojení
    async testTabidooConnection(appId, apiToken) {
        try {
            const response = await fetch(`${this.connectors.tabidoo.apiBaseUrl}/apps/${appId}`, {
                headers: {
                    'Authorization': `Bearer ${apiToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                return {
                    success: false,
                    error: `HTTP ${response.status}: Nelze se připojit k Tabidoo API`
                };
            }
            
            const data = await response.json();
            return {
                success: true,
                appName: data.name || appId
            };
        } catch (error) {
            return {
                success: false,
                error: `Chyba připojení: ${error.message}`
            };
        }
    }
    
    // Načíst data z konektoru
    async loadData(connectorKey, options = {}) {
        const connector = this.getConnector(connectorKey);
        
        if (!connector || connector.status !== 'connected') {
            throw new Error(`Konektor ${connectorKey} není připojen`);
        }
        
        switch (connectorKey) {
            case 'tabidoo':
                return await this.loadTabidooData(options);
            default:
                throw new Error(`Načítání dat z ${connectorKey} není implementováno`);
        }
    }
    
    // Načíst Tabidoo data
    async loadTabidooData(options = {}) {
        const appId = security.loadSecure('tabidoo_app_id');
        const apiToken = security.loadSecure('tabidoo_token');
        
        if (!appId || !apiToken) {
            throw new Error('Tabidoo není nakonfigurováno');
        }
        
        // Získat seznam tabulek
        const tablesResponse = await fetch(
            `${this.connectors.tabidoo.apiBaseUrl}/apps/${appId}/tables`,
            {
                headers: {
                    'Authorization': `Bearer ${apiToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        if (!tablesResponse.ok) {
            throw new Error(`Nelze načíst tabulky: HTTP ${tablesResponse.status}`);
        }
        
        const tables = await tablesResponse.json();
        const tablesData = {};
        
        // Načíst data z každé tabulky
        for (const table of tables) {
            try {
                const dataResponse = await fetch(
                    `${this.connectors.tabidoo.apiBaseUrl}/apps/${appId}/tables/${table.id}/data?limit=${options.limit || 100}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${apiToken}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );
                
                if (dataResponse.ok) {
                    const data = await dataResponse.json();
                    tablesData[table.id] = {
                        name: table.name || table.id,
                        data: data
                    };
                    
                    console.log(`✓ Načtena tabulka ${table.name}: ${this.getRecordCount(data)} záznamů`);
                } else {
                    console.warn(`⚠ Nelze načíst tabulku ${table.name}`);
                }
            } catch (error) {
                console.error(`✗ Chyba při načítání tabulky ${table.name}:`, error);
            }
        }
        
        return tablesData;
    }
    
    // Pomocná funkce pro počítání záznamů
    getRecordCount(data) {
        if (Array.isArray(data)) {
            return data.length;
        } else if (data?.items && Array.isArray(data.items)) {
            return data.items.length;
        } else if (data?.data && Array.isArray(data.data)) {
            return data.data.length;
        } else if (data?.records && Array.isArray(data.records)) {
            return data.records.length;
        }
        return 0;
    }
    
    // Odpojit konektor
    async disconnectConnector(connectorKey) {
        const connector = this.getConnector(connectorKey);
        if (!connector) {
            throw new Error(`Konektor ${connectorKey} neexistuje`);
        }
        
        switch (connectorKey) {
            case 'tabidoo':
                security.saveSecure('tabidoo_app_id', '');
                security.saveSecure('tabidoo_token', '');
                this.connectors.tabidoo.status = 'disconnected';
                break;
            default:
                throw new Error(`Odpojení ${connectorKey} není implementováno`);
        }
        
        console.log(`🔌 Konektor ${connectorKey} odpojen`);
        return { success: true };
    }
    
    // Získat status všech konektorů
    getConnectionStatus() {
        const status = {};
        Object.keys(this.connectors).forEach(key => {
            const connector = this.connectors[key];
            status[key] = {
                name: connector.name,
                status: connector.status,
                enabled: connector.enabled
            };
        });
        return status;
    }
    
    // Aktualizovat status konektoru
    updateConnectorStatus(connectorKey, status) {
        if (this.connectors[connectorKey]) {
            this.connectors[connectorKey].status = status;
            
            // Aktualizovat UI pokud existuje
            if (typeof updateAppStatus === 'function') {
                const statusText = this.getStatusText(status);
                updateAppStatus(connectorKey, statusText);
            }
        }
    }
    
    // Převést status na text
    getStatusText(status) {
        const statusMap = {
            'connected': 'Připojeno',
            'disconnected': 'Nepřipojeno',
            'connecting': 'Připojování...',
            'error': 'Chyba',
            'coming_soon': 'Připravujeme'
        };
        return statusMap[status] || status;
    }
    
    // Získat informace o konektoru pro nastavení
    getConnectorSettingsInfo(connectorKey) {
        const connector = this.getConnector(connectorKey);
        if (!connector) return null;
        
        return {
            name: connector.name,
            description: connector.description,
            icon: connector.icon,
            status: connector.status,
            statusText: this.getStatusText(connector.status),
            enabled: connector.enabled,
            setupUrl: connector.setupUrl,
            documentationUrl: connector.documentationUrl,
            requiredFields: connector.requiredFields || []
        };
    }
    
    // Export konfigurace všech konektorù
    exportConfiguration() {
        const config = {};
        
        Object.keys(this.connectors).forEach(key => {
            const connector = this.connectors[key];
            if (connector.enabled && connector.status === 'connected') {
                config[key] = {
                    name: connector.name,
                    status: connector.status,
                    // Neexportujeme citlivé údaje
                    hasConfiguration: true
                };
            }
        });
        
        return config;
    }
    
    // Diagnostika připojení
    async runDiagnostics() {
        const results = {};
        
        for (const [key, connector] of Object.entries(this.connectors)) {
            if (!connector.enabled) {
                results[key] = {
                    name: connector.name,
                    status: 'disabled',
                    message: 'Konektor není aktivní'
                };
                continue;
            }
            
            try {
                switch (key) {
                    case 'tabidoo':
                        const appId = security.loadSecure('tabidoo_app_id');
                        const apiToken = security.loadSecure('tabidoo_token');
                        
                        if (!appId || !apiToken) {
                            results[key] = {
                                name: connector.name,
                                status: 'not_configured',
                                message: 'Chybí konfigurace'
                            };
                        } else {
                            const testResult = await this.testTabidooConnection(appId, apiToken);
                            results[key] = {
                                name: connector.name,
                                status: testResult.success ? 'ok' : 'error',
                                message: testResult.success ? 
                                    `Připojeno k aplikaci: ${testResult.appName}` : 
                                    testResult.error
                            };
                        }
                        break;
                    default:
                        results[key] = {
                            name: connector.name,
                            status: 'coming_soon',
                            message: 'Připravujeme'
                        };
                }
            } catch (error) {
                results[key] = {
                    name: connector.name,
                    status: 'error',
                    message: error.message
                };
            }
        }
        
        return results;
    }
}

// Globální instance
const appConnectorsManager = new AppConnectorsManager();

// Export pro ostatní moduly
if (typeof window !== 'undefined') {
    window.appConnectorsManager = appConnectorsManager;
}
