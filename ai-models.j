// AI Models Manager - My Connect AI
class AIModelsManager {
    constructor() {
        this.supportedModels = {
            openai: {
                name: 'OpenAI (ChatGPT)',
                apiKeyPrefix: 'sk-',
                apiUrl: 'https://api.openai.com/v1/chat/completions',
                model: 'gpt-3.5-turbo',
                maxTokens: 1000,
                temperature: 0.3,
                getApiKeyUrl: 'https://platform.openai.com/api-keys'
            },
            gemini: {
                name: 'Google Gemini',
                apiKeyPrefix: 'AIza',
                apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
                model: 'gemini-pro',
                maxTokens: 1000,
                temperature: 0.3,
                getApiKeyUrl: 'https://aistudio.google.com/app/apikey'
            },
            claude: {
                name: 'Anthropic Claude',
                apiKeyPrefix: 'sk-ant-',
                apiUrl: 'https://api.anthropic.com/v1/messages',
                model: 'claude-3-haiku-20240307',
                maxTokens: 1000,
                temperature: 0.3,
                getApiKeyUrl: 'https://console.anthropic.com/'
            }
        };
        
        this.currentModel = this.getSelectedModel();
    }
    
    // Získat aktuálně vybraný model
    getSelectedModel() {
        return localStorage.getItem('selected_ai_model') || 'openai';
    }
    
    // Nastavit vybraný model
    setSelectedModel(modelKey) {
        if (this.supportedModels[modelKey]) {
            localStorage.setItem('selected_ai_model', modelKey);
            this.currentModel = modelKey;
            console.log('🤖 AI model changed to:', modelKey);
            return true;
        }
        return false;
    }
    
    // Získat konfiguraci modelu
    getModelConfig(modelKey = null) {
        const key = modelKey || this.currentModel;
        return this.supportedModels[key] || this.supportedModels.openai;
    }
    
    // Ověřit API klíč
    validateApiKey(modelKey, apiKey) {
        const config = this.getModelConfig(modelKey);
        if (!apiKey || !apiKey.startsWith(config.apiKeyPrefix)) {
            return false;
        }
        return true;
    }
    
    // Získat API klíč pro model
    getApiKey(modelKey = null) {
        const key = modelKey || this.currentModel;
        return security.loadSecure(`${key}_key`) || '';
    }
    
    // Uložit API klíč
    saveApiKey(modelKey, apiKey) {
        if (this.validateApiKey(modelKey, apiKey)) {
            security.saveSecure(`${modelKey}_key`, apiKey);
            return true;
        }
        return false;
    }
    
    // Zkontrolovat dostupnost modelu
    hasValidApiKey(modelKey = null) {
        const key = modelKey || this.currentModel;
        const apiKey = this.getApiKey(key);
        return this.validateApiKey(key, apiKey);
    }
    
    // Získat seznam všech modelů
    getAllModels() {
        return Object.keys(this.supportedModels).map(key => ({
            key: key,
            ...this.supportedModels[key],
            hasApiKey: this.hasValidApiKey(key),
            isSelected: key === this.currentModel
        }));
    }
    
    // Formátovat zprávu pro konkrétní model
    async formatMessage(userQuery, localResult) {
        const config = this.getModelConfig();
        const apiKey = this.getApiKey();
        
        if (!apiKey) {
            throw new Error(`Není nastaven API klíč pro ${config.name}`);
        }
        
        switch (this.currentModel) {
            case 'openai':
                return await this.callOpenAI(userQuery, localResult, apiKey, config);
            case 'gemini':
                return await this.callGemini(userQuery, localResult, apiKey, config);
            case 'claude':
                return await this.callClaude(userQuery, localResult, apiKey, config);
            default:
                throw new Error('Nepodporovaný AI model');
        }
    }
    
    // OpenAI API volání
    async callOpenAI(userQuery, localResult, apiKey, config) {
        const systemPrompt = "Jsi asistent pro My Connect AI. Zformuluj odpověď na základě poskytnutých dat. Buď přesný a strukturovaný. Odpovídej česky.";
        
        let context = `Uživatel se zeptal: "${userQuery}"\n\n`;
        context += this.buildContext(localResult);
        
        const response = await fetch(config.apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: config.model,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: context }
                ],
                temperature: config.temperature,
                max_tokens: config.maxTokens
            })
        });
        
        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status}`);
        }
        
        const data = await response.json();
        return data.choices[0].message.content;
    }
    
    // Google Gemini API volání
    async callGemini(userQuery, localResult, apiKey, config) {
        const prompt = `Jsi asistent pro My Connect AI. Odpovídej česky.\n\nUživatel se zeptal: "${userQuery}"\n\n${this.buildContext(localResult)}`;
        
        const response = await fetch(`${config.apiUrl}?key=${apiKey}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }],
                generationConfig: {
                    temperature: config.temperature,
                    maxOutputTokens: config.maxTokens
                }
            })
        });
        
        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.status}`);
        }
        
        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    }
    
    // Anthropic Claude API volání
    async callClaude(userQuery, localResult, apiKey, config) {
        const systemPrompt = "Jsi asistent pro My Connect AI. Zformuluj odpověď na základě poskytnutých dat. Buď přesný a strukturovaný. Odpovídej česky.";
        
        const userMessage = `Uživatel se zeptal: "${userQuery}"\n\n${this.buildContext(localResult)}`;
        
        const response = await fetch(config.apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
                "anthropic-version": "2023-06-01"
            },
            body: JSON.stringify({
                model: config.model,
                max_tokens: config.maxTokens,
                temperature: config.temperature,
                system: systemPrompt,
                messages: [{
                    role: "user",
                    content: userMessage
                }]
            })
        });
        
        if (!response.ok) {
            throw new Error(`Claude API error: ${response.status}`);
        }
        
        const data = await response.json();
        return data.content[0].text;
    }
    
    // Sestavit kontext pro AI
    buildContext(localResult) {
        let context = '';
        
        if (localResult.type === 'get_details') {
            context += `Našel jsem tyto údaje:\n${JSON.stringify(localResult.record, null, 2)}`;
        } else if (localResult.type === 'find_related') {
            context += `Hlavní záznam: ${JSON.stringify(localResult.mainRecord, null, 2)}\n`;
            context += `Související data: ${JSON.stringify(localResult.relatedData, null, 2)}`;
        } else if (localResult.searchResults) {
            context += `Relevantní záznamy:\n${localResult.response}`;
        } else if (localResult.response) {
            context += `Lokální výsledek: ${localResult.response}`;
        }
        
        return context;
    }
    
    // Test připojení k API
    async testConnection(modelKey = null) {
        const key = modelKey || this.currentModel;
        const config = this.getModelConfig(key);
        const apiKey = this.getApiKey(key);
        
        if (!apiKey) {
            return { success: false, error: 'Není nastaven API klíč' };
        }
        
        try {
            // Jednoduchý test s minimální zprávou
            const testResult = {
                type: 'test',
                response: 'Test připojení'
            };
            
            const originalModel = this.currentModel;
            this.currentModel = key;
            
            const response = await this.formatMessage('Test', testResult);
            
            this.currentModel = originalModel;
            
            return { 
                success: true, 
                message: 'Připojení úspěšné',
                response: response.substring(0, 100) + '...'
            };
        } catch (error) {
            return { 
                success: false, 
                error: error.message 
            };
        }
    }
}

// Globální instance
const aiModelsManager = new AIModelsManager();

// Export pro ostatní moduly
if (typeof window !== 'undefined') {
    window.aiModelsManager = aiModelsManager;
}
