class I18n {
    constructor() {
        this.currentLang = localStorage.getItem('language') || 'en';
        this.translations = {};
    }

    async loadLanguage(lang) {
        try {
            const response = await fetch(`lang/${lang}.json`);
            this.translations = await response.json();
            this.currentLang = lang;
            localStorage.setItem('language', lang);
            this.updatePage();
        } catch (error) {
            console.error('Error loading language:', error);
        }
    }

    t(key) {
    const keys = key.split('.');
    let result = this.translations;
    for (let k of keys) {
        if (result[k] !== undefined) {
            result = result[k];
        } else {
            return key; // fallback
        }
    }
    return result;
}


    updatePage() {
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            element.textContent = this.t(key);
        });

         document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        element.placeholder = this.t(key);
    });
    }
}

const i18n = new I18n();