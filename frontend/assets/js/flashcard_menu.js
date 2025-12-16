//get references to the language selection dropdowns
const fromLang = document.getElementById("fromLang");
const toLang = document.getElementById("toLang");

// check which languages are selected and disable the matching ones because you don't need to have 2 of the same language
function updateLanguageOptions() {
    const fromValue = fromLang.value;
    const toValue = toLang.value;
    
    // disable the selected "from" language in the "to" dropdown
    for (let option of toLang.options) {
        if (option.value === fromValue) {
            option.disabled = true;  //make unselectable
            option.style.opacity = "0.4";  //visually indicate disabled state
        } else {
            option.disabled = false;  //re enable option
            option.style.opacity = "1";  //reset opacity
        }
    }
    
    // disable the selected "to" language in the "from" dropdown
    for (let option of fromLang.options) {
        if (option.value === toValue) {
            option.disabled = true;
            option.style.opacity = "0.4";
        } else {
            option.disabled = false;
            option.style.opacity = "1";
        }
    }
    
    // if both dropdowns somehow have the same language automatically switch one
    if (fromValue === toValue) {
        //try to select the first option that is not the same as fromValue
        if (toLang.options[0].value !== fromValue) {
            toLang.value = toLang.options[0].value;
        } else {
            //select the second option
            toLang.value = toLang.options[1].value;
        }
        //recursively call to update the UI after the change
        updateLanguageOptions();
    }
}

// run the check whenever either dropdown changes
fromLang.addEventListener("change", updateLanguageOptions);
toLang.addEventListener("change", updateLanguageOptions);

// run once on page load
updateLanguageOptions();

//navigate to basic words flashcards
document.getElementById("basicWordsBtn").addEventListener("click", () => {
    goToFlashcards("basic_words");
});

//navigate to basic phrases flashcards
document.getElementById("basicPhrasesBtn").addEventListener("click", () => {
    goToFlashcards("basic_phrases");
});

//navigate to basic sentences flashcards
document.getElementById("basicSentencesBtn").addEventListener("click", () => {
    goToFlashcards("basic_sentences");
});

//function to navigate to flashcards page with selected languages and category
function goToFlashcards(category) {
    const from = fromLang.value;
    const to = toLang.value;
    
    const url = `flashcards.html?from=${from}&to=${to}&cat=${category}`;
    //redirect to flashcards page
    window.location.href = url;
}