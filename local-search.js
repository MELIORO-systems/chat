// Lokální vyhledávací engine - rychlé a přesné vyhledávání

class LocalSearchEngine {
    constructor(tablesData) {
        this.tablesData = tablesData;
        this.buildSearchIndex();
    }
    
    // Vybudovat vyhledávací index pro rychlé vyhledávání
    buildSearchIndex() {
        console.log('🔍 Building search index...');
        this.searchIndex = {
            companies: [],
            contacts: [],
            activities: [],
            deals: []
        };
        
        // Indexovat firmy
        if (this.tablesData['Customers']) {
            const companies = this.getActualTableData(this.tablesData['Customers']);
            this.searchIndex.companies = companies.map(record => ({
                record: record,
                searchText: this.buildSearchText(record, 'company'),
                names: this.extractAllNames(record, 'company')
            }));
        }
        
        // Indexovat kontakty
        if (this.tablesData['Contacts']) {
            const contacts = this.getActualTableData(this.tablesData['Contacts']);
            this.searchIndex.contacts = contacts.map(record => ({
                record: record,
                searchText: this.buildSearchText(record, 'contact'),
                names: this.extractAllNames(record, 'contact')
            }));
        }
        
        // Indexovat aktivity
        if (this.tablesData['Activities']) {
            const activities = this.getActualTableData(this.tablesData['Activities']);
            this.searchIndex.activities = activities.map(record => ({
                record: record,
                searchText: this.buildSearchText(record, 'activity'),
                names: this.extractAllNames(record, 'activity')
            }));
        }
        
        // Indexovat obchodní případy
        if (this.tablesData['Deals']) {
            const deals = this.getActualTableData(this.tablesData['Deals']);
            this.searchIndex.deals = deals.map(record => ({
                record: record,
                searchText: this.buildSearchText(record, 'deal'),
                names: this.extractAllNames(record, 'deal')
            }));
        }
        
        console.log('✅ Search index built:', {
            companies: this.searchIndex.companies.length,
            contacts: this.searchIndex.contacts.length,
            activities: this.searchIndex.activities.length,
            deals: this.searchIndex.deals.length
        });
    }
    
    // Získat všechny záznamy daného typu
    getAllRecords(entityType) {
        switch (entityType) {
            case 'company':
                return this.searchIndex.companies.map(item => item.record);
            case 'contact':
                return this.searchIndex.contacts.map(item => item.record);
            case 'activity':
                return this.searchIndex.activities.map(item => item.record);
            case 'deal':
                return this.searchIndex.deals.map(item => item.record);
            default:
                // Vrátit všechny záznamy ze všech tabulek
                return [
                    ...this.searchIndex.companies.map(item => item.record),
                    ...this.searchIndex.contacts.map(item => item.record),
                    ...this.searchIndex.activities.map(item => item.record),
                    ...this.searchIndex.deals.map(item => item.record)
                ];
        }
    }
    
    // Najít záznamy podle názvu
    findByName(searchName, entityType = null) {
        console.log(`🔎 Searching for: "${searchName}" in ${entityType || 'all'}`);
        
        const searchLower = searchName.toLowerCase();
        const results = [];
        
        // Určit, ve kterých indexech hledat
        const indexesToSearch = this.getIndexesToSearch(entityType);
        
        for (const indexName of indexesToSearch) {
            const index = this.searchIndex[indexName];
            
            for (const item of index) {
                const score = this.calculateNameMatchScore(item.names, searchLower);
                
                if (score > 0) {
                    results.push({
                        record: item.record,
                        score: score,
                        type: indexName
                    });
                }
            }
        }
        
        // Seřadit podle skóre (nejlepší shody první)
        const sortedResults = results
            .sort((a, b) => b.score - a.score)
            .map(item => item.record);
            
        console.log(`✅ Found ${sortedResults.length} matches`);
        return sortedResults;
    }
    
    // Textové vyhledávání napříč všemi daty
    textSearch(query, maxResults = 10) {
        console.log(`🔍 Text search for: "${query}"`);
        
        const searchTerms = query.toLowerCase()
            .split(' ')
            .filter(term => term.length >= 2);
            
        const results = [];
        
        // Prohledat všechny indexy
        for (const [indexName, index] of Object.entries(this.searchIndex)) {
            for (const item of index) {
                const score = this.calculateTextMatchScore(item.searchText, searchTerms);
                
                if (score > 0) {
                    results.push({
                        record: item.record,
                        score: score,
                        type: indexName
                    });
                }
            }
        }
        
        const sortedResults = results
            .sort((a, b) => b.score - a.score)
            .slice(0, maxResults);
            
        console.log(`✅ Text search found ${sortedResults.length} matches`);
        return sortedResults;
    }
    
    // Najít související záznamy
    findRelatedRecords(mainRecord, entityType) {
        console.log('🔗 Finding related records for:', entityType);
        
        const mainData = mainRecord.fields || mainRecord;
        const related = {
            contacts: [],
            activities: [],
            deals: []
        };
        
        // Podle typu hlavního záznamu hledat související
        if (entityType === 'company') {
            const companyName = this.extractMainName(mainRecord, 'company');
            
            // Najít kontakty z této firmy
            related.contacts = this.findContactsByCompany(companyName);
            
            // Najít aktivity související s firmou
            related.activities = this.findActivitiesByCompany(companyName);
            
            // Najít obchodní případy s firmou
            related.deals = this.findDealsByCompany(companyName);
        }
        
        if (entityType === 'contact') {
            const contactName = this.extractMainName(mainRecord, 'contact');
            
            // Najít aktivity tohoto kontaktu
            related.activities = this.findActivitiesByContact(contactName);
            
            // Najít obchodní případy tohoto kontaktu
            related.deals = this.findDealsByContact(contactName);
        }
        
        return related;
    }
    
    // === POMOCNÉ FUNKCE ===
    
    getActualTableData(table) {
        if (Array.isArray(table.data)) {
            return table.data;
        } else if (table.data?.items) {
            return table.data.items;
        } else if (table.data?.data) {
            return table.data.data;
        } else if (table.data?.records) {
            return table.data.records;
        }
        return [];
    }
    
    getIndexesToSearch(entityType) {
        if (!entityType) {
            return ['companies', 'contacts', 'activities', 'deals'];
        }
        
        switch (entityType) {
            case 'company': return ['companies'];
            case 'contact': return ['contacts'];
            case 'activity': return ['activities'];
            case 'deal': return ['deals'];
            default: return ['companies', 'contacts', 'activities', 'deals'];
        }
    }
    
    // Vybudovat vyhledávací text pro záznam
    buildSearchText(record, type) {
        const data = record.fields || record;
        const textParts = [];
        
        // Podle typu záznamu prioritizovat různá pole
        let fieldsToIndex = [];
        
        switch (type) {
            case 'company':
                fieldsToIndex = ['name', 'nazev', 'company', 'title', 'email', 'city', 'street'];
                break;
            case 'contact':
                fieldsToIndex = ['name', 'jmeno', 'prijmeni', 'email', 'telefon', 'firma', 'company'];
                break;
            case 'activity':
                fieldsToIndex = ['name', 'nazev', 'title', 'description', 'type'];
                break;
            case 'deal':
                fieldsToIndex = ['name', 'nazev', 'title', 'company', 'client'];
                break;
        }
        
        // Přidat hodnoty polí do vyhledávacího textu
        for (const field of fieldsToIndex) {
            if (data[field]) {
                const value = this.getDisplayValue(data[field]);
                if (value) {
                    textParts.push(value.toLowerCase());
                }
            }
        }
        
        return textParts.join(' ');
    }
    
    // Extrahovat všechny možné názvy záznamu
    extractAllNames(record, type) {
        const data = record.fields || record;
        const names = [];
        
        switch (type) {
            case 'company':
                if (data.name) names.push(this.getDisplayValue(data.name));
                if (data.nazev) names.push(this.getDisplayValue(data.nazev));
                if (data.company) names.push(this.getDisplayValue(data.company));
                if (data.title) names.push(this.getDisplayValue(data.title));
                break;
                
            case 'contact':
                if (data.name) names.push(this.getDisplayValue(data.name));
                if (data.jmeno && data.prijmeni) {
                    names.push(`${this.getDisplayValue(data.jmeno)} ${this.getDisplayValue(data.prijmeni)}`);
                }
                if (data.jmeno) names.push(this.getDisplayValue(data.jmeno));
                if (data.prijmeni) names.push(this.getDisplayValue(data.prijmeni));
                break;
                
            case 'activity':
                if (data.name) names.push(this.getDisplayValue(data.name));
                if (data.nazev) names.push(this.getDisplayValue(data.nazev));
                if (data.title) names.push(this.getDisplayValue(data.title));
                break;
                
            case 'deal':
                if (data.name) names.push(this.getDisplayValue(data.name));
                if (data.nazev) names.push(this.getDisplayValue(data.nazev));
                if (data.title) names.push(this.getDisplayValue(data.title));
                break;
        }
        
        return names.filter(name => name && name.length > 0);
    }
    
    // Spočítat skóre shody názvu
    calculateNameMatchScore(names, searchLower) {
        let maxScore = 0;
        
        for (const name of names) {
            const nameLower = name.toLowerCase();
            
            // Přesná shoda - nejvyšší skóre
            if (nameLower === searchLower) {
                maxScore = Math.max(maxScore, 100);
                continue;
            }
            
            // Obsahuje hledaný text - vysoké skóre
            if (nameLower.includes(searchLower)) {
                const score = 80 - (nameLower.length - searchLower.length) * 2;
                maxScore = Math.max(maxScore, Math.max(score, 50));
                continue;
            }
            
            // Hledaný text obsahuje název - střední skóre
            if (searchLower.includes(nameLower) && nameLower.length > 2) {
                maxScore = Math.max(maxScore, 40);
                continue;
            }
            
            // Podobnost slov - nízké skóre
            const similarity = this.calculateStringSimilarity(nameLower, searchLower);
            if (similarity > 0.7) {
                maxScore = Math.max(maxScore, 30);
            }
        }
        
        return maxScore;
    }
    
    // Spočítat skóre textové shody
    calculateTextMatchScore(searchText, searchTerms) {
        let score = 0;
        
        for (const term of searchTerms) {
            if (searchText.includes(term)) {
                score += 10;
                
                // Bonus za shodu na začátku slova
                const regex = new RegExp(`\\b${term}`, 'i');
                if (regex.test(searchText)) {
                    score += 5;
                }
            }
        }
        
        return score;
    }
    
    // Jednoduché měření podobnosti řetězců
    calculateStringSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }
    
    // Levenshteinova vzdálenost
    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }
    
    // Extrahovat hlavní název záznamu
    extractMainName(record, type) {
        const names = this.extractAllNames(record, type);
        return names.length > 0 ? names[0] : '';
    }
    
    // Získat zobrazitelnou hodnotu
    getDisplayValue(value) {
        if (!value) return '';
        
        if (typeof value === 'object') {
            if (value.fields) {
                // Je to reference na jiný záznam
                return this.extractMainName(value, 'company'); // Defaultně předpokládat company
            }
            if (value.href && value.isMailto) {
                return value.href.replace('mailto:', '');
            }
            return JSON.stringify(value);
        }
        
        return String(value);
    }
    
    // === SPECIFICKÉ VYHLEDÁVACÍ FUNKCE ===
    
    // Najít kontakty podle firmy
    findContactsByCompany(companyName) {
        if (!companyName) return [];
        
        const companyLower = companyName.toLowerCase();
        const results = [];
        
        for (const item of this.searchIndex.contacts) {
            const contactData = item.record.fields || item.record;
            
            // Kontrolovat pole, která mohou obsahovat název firmy
            const companyFields = [
                contactData.company,
                contactData.firma,
                contactData.employer
            ];
            
            for (const field of companyFields) {
                if (field) {
                    const fieldValue = this.getDisplayValue(field).toLowerCase();
                    if (fieldValue.includes(companyLower) || companyLower.includes(fieldValue)) {
                        results.push(item.record);
                        break;
                    }
                }
            }
        }
        
        return results;
    }
    
    // Najít aktivity podle firmy
    findActivitiesByCompany(companyName) {
        if (!companyName) return [];
        
        const companyLower = companyName.toLowerCase();
        const results = [];
        
        for (const item of this.searchIndex.activities) {
            const activityData = item.record.fields || item.record;
            
            // Kontrolovat pole související s firmou
            const companyFields = [
                activityData.company,
                activityData.client,
                activityData.customer
            ];
            
            for (const field of companyFields) {
                if (field) {
                    const fieldValue = this.getDisplayValue(field).toLowerCase();
                    if (fieldValue.includes(companyLower)) {
                        results.push(item.record);
                        break;
                    }
                }
            }
        }
        
        return results;
    }
    
    // Najít obchodní případy podle firmy  
    findDealsByCompany(companyName) {
        if (!companyName) return [];
        
        const companyLower = companyName.toLowerCase();
        const results = [];
        
        for (const item of this.searchIndex.deals) {
            const dealData = item.record.fields || item.record;
            
            // Kontrolovat pole související s firmou
            const companyFields = [
                dealData.company,
                dealData.client,
                dealData.customer,
                dealData.name, // Název dealu často obsahuje název firmy
                dealData.nazev
            ];
            
            for (const field of companyFields) {
                if (field) {
                    const fieldValue = this.getDisplayValue(field).toLowerCase();
                    if (fieldValue.includes(companyLower)) {
                        results.push(item.record);
                        break;
                    }
                }
            }
        }
        
        return results;
    }
    
    // Najít aktivity podle kontaktu
    findActivitiesByContact(contactName) {
        if (!contactName) return [];
        
        const contactLower = contactName.toLowerCase();
        const results = [];
        
        for (const item of this.searchIndex.activities) {
            const activityData = item.record.fields || item.record;
            
            // Kontrolovat pole související s kontaktem
            const contactFields = [
                activityData.contact,
                activityData.owner,
                activityData.assignee
            ];
            
            for (const field of contactFields) {
                if (field) {
                    const fieldValue = this.getDisplayValue(field).toLowerCase();
                    if (fieldValue.includes(contactLower)) {
                        results.push(item.record);
                        break;
                    }
                }
            }
        }
        
        return results;
    }
    
    // Najít obchodní případy podle kontaktu
    findDealsByContact(contactName) {
        if (!contactName) return [];
        
        const contactLower = contactName.toLowerCase();
        const results = [];
        
        for (const item of this.searchIndex.deals) {
            const dealData = item.record.fields || item.record;
            
            // Kontrolovat pole související s kontaktem
            const contactFields = [
                dealData.contact,
                dealData.owner,
                dealData.assignee
            ];
            
            for (const field of contactFields) {
                if (field) {
                    const fieldValue = this.getDisplayValue(field).toLowerCase();
                    if (fieldValue.includes(contactLower)) {
                        results.push(item.record);
                        break;
                    }
                }
            }
        }
        
        return results;
    }
    
    // Aktualizovat index (když se změní data)
    updateIndex() {
        this.buildSearchIndex();
    }
}
