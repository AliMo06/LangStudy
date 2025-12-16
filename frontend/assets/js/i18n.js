//internationalization mclass for multi language support
//handles loading language files and translating text
class I18n {
    constructor() {
        //get saved language from local storage or default to English
        this.currentLang = localStorage.getItem('language') || 'en';
        //object to hold translations
        this.translations = {};
    }

    //loads translations for a given language
    async loadLanguage(lang) {
        try {
            //fetch language file
            const response = await fetch(`lang/${lang}.json`);
            this.translations = await response.json(); //parse json
            this.currentLang = lang;  //update current language
            localStorage.setItem('language', lang);  //save to local storage
            this.updatePage();  //update all translatable elements on page
        } catch (error) {
            console.error('Error loading language:', error);
        }
    }

    t(key) {
    //split keys by dot for nested access
    const keys = key.split('.');
    let result = this.translations;  //start from root translations
    //navigate through nested objects
    for (let k of keys) {
        if (result[k] !== undefined) {
            result = result[k];
        } else {
            return key; // fallback
        }
    }
    return result;
}

    //updates all elements with data-i18n attributes
    updatePage() {
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');  //get translation key
            element.textContent = this.t(key);  //update the elements placeholder with translated text
        });

        //placeholder support
         document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        element.placeholder = this.t(key);
    });
    }
}

//create global i18n instance that can be used throughout the app
const i18n = new I18n();