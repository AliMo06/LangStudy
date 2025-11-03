document.addEventListener('DOMContentLoaded', async () => {
    await i18n.loadLanguage(i18n.currentLang);
    document.getElementById('language-dropdown').value = i18n.currentLang;
    
    document.getElementById('language-dropdown').addEventListener('change', async (e) => {
        await i18n.loadLanguage(e.target.value);
    });
});