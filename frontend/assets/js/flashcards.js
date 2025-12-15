let flashcards = [];
let index = 0;
let swapped = false;

const cardText = document.querySelector(".question-text");
const answerText = document.querySelector(".answer-text");
const card = document.getElementById("question");
const answerBox = document.getElementById("answer");

const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const showBtn = document.getElementById("showBtn");
const swapBtn = document.getElementById("swapBtn");

// URL params
const params = new URLSearchParams(window.location.search);
const category = params.get("cat");
const from = params.get("from");
const to = params.get("to");

// Update category label using i18n
function updateCategoryLabel() {
    let key;
    switch (category) {
        case "basic_words": key = "flashcards.categories.words"; break;
        case "basic_phrases": key = "flashcards.categories.phrases"; break;
        case "basic_sentences": key = "flashcards.categories.sentences"; break;
        default: key = "flashcards.title";
    }
    document.getElementById("categoryLabel").textContent = i18n.t(key);
}

// Load flashcards JSON
async function loadCategory(category) {
    try {
        const res = await fetch("data/flashcards.json");
        const data = await res.json();
        const langKey = `${from}-${to}`;

        if (!data[category] || !data[category][langKey]) {
            console.error(`No flashcards found for ${langKey}`);
            flashcards = [];
            return;
        }

        flashcards = data[category][langKey];
        index = 0;
        swapped = false;
        loadCard();
        updateCategoryLabel();

    } catch (err) {
        console.error("Error loading flashcards:", err);
    }
}

// Load one flashcard
function loadCard() {
    if (!flashcards.length) return;
    const cardData = flashcards[index];
    cardText.textContent = swapped ? cardData.a : cardData.q;
    answerBox.style.display = "none";
    document.getElementById("index").textContent = index + 1;
    document.getElementById("total").textContent = flashcards.length;
}

// Show answer
function showAnswer() {
    const cardData = flashcards[index];
    answerText.textContent = swapped ? cardData.q : cardData.a;
    answerBox.style.display = "block";
}

// Navigation buttons
prevBtn.onclick = () => { index = (index - 1 + flashcards.length) % flashcards.length; loadCard(); };
nextBtn.onclick = () => { index = (index + 1) % flashcards.length; loadCard(); };
showBtn.onclick = showAnswer;
swapBtn.onclick = () => { swapped = !swapped; loadCard(); };

// TTS
function speak(text, lang) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        const langMap = { en: 'en-US', es: 'es-ES', fr: 'fr-FR', ar: 'ar-SA' };
        utterance.lang = langMap[lang] || 'en-US';
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
    } else {
        alert(i18n.t('flashcards.ttsNotSupported'));
    }
}

// Speaker buttons
document.addEventListener('click', function(e) {
    if (!e.target.classList.contains('pronounce-btn')) return;
    const parentBox = e.target.closest('.question-box, .answer-box');
    const text = parentBox.id === 'question' ? cardText.textContent : answerText.textContent;
    const lang = swapped
        ? (parentBox.id === 'question' ? to : from)
        : (parentBox.id === 'question' ? from : to);
    speak(text, lang);
});

// Initialize page after i18n loads
document.addEventListener('DOMContentLoaded', async () => {
    await i18n.loadLanguage(i18n.currentLang);
    loadCategory(category);
});
