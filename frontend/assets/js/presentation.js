const API_URL = 'http://localhost:5000/api';

let isRecording = false;
let recognition = null;
let mediaRecorder = null;
let audioChunks = [];

if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript;
        document.getElementById('inputText').value = transcript;
        updateCharCount('input');
        handleTranslate();
    };

    recognition.onend = function() {
        isRecording = false;
        document.getElementById('micButton').classList.remove('active');
        document.getElementById('micText').textContent = 'Speech Input';
    };
}

async function toggleSpeechInput() {
    if (isRecording) {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        isRecording = false;
        document.getElementById('micButton').classList.remove('active');
        document.getElementById('micText').textContent = 'Speech Input';
    } else {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];

            mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                await processAudioWithBackend(audioBlob);
                
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            isRecording = true;
            document.getElementById('micButton').classList.add('active');
            document.getElementById('micText').textContent = 'Recording... (Click to stop)';
        } catch (error) {
            console.error('Error accessing microphone:', error);
            alert('Could not access microphone. Please check permissions.');
        }
    }
}

async function processAudioWithBackend(audioBlob) {
    try {
        document.getElementById('micText').textContent = 'Processing...';
        
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.wav');
        formData.append('target_language', document.getElementById('targetLanguage').value);

        const response = await fetch(`${API_URL}/full-translation`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Translation failed');
        }

        const data = await response.json();
        
        document.getElementById('inputText').value = data.original_text;
        document.getElementById('outputText').value = data.translated_text;
        updateCharCount('input');
        updateCharCount('output');

        if (data.audio) {
            playBase64Audio(data.audio);
        }

        document.getElementById('micText').textContent = 'Speech Input';
    } catch (error) {
        console.error('Error processing audio:', error);
        alert('Error processing audio: ' + error.message);
        document.getElementById('micText').textContent = 'Speech Input';
    }
}

async function handleTranslate() {
    const inputText = document.getElementById('inputText').value;
    const targetLang = document.getElementById('targetLanguage').value;

    if (!inputText || !targetLang) {
        return;
    }

    const outputTextArea = document.getElementById('outputText');
    const originalPlaceholder = outputTextArea.placeholder;
    outputTextArea.placeholder = 'Translating...';

    try {
        const response = await fetch(`${API_URL}/translate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: inputText,
                target_language: targetLang
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Translation failed');
        }

        outputTextArea.value = data.translated_text;
        outputTextArea.placeholder = originalPlaceholder;
        updateCharCount('output');
    } catch (error) {
        console.error('Translation error:', error);
        outputTextArea.value = '';
        outputTextArea.placeholder = `Error: ${error.message}. Please try again.`;
        
        setTimeout(() => {
            if (outputTextArea.value === '') {
                outputTextArea.placeholder = originalPlaceholder;
            }
        }, 3000);
    }
}

async function speakText(type) {
    const textArea = type === 'input' ? 'inputText' : 'outputText';
    const text = document.getElementById(textArea).value;

    if (!text) {
        alert('No text to speak');
        return;
    }

    try {
        //document.getElementById("logo-image").src = "assets/img/200.gif";
        
        const lang = type === 'output' ? document.getElementById('targetLanguage').value : 'en';
        
        const response = await fetch(`${API_URL}/text-to-speech`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: text,
                language: lang
            })
        });

        if (!response.ok) {
            throw new Error('TTS failed');
        }

        const data = await response.json();
        playBase64Audio(data.audio);

        setTimeout(function() {
            document.getElementById("logo-image").src = "assets/img/logo_cropped.png";
        }, 5000);
    } catch (error) {
        console.error('TTS error:', error);
        alert('Error generating speech: ' + error.message);
        document.getElementById("logo-image").src = "assets/img/logo_cropped.png";
    }
}

function playBase64Audio(base64Audio) {
    const audio = new Audio('data:audio/mp3;base64,' + base64Audio);
    audio.play().catch(error => {
        console.error('Error playing audio:', error);
    });
}

function updateCharCount(type) {
    const textArea = type === 'input' ? 'inputText' : 'outputText';
    const charCount = type === 'input' ? 'inputCharCount' : 'outputCharCount';
    const length = document.getElementById(textArea).value.length;
    document.getElementById(charCount).textContent = `${length} / 5000`;
}

document.getElementById('inputText').addEventListener('input', function() {
    const targetLang = document.getElementById('targetLanguage').value;
    if (targetLang) {
        clearTimeout(this.translateTimer);
        this.translateTimer = setTimeout(handleTranslate, 1000);
    }
});

window.goBack = function() {
    window.history.back();
}