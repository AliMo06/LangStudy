const API_URL = 'http://localhost:5000/api';

const languageMapping = {
    'English': 'en',
    'Spanish': 'es',
    'French': 'fr',
    'Arabic': 'ar'
};

let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];

let lang1Select, lang2Select, lang1Input, lang2Input, lang1Output, lang2Output;
let lang1Label, lang2Label, lang1OutputLabel, lang2OutputLabel;
let mic1Button, mic2Button;


/**
 * 
 * @param {string} langName 
 * @returns {string} 
 */
function getLangCode(langName) {
    return languageMapping[langName] || 'en';
}

/**
 * 
 * @param {string} base64Audio 
 */
function playBase64Audio(base64Audio) {
    const audio = new Audio('data:audio/mp3;base64,' + base64Audio);
    audio.play().catch(error => {
        console.error('Error playing audio:', error);
    });
}

/**
 * 
 * @param {HTMLSelectElement} selectElement 
 * @param {string} prefix
 */
function updateLanguageLabels(selectElement, prefix) {
    const value = selectElement.value;
    document.getElementById(`${prefix}Label`).textContent = value;
    document.getElementById(`${prefix}OutputLabel`).textContent = value;
    document.getElementById(`${prefix}Input`).placeholder = `Type in ${value}...`;
}

/**
 * 
 * @param {string} sourceId 
 * @param {string} targetId 
 */
async function handleTranslate(sourceId, targetId) {
    const sourceInput = document.getElementById(sourceId);
    const targetOutput = document.getElementById(targetId);

    const inputText = sourceInput.value;
    const targetLangSelect = targetId.includes('lang1') ? lang1Select : lang2Select;
    const targetLangCode = getLangCode(targetLangSelect.value);

    if (!inputText.trim()) {
        targetOutput.textContent = 'Translation will appear here...';
        targetOutput.classList.add('empty');
        return;
    }

    targetOutput.textContent = 'Translating...';
    targetOutput.classList.remove('empty');

    try {
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

        if (!response.ok) {
            throw new Error(data.error || 'Translation failed');
        }

        targetOutput.textContent = data.translated_text;
        targetOutput.classList.remove('empty');
    } catch (error) {
        console.error('Translation error:', error);
        targetOutput.textContent = `Error: ${error.message}`;
        targetOutput.classList.remove('empty');
    }
}


/**
 * 
 * @param {string} elementId -
 */
window.speak = async function(elementId) {
    const element = document.getElementById(elementId);
    const text = element.tagName === 'TEXTAREA' ? element.value : element.textContent;

    if (!text || text === 'Translation will appear here...' || text === 'Translating...') {
        return;
    }

    const langSelect = elementId.includes('lang1') ? lang1Select : lang2Select;
    const langCode = getLangCode(langSelect.value);

    try {
        
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
        playBase64Audio(data.audio);

    } catch (error) {
        console.error('TTS error:', error);
        alert('Error generating speech: ' + error.message);
    }
}


/**
 *
 * @param {boolean} isLang1
 */
window.startRecording = async function(isLang1) {
    const micButton = isLang1 ? mic1Button : mic2Button;
    const sourceInput = isLang1 ? lang1Input : lang2Input;
    const targetOutput = isLang1 ? lang2Output : lang1Output;
    const targetLangSelect = isLang1 ? lang2Select : lang1Select;
    const targetLangCode = getLangCode(targetLangSelect.value);
    const sourceLangName = isLang1 ? lang1Select.value : lang2Select.value;

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
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = event => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
            stream.getTracks().forEach(track => track.stop());
            
            isRecording = false;
            mic1Button.classList.remove('recording');
            mic2Button.classList.remove('recording');
            
            const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
            await processAudioWithBackend(audioBlob, targetLangCode, sourceInput, targetOutput, sourceLangName);
        };

        mediaRecorder.start();
        isRecording = true;
        micButton.classList.add('recording');
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
    sourceInput.placeholder = `Processing audio from ${sourceLangName}...`;
    targetOutput.textContent = 'Transcribing, Translating, and Generating Audio...';
    targetOutput.classList.remove('empty');

    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.wav');
    formData.append('target_language', targetLangCode);

    try {
        const response = await fetch(`${API_URL}/full-translation`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        
        if (response.ok) {
            sourceInput.value = result.original_text;
            targetOutput.textContent = result.translated_text;
            targetOutput.classList.remove('empty');
            
            if (result.audio) {
                playBase64Audio(result.audio);
            }

        } else {
            throw new Error(result.error || 'Full translation failed on the server.');
        }
    } catch (error) {
        console.error('Full pipeline error:', error);
        sourceInput.value = '';
        targetOutput.textContent = `Error: ${error.message}`;
        targetOutput.classList.remove('empty');
    }
    
    sourceInput.placeholder = `Type in ${sourceLangName}...`; 
}



document.addEventListener('DOMContentLoaded', (event) => {
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

    updateLanguageLabels(lang1Select, 'lang1'); 
    updateLanguageLabels(lang2Select, 'lang2');

    lang1Select.addEventListener('change', function() {
        updateLanguageLabels(this, 'lang1');
        if (lang2Input.value.trim()) {
            handleTranslate('lang2Input', 'lang1Output');
        }
    });

    lang2Select.addEventListener('change', function() {
        updateLanguageLabels(this, 'lang2');

        if (lang1Input.value.trim()) {
            handleTranslate('lang1Input', 'lang2Output');
        }
    });

    const translateDelay = 1000;
    
    lang1Input.addEventListener('input', function() {
        clearTimeout(this.translateTimer);
        this.translateTimer = setTimeout(() => handleTranslate('lang1Input', 'lang2Output'), translateDelay);
    });

    lang2Input.addEventListener('input', function() {
        clearTimeout(this.translateTimer);
        this.translateTimer = setTimeout(() => handleTranslate('lang2Input', 'lang1Output'), translateDelay);
    });
});


window.goBack = function() {
    window.history.back();
}