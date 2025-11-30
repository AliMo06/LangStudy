        let isRecording = false;
        let recognition = null;

        // initialize speech recognition if available
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

        function toggleSpeechInput() {
            if (!recognition) {
                alert('Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.');
                return;
            }

            if (isRecording) {
                recognition.stop();
                isRecording = false;
                document.getElementById('micButton').classList.remove('active');
                document.getElementById('micText').textContent = 'Speech Input';
            } else {
                recognition.start();
                isRecording = true;
                document.getElementById('micButton').classList.add('active');
                document.getElementById('micText').textContent = 'Listening...';
            }
        }

        function speakText(type) {
            const textArea = type === 'input' ? 'inputText' : 'outputText';
            const text = document.getElementById(textArea).value;

            if (!text) {
                alert('No text to speak');
                return;
            }

            if ('speechSynthesis' in window) {
                // stop any ongoing speech
                window.speechSynthesis.cancel();

                const utterance = new SpeechSynthesisUtterance(text);
                
                // set language based on target language for output
                if (type === 'output') {
                    const targetLang = document.getElementById('targetLanguage').value;
                    if (targetLang) {
                        utterance.lang = targetLang;
                    }
                }

                window.speechSynthesis.speak(utterance);
            } else {
                alert('Text-to-speech is not supported in your browser');
            }
            document.getElementById("logo-image").src = "assets/img/200.gif";
            setTimeout(function() {
            document.getElementById("logo-image").src = "assets/img/logo_cropped.png";
            }, 5000);
        }

        function updateCharCount(type) {
            const textArea = type === 'input' ? 'inputText' : 'outputText';
            const charCount = type === 'input' ? 'inputCharCount' : 'outputCharCount';
            const length = document.getElementById(textArea).value.length;
            document.getElementById(charCount).textContent = `${length} / 5000`;
        }

        function handleTranslate() {
            const inputText = document.getElementById('inputText').value;
            const targetLang = document.getElementById('targetLanguage').value;

            if (!inputText || !targetLang) {
                return;
            }

            // simulate translation (in real app, this would call a translation API)
            document.getElementById('outputText').value = `[Translated to ${targetLang}]: ${inputText}`;
            updateCharCount('output');
        }

        // auto-translate when input changes
        document.getElementById('inputText').addEventListener('input', function() {
            const targetLang = document.getElementById('targetLanguage').value;
            if (targetLang) {
                // add a small delay to avoid translating on every keystroke
                clearTimeout(this.translateTimer);
                this.translateTimer = setTimeout(handleTranslate, 500);
            }
        });