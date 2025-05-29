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
                    `${this.
