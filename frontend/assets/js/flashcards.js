document.getElementById("basicWordsBtn").addEventListener("click", () => {
    goToFlashcards("basic_words");
});

document.getElementById("basicPhrasesBtn").addEventListener("click", () => {
    goToFlashcards("basic_phrases");
});

function goToFlashcards(category) {
    const from = document.getElementById("fromLang").value;
    const to = document.getElementById("toLang").value;

    // Pass values to next page using URL parameters
    const url = `flashcards.html?from=${from}&to=${to}&cat=${category}`;

    window.location.href = url;
}