let flashcards = [];   //array to hold flashcards
let index = 0;  //current flashcard index
let swapped = false;  //flag for question/answer swap

const cardText = document.querySelector(".question-text");  //question text element
const answerText = document.querySelector(".answer-text");  //answer text element
const card = document.getElementById("question");  //question card container
const answerBox = document.getElementById("answer");  //answer box container

//navigation buttons
const prevBtn = document.getElementById("prevBtn"); //previous button
const nextBtn = document.getElementById("nextBtn");  //next button
const showBtn = document.getElementById("showBtn");  //show answer button
const swapBtn = document.getElementById("swapBtn");  //swap Q/A button

// URL params
const params = new URLSearchParams(window.location.search);
const category = params.get("cat");  //category param
const from = params.get("from");  //from language param
const to = params.get("to");  //target language param

// Update category label using i18n
function updateCategoryLabel() {
    let key;
    switch (category) {
        case "basic_words": key = "flashcards.categories.words"; break;
        case "basic_phrases": key = "flashcards.categories.phrases"; break;
        case "basic_sentences": key = "flashcards.categories.sentences"; break;
        default: key = "flashcards.title";  //default case
    }
    //update the category label with translated text
    document.getElementById("categoryLabel").textContent = i18n.t(key);
}

// Load flashcards JSON
async function loadCategory(category) {
    try {
        //fetch flashcards data
        const res = await fetch("data/flashcards.json");
        const data = await res.json();
        //construct language key
        const langKey = `${from}-${to}`;

        //check if category and language pair exist
        if (!data[category] || !data[category][langKey]) {
            console.error(`No flashcards found for ${langKey}`);
            flashcards = [];
            return;
        }

        flashcards = data[category][langKey];  //load flashcards
        //reset index and swapped flag
        index = 0;  
        swapped = false;
        loadCard();  //load the first card
        updateCategoryLabel();  //update category label

    } catch (err) {
        console.error("Error loading flashcards:", err);
    }
}

// Load one flashcard
function loadCard() {
    //exit if no flashcards
    if (!flashcards.length) return;
    //get current card data
    const cardData = flashcards[index];
    cardText.textContent = swapped ? cardData.a : cardData.q;  //set question text
    answerBox.style.display = "none";  //hide answer box

    //update index display
    document.getElementById("index").textContent = index + 1;
    document.getElementById("total").textContent = flashcards.length;
}

// Show answer
function showAnswer() {
    const cardData = flashcards[index];
    //display answer or question based on swapped flag
    answerText.textContent = swapped ? cardData.q : cardData.a;
    answerBox.style.display = "block"; //show answer box
}

// Navigation buttons
prevBtn.onclick = () => { index = (index - 1 + flashcards.length) % flashcards.length; loadCard(); };
nextBtn.onclick = () => { index = (index + 1) % flashcards.length; loadCard(); };
showBtn.onclick = showAnswer;
swapBtn.onclick = () => { swapped = !swapped; loadCard(); };

// TTS
function speak(text, lang) {
    //check for TTS support
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();  //stop any ongoing speech
        const utterance = new SpeechSynthesisUtterance(text);  //create utterance
        const langMap = { en: 'en-US', es: 'es-ES', fr: 'fr-FR', ar: 'ar-SA' }; //language code map
        utterance.lang = langMap[lang] || 'en-US';  //set language
        utterance.rate = 0.9;  //set speech rate
        window.speechSynthesis.speak(utterance);  //speak the text
    } else {
        alert(i18n.t('flashcards.ttsNotSupported')); //alert if TTS not supported
    }
}

// Speaker buttons
document.addEventListener('click', function(e) {
    //only proceed if a pronounce button was clicked
    if (!e.target.classList.contains('pronounce-btn')) return; //pronounce button clicked
    const parentBox = e.target.closest('.question-box, .answer-box'); //find parent box
    const text = parentBox.id === 'question' ? cardText.textContent : answerText.textContent;  //get text to speak
    const lang = swapped  //determine language based on swap state and box
        ? (parentBox.id === 'question' ? to : from)
        : (parentBox.id === 'question' ? from : to);
    speak(text, lang);  //speak the text in the appropriate language
});

// Initialize page after i18n loads
document.addEventListener('DOMContentLoaded', async () => {
    //wait for i18n to load current language
    await i18n.loadLanguage(i18n.currentLang);
    //load flashcards for the selected category
    loadCategory(category);
});
