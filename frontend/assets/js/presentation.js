//Base URL for backend API
const API_URL = 'http://localhost:5000/api';

// Variables for speech recognition and recording
let isRecording = false;
let recognition = null;
let mediaRecorder = null;
let audioChunks = [];

if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;  //stop after one result
    recognition.interimResults = false;  //onl y return final results

    // Handle speech recognition results
    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript;
        document.getElementById('inputText').value = transcript;
        updateCharCount('input');
        handleTranslate();
    };

    // Handle end of speech recognition
    recognition.onend = function() {
        isRecording = false;
        document.getElementById('micButton').classList.remove('active');
        document.getElementById('micText').textContent = 'Speech Input';
    };
}

// Toggle speech input (start/stop recording)
async function toggleSpeechInput() {
    if (isRecording) {
        //stop recording
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        isRecording = false;
        document.getElementById('micButton').classList.remove('active');
        document.getElementById('micText').textContent = 'Speech Input';
    } else {
        //start recording
        try {
            //request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];

            //collect audio data
            mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };

            //when recording stops, process the audio
            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });  //create audio blob
                await processAudioWithBackend(audioBlob);  //process with backend
                
                stream.getTracks().forEach(track => track.stop());  //stop all tracks
            };

            //start recording
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

//send recorded audio to backend for processing
async function processAudioWithBackend(audioBlob) {
    try {
        //indicate processing state
        document.getElementById('micText').textContent = 'Processing...';
        
        //prepare form data
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.wav');
        formData.append('target_language', document.getElementById('targetLanguage').value);

        //call backend full translation pipeline
        const response = await fetch(`${API_URL}/full-translation`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Translation failed');
        }

        const data = await response.json();
        
        //display transcribed original text
        document.getElementById('inputText').value = data.original_text;
        //display translated text
        document.getElementById('outputText').value = data.translated_text;
        //update character counters
        updateCharCount('input');  
        updateCharCount('output');

        //play translated audio if provided
        if (data.audio) {
            playBase64Audio(data.audio);
        }

        //reset mic button text
        document.getElementById('micText').textContent = 'Speech Input';
    } catch (error) {
        console.error('Error processing audio:', error);
        alert('Error processing audio: ' + error.message);
        document.getElementById('micText').textContent = 'Speech Input';
    }
}

//handle text translation
async function handleTranslate() {
    const inputText = document.getElementById('inputText').value;
    const targetLang = document.getElementById('targetLanguage').value;

    //exit if no input or target language
    if (!inputText || !targetLang) {
        return;
    }

    const outputTextArea = document.getElementById('outputText');
    const originalPlaceholder = outputTextArea.placeholder;
    //show loading state
    outputTextArea.placeholder = 'Translating...';

    try {
        //call backend translation API
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

        //display translated text
        outputTextArea.value = data.translated_text;
        outputTextArea.placeholder = originalPlaceholder;
        updateCharCount('output');
    } catch (error) {
        console.error('Translation error:', error);
        //show error in output area
        outputTextArea.value = '';
        outputTextArea.placeholder = `Error: ${error.message}. Please try again.`;
        
        //reset placeholder after a delay
        setTimeout(() => {
            if (outputTextArea.value === '') {
                outputTextArea.placeholder = originalPlaceholder;
            }
        }, 3000);
    }
}

//convert text to speech using backend gTTS API
async function speakText(type) {
    //determine which text area to read from
    const textArea = type === 'input' ? 'inputText' : 'outputText';
    const text = document.getElementById(textArea).value;

    //exit if no text
    if (!text) {
        alert('No text to speak');
        return;
    }

    try {
        //document.getElementById("logo-image").src = "assets/img/200.gif";
        
        ///determone language
        const lang = type === 'output' ? document.getElementById('targetLanguage').value : 'en';
        //call backend TTS API
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
        playBase64Audio(data.audio);  //play the generated audio

        setTimeout(function() {
            document.getElementById("logo-image").src = "assets/img/logo_cropped.png";
        }, 5000);
    } catch (error) {
        console.error('TTS error:', error);
        alert('Error generating speech: ' + error.message);
        //reset logo on error
        document.getElementById("logo-image").src = "assets/img/logo_cropped.png";
    }
}

function playBase64Audio(base64Audio) {
    //create audio element and play
    const audio = new Audio('data:audio/mp3;base64,' + base64Audio);
    audio.play().catch(error => {
        console.error('Error playing audio:', error);
    });
}

function updateCharCount(type) {
    //update character count for specified text area
    const textArea = type === 'input' ? 'inputText' : 'outputText';
    const charCount = type === 'input' ? 'inputCharCount' : 'outputCharCount';
    const length = document.getElementById(textArea).value.length;
    document.getElementById(charCount).textContent = `${length} / 5000`;
}

document.getElementById('inputText').addEventListener('input', function() {
    const targetLang = document.getElementById('targetLanguage').value;
    //only translate if target language is selected
    if (targetLang) {
        //clear previous timer
        clearTimeout(this.translateTimer);
        this.translateTimer = setTimeout(handleTranslate, 1000);
    }
});

// Go back to previous page
window.goBack = function() {
    window.history.back();
}