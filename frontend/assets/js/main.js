//initialize page language settings and language dropdown
document.addEventListener('DOMContentLoaded', async () => {
    //load saved language or default to English
    await i18n.loadLanguage(i18n.currentLang);
    //set dropdown to current language
    document.getElementById('language-dropdown').value = i18n.currentLang;
    //handle language change
    document.getElementById('language-dropdown').addEventListener('change', async (e) => {
        await i18n.loadLanguage(e.target.value);
    });
});