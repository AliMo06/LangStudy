let flashcards = []; // data from flashcards.json
let index = 0; //current flashcard
let swapped = false;

// Correct element IDs
const card = document.getElementById("question");
const answerBox = document.getElementById("answer");

const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const showBtn = document.getElementById("showBtn");
const swapBtn = document.getElementById("swapBtn");

// Read URL parameters from passed in url
const params = new URLSearchParams(window.location.search);
const category = params.get("cat");   // selected category (words/phrases)
const from = params.get("from");      // from language
const to = params.get("to");          // to language

// Category names are mapped for display on the page
const categoryNames = {
    basic_words: "Basic Words",
    basic_phrases: "Basic Phrases",
    basic_sentences: "Basic Sentences"
};

// Display the category
document.getElementById("categoryLabel").textContent = categoryNames[category] || "Flashcards";

// text to speech function
function speak(text, lang) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        
        // map language codes to speech synthesis language codes
        const langMap = {
            'en': 'en-US',
            'es': 'es-ES',
            'fr': 'fr-FR',
            'ar': 'ar-SA'
        };
        
        utterance.lang = langMap[lang] || 'en-US';
        utterance.rate = 0.9;
        
        window.speechSynthesis.speak(utterance);
    } else {
        alert('Text-to-speech not supported in this browser');
    }
}

// Load JSON and set flashcards for chosen category
async function loadCategory(category) {
  try {
    const res = await fetch("data/flashcards.json");
    const data = await res.json();

    // Build key from selected languages
    const langKey = `${from}-${to}`;

    if (!data[category][langKey]) {
      console.error(`No flashcards found for ${langKey}`);
      flashcards = [];
      return;
    }

    flashcards = data[category][langKey];
    index = 0;
    swapped = false;
    loadCard();

  } catch (err) {
    console.error("Error loading flashcards:", err);
  }
}

// Display the word/phrase
const cardText = document.querySelector(".question-text");
const answerText = document.querySelector(".answer-text");

function loadCard() {
  const cardData = flashcards[index];
  cardText.textContent = swapped ? cardData.a : cardData.q;
  answerBox.style.display = "none";
  document.getElementById("index").textContent = index + 1;
  document.getElementById("total").textContent = flashcards.length;
}

// Show answer button
function showAnswer() {
  const cardData = flashcards[index];
  answerText.textContent = swapped ? cardData.q : cardData.a;
  answerBox.style.display = "block";
}

// Navigation
prevBtn.onclick = () => {
  index = (index - 1 + flashcards.length) % flashcards.length;
  loadCard();
};

nextBtn.onclick = () => {
  index = (index + 1) % flashcards.length;
  loadCard();
};

showBtn.onclick = showAnswer;

swapBtn.onclick = () => {
  swapped = !swapped;
  loadCard();
};


// add click handlers for the speaker buttons
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('pronounce-btn')) {
        const parentBox = e.target.closest('.question-box, .answer-box');
        
        if (parentBox.id === 'question') {
            // speaking the question
            const text = cardText.textContent;
            const lang = swapped ? to : from;
            speak(text, lang);
        } else if (parentBox.id === 'answer') {
            // speaking the answer
            const text = answerText.textContent;
            const lang = swapped ? from : to;
            speak(text, lang);
        }
    }
});

// Load selected category
loadCategory(category);