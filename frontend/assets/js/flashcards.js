let flashcards = [];
let index = 0;
let swapped = false;

// Correct element IDs
const card = document.getElementById("question");
const answerBox = document.getElementById("answer");

const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const showBtn = document.getElementById("showBtn");
const swapBtn = document.getElementById("swapBtn");

// --- Read URL params ---
const params = new URLSearchParams(window.location.search);
const category = params.get("cat");   // basic_words or basic_phrases
const from = params.get("from");      // en, es, etc.
const to = params.get("to");          // en, es, etc.

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


function loadCard() {
  const cardData = flashcards[index];
  card.textContent = swapped ? cardData.a : cardData.q;
  answerBox.style.display = "none";
  document.getElementById("index").textContent = index + 1;
  document.getElementById("total").textContent = flashcards.length;
}


function showAnswer() {
  const cardData = flashcards[index];
  answerBox.textContent = swapped ? cardData.q : cardData.a;
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

// Load selected category
loadCategory(category);
