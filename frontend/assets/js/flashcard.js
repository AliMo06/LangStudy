// Read URL parameters
const params = new URLSearchParams(window.location.search);
const fromLang = params.get("from");
const toLang = params.get("to");
const category = params.get("cat");

// DOM elements
const questionText = document.getElementById("questionText");
const answerBox = document.getElementById("answerBox");
const answerText = document.getElementById("answerText");
const showAnswerBtn = document.getElementById("showAnswerBtn");
const switchBtn = document.getElementById("switchBtn");

let cards = [];
let currentIndex = 0;
let flipped = false;

// Load JSON data
fetch("data/flashcards.json")
  .then(res => res.json())
  .then(data => {
    // Get the array for selected category and languages
    if (data[category] && data[category][fromLang] && data[category][fromLang][toLang]) {
      cards = data[category][fromLang][toLang];
      showCard();
    } else {
      questionText.innerText = "No cards found for this selection.";
      showAnswerBtn.style.display = "none";
      switchBtn.style.display = "none";
    }
  })
  .catch(err => {
    console.error("Error loading flashcards:", err);
    questionText.innerText = "Error loading flashcards.";
  });

// Show current card
function showCard() {
  flipped = false;
  questionText.innerText = cards[currentIndex].question;
  answerText.innerText = "";
}

// Show answer button
showAnswerBtn.addEventListener("click", () => {
  cards.forEach(card => {
    [card.question, card.answer] = [card.answer, card.question];
  });
  showCard();
});

// Switch order button
switchBtn.addEventListener("click", () => {
    if (!flipped) {
    answerText.innerText = cards[currentIndex].answer;
    flipped = true;
  } else {
    // Move to next card
    currentIndex = (currentIndex + 1) % cards.length;
    showCard();
  }
});