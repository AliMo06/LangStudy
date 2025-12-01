// Wait for either button to be pressed, and pass in the category
document.getElementById("basicWordsBtn").addEventListener("click", () => {
    goToFlashcards("basic_words");
});

document.getElementById("basicPhrasesBtn").addEventListener("click", () => {
    goToFlashcards("basic_phrases");
});

// Based on the chosen language and category, redirect to the right flashcards
function goToFlashcards(category) {
    const from = document.getElementById("fromLang").value;
    const to = document.getElementById("toLang").value;

    // Pass values to next page using URL parameters
    const url = `flashcards.html?from=${from}&to=${to}&cat=${category}`;

    window.location.href = url;
}