        // Update language labels when selection changes
        document.getElementById('lang1').addEventListener('change', function() {
            document.getElementById('lang1Label').textContent = this.value;
            document.getElementById('lang1Input').placeholder = `Type in ${this.value}...`;
        });

        document.getElementById('lang2').addEventListener('change', function() {
            document.getElementById('lang2Label').textContent = this.value;
            document.getElementById('lang2OutputLabel').textContent = this.value;
            document.getElementById('lang2Input').placeholder = `Type in ${this.value}...`;
        });

        // Translation function
        async function translate(text, fromLang, toLang, isLang1) {
            if (!text.trim()) return;

            try {
                const response = await fetch("https://api.anthropic.com/v1/messages", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        model: "claude-sonnet-4-20250514",
                        max_tokens: 1000,
                        messages: [{
                            role: "user",
                            content: `Translate the following text from ${fromLang} to ${toLang}. Only provide the translation, nothing else:\n\n${text}`
                        }],
                    })
                });

                const data = await response.json();
                const translation = data.content[0].text;

                if (isLang1) {
                    const outputEl = document.getElementById('lang2Output');
                    outputEl.textContent = translation;
                    outputEl.classList.remove('empty');
                } else {
                    const outputEl = document.getElementById('lang1Output');
                    outputEl.textContent = translation;
                    outputEl.classList.remove('empty');
                }
            } catch (error) {
                console.error('Translation error:', error);
            }
        }

        // Add blur event listeners for translation
        document.getElementById('lang1Input').addEventListener('blur', function() {
            const lang1 = document.getElementById('lang1').value;
            const lang2 = document.getElementById('lang2').value;
            translate(this.value, lang1, lang2, true);
        });

        document.getElementById('lang2Input').addEventListener('blur', function() {
            const lang1 = document.getElementById('lang1').value;
            const lang2 = document.getElementById('lang2').value;
            translate(this.value, lang2, lang1, false);
        });

        // Text-to-speech function
        function speak(elementId) {
            const element = document.getElementById(elementId);
            const text = element.tagName === 'TEXTAREA' ? element.value : element.textContent;
            
            if ('speechSynthesis' in window && text && text !== 'Translation will appear here...') {
                const utterance = new SpeechSynthesisUtterance(text);
                window.speechSynthesis.speak(utterance);
            }
        }

        // Speech recognition function
        function startRecording(isLang1) {
            if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
                alert('Speech recognition is not supported in your browser');
                return;
            }

            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognition = new SpeechRecognition();
            
            recognition.lang = isLang1 ? 'en-US' : 'es-ES';
            recognition.interimResults = false;

            const micButton = document.getElementById(isLang1 ? 'mic1' : 'mic2');

            recognition.onstart = function() {
                micButton.classList.add('recording');
            };

            recognition.onresult = function(event) {
                const transcript = event.results[0][0].transcript;
                const lang1 = document.getElementById('lang1').value;
                const lang2 = document.getElementById('lang2').value;

                if (isLang1) {
                    document.getElementById('lang1Input').value = transcript;
                    translate(transcript, lang1, lang2, true);
                } else {
                    document.getElementById('lang2Input').value = transcript;
                    translate(transcript, lang2, lang1, false);
                }
            };

            recognition.onend = function() {
                micButton.classList.remove('recording');
            };

            recognition.onerror = function(event) {
                console.error('Speech recognition error:', event.error);
                micButton.classList.remove('recording');
            };

            recognition.start();
        }

        // Back button function
        function goBack() {
            window.history.back();
        }