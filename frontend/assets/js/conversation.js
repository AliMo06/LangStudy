//base URL for backend endpoints
const API_URL = 'http://localhost:5000/api';

//maps full language names to codes used by backend
const languageMapping = {
    'English': 'en',
    'Spanish': 'es',
    'French': 'fr',
    'Arabic': 'ar'
};

//state variables for audio recording
let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];

//element references
let lang1Select, lang2Select, lang1Input, lang2Input, lang1Output, lang2Output;
let lang1Label, lang2Label, lang1OutputLabel, lang2OutputLabel;
let mic1Button, mic2Button;


/**
 * 
 * @param {string} langName //full language name (ex: english)
 * @returns {string}   //ISO language code (ex: en)
 */
function getLangCode(langName) {
    return languageMapping[langName] || 'en';
}

/**
 * 
 * @param {string} base64Audio //MP3 audio data in base64 format
 */
function playBase64Audio(base64Audio) {
    //create audio element with data URI
    const audio = new Audio('data:audio/mp3;base64,' + base64Audio);
    //play audio and catch errors
    audio.play().catch(error => {
        console.error('Error playing audio:', error);
    });
}

/**
 * //updates all UI labels/placeholders for a language selector
 * @param {HTMLSelectElement} selectElement 
 * @param {string} prefix
 */
function updateLanguageLabels(selectElement, prefix) {
    const value = selectElement.value;
    //update input label
    document.getElementById(`${prefix}Label`).textContent = value;
    //update output label
    document.getElementById(`${prefix}OutputLabel`).textContent = value;
    //update input placeholder text
    document.getElementById(`${prefix}Input`).placeholder = `Type in ${value}...`;
}

/**
 *  //Translates text from source input to target output
 * @param {string} sourceId 
 * @param {string} targetId 
 */
async function handleTranslate(sourceId, targetId) {
    const sourceInput = document.getElementById(sourceId);
    const targetOutput = document.getElementById(targetId);

    const inputText = sourceInput.value;
    const targetLangSelect = targetId.includes('lang1') ? lang1Select : lang2Select;
    const targetLangCode = getLangCode(targetLangSelect.value);

    //if input is empty, reset output to default state
    if (!inputText.trim()) {
        targetOutput.textContent = 'Translation will appear here...';
        targetOutput.classList.add('empty');
        return;
    }

    //show loading state
    targetOutput.textContent = 'Translating...';
    targetOutput.classList.remove('empty');

    try {
        //call backend translation API
        const response = await fetch(`${API_URL}/translate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: inputText,
                target_language: targetLangCode
            })
        });

        const data = await response.json();

        //check if request was successful
        if (!response.ok) {
            throw new Error(data.error || 'Translation failed');
        }

        //display translated text
        targetOutput.textContent = data.translated_text;
        targetOutput.classList.remove('empty');
    } catch (error) {
        console.error('Translation error:', error);
        //display error message
        targetOutput.textContent = `Error: ${error.message}`;
        targetOutput.classList.remove('empty');
    }
}


/**
 * //converts text to speech and plays it
 * 
 * @param {string} elementId -  //element ID containing text to speak
 */
window.speak = async function(elementId) {
    const element = document.getElementById(elementId);
    const text = element.tagName === 'TEXTAREA' ? element.value : element.textContent;

    //Don't speak if text is empty or default placeholder
    if (!text || text === 'Translation will appear here...' || text === 'Translating...') {
        return;
    }

    //determine which language to use for TTS
    const langSelect = elementId.includes('lang1') ? lang1Select : lang2Select;
    const langCode = getLangCode(langSelect.value);

    try {
        
        //call backend TTS API
        const response = await fetch(`${API_URL}/text-to-speech`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: text,
                language: langCode
            })
        });

        if (!response.ok) {
            throw new Error('TTS failed');
        }

        const data = await response.json();
        //play the returned audio
        playBase64Audio(data.audio);

    } catch (error) {
        console.error('TTS error:', error);
        alert('Error generating speech: ' + error.message);
    }
}


/**
 *  //Starts or stops audio recording for translation
 * 
 * @param {boolean} isLang1  //true if recording for language 1, false for language 2
 */
window.startRecording = async function(isLang1) {
    //get DOM elements based on which language is being recorded
    const micButton = isLang1 ? mic1Button : mic2Button;
    const sourceInput = isLang1 ? lang1Input : lang2Input;
    const targetOutput = isLang1 ? lang2Output : lang1Output;
    const targetLangSelect = isLang1 ? lang2Select : lang1Select;
    const targetLangCode = getLangCode(targetLangSelect.value);
    const sourceLangName = isLang1 ? lang1Select.value : lang2Select.value;

    //if already recording, stop the recording
    if (isRecording) {
        if (micButton.classList.contains('recording')) {
            mediaRecorder.stop();
        }
        isRecording = false;
        mic1Button.classList.remove('recording');
        mic2Button.classList.remove('recording');
        return;
    }

    try {
        //request microphone access
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        //request microphone access
        mediaRecorder.ondataavailable = event => {
            audioChunks.push(event.data);
        };

        //when recording stops, process the audio
        mediaRecorder.onstop = async () => {
            //stop all audio tracks
            stream.getTracks().forEach(track => track.stop());
            
            //reset recording state
            isRecording = false;
            mic1Button.classList.remove('recording');
            mic2Button.classList.remove('recording');
            
            //create audio blob from recorded chunks
            const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
            //send audio to backend for processing
            await processAudioWithBackend(audioBlob, targetLangCode, sourceInput, targetOutput, sourceLangName);
        };

        //start recording
        mediaRecorder.start();
        isRecording = true;
        micButton.classList.add('recording');
        //update UI to indicate recording state
        sourceInput.value = ''; 
        sourceInput.placeholder = `Listening in ${sourceLangName}... Speak now.`;
        targetOutput.textContent = 'Awaiting audio...';
        targetOutput.classList.remove('empty');
        
    } catch (error) {
        console.error('Error accessing microphone:', error);
        alert('Could not access microphone. Please ensure permissions are granted.');
    }
}

async function processAudioWithBackend(audioBlob, targetLangCode, sourceInput, targetOutput, sourceLangName) {
    //update UI to indicate processing state
    sourceInput.placeholder = `Processing audio from ${sourceLangName}...`;
    targetOutput.textContent = 'Transcribing, Translating, and Generating Audio...';
    targetOutput.classList.remove('empty');

    //prepare form data with audio file and target language
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.wav');
    formData.append('target_language', targetLangCode);

    try {
        //call backend full translation API
        const response = await fetch(`${API_URL}/full-translation`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        
        if (response.ok) {
            //display transcribed text in source input
            sourceInput.value = result.original_text;
            //display translated text in target output
            targetOutput.textContent = result.translated_text;
            targetOutput.classList.remove('empty');
            
            //play translated audio if available
            if (result.audio) {
                playBase64Audio(result.audio);
            }

        } else {
            throw new Error(result.error || 'Full translation failed on the server.');
        }
    } catch (error) {
        console.error('Full pipeline error:', error);
        //show error message in UI
        sourceInput.value = '';
        targetOutput.textContent = `Error: ${error.message}`;
        targetOutput.classList.remove('empty');
    }
    
    //reset source input placeholder
    sourceInput.placeholder = `Type in ${sourceLangName}...`; 
}



document.addEventListener('DOMContentLoaded', (event) => {
    //cache element references
    lang1Select = document.getElementById('lang1');
    lang2Select = document.getElementById('lang2');
    lang1Input = document.getElementById('lang1Input');
    lang2Input = document.getElementById('lang2Input');
    lang1Output = document.getElementById('lang1Output');
    lang2Output = document.getElementById('lang2Output');
    lang1Label = document.getElementById('lang1Label');
    lang2Label = document.getElementById('lang2Label');
    lang1OutputLabel = document.getElementById('lang1OutputLabel');
    lang2OutputLabel = document.getElementById('lang2OutputLabel');
    mic1Button = document.getElementById('mic1');
    mic2Button = document.getElementById('mic2');

    //initialize labels
    updateLanguageLabels(lang1Select, 'lang1'); 
    updateLanguageLabels(lang2Select, 'lang2');

    //retranslate when language 1 dropdown changes
    lang1Select.addEventListener('change', function() {
        updateLanguageLabels(this, 'lang1');
        //if theres text in lang2 input, retranslate it
        if (lang2Input.value.trim()) {
            handleTranslate('lang2Input', 'lang1Output');
        }
    });

    //retranslate when language 2 dropdown changes
    lang2Select.addEventListener('change', function() {
        updateLanguageLabels(this, 'lang2');

        //if theres text in lang1 input, retranslate it
        if (lang1Input.value.trim()) {
            handleTranslate('lang1Input', 'lang2Output');
        }
    });

    //delay in ms before triggering translation after user stops typing
    const translateDelay = 1000;
    
    //auto translate language 1 to language 2 with debouncing
    lang1Input.addEventListener('input', function() {
        clearTimeout(this.translateTimer);
        this.translateTimer = setTimeout(() => handleTranslate('lang1Input', 'lang2Output'), translateDelay);
    });

    //auto translate language 2 to language 1 with debouncing
    lang2Input.addEventListener('input', function() {
        clearTimeout(this.translateTimer);  //cancel previous timer
        this.translateTimer = setTimeout(() => handleTranslate('lang2Input', 'lang1Output'), translateDelay);
    });
});


//navigate back to previous page
window.goBack = function() {
    window.history.back();
}