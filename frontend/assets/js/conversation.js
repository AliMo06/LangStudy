        // Update language labels when selection changes
        document.getElementById('lang1').addEventListener('change', function() {
            document.getElementById('lang1Label').textContent = this.value;
            document.getElementById('lang1OutputLabel').textContent = this.value;
            document.getElementById('lang1Input').placeholder = `Type in ${this.value}...`;
        });

        document.getElementById('lang2').addEventListener('change', function() {
            document.getElementById('lang2Label').textContent = this.value;
            document.getElementById('lang2OutputLabel').textContent = this.value;
            document.getElementById('lang2Input').placeholder = `Type in ${this.value}...`;
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

        // Back button function
        function goBack() {
            window.history.back();
        }