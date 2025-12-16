// Track selected languages
let selectedSpeaks = [];
let selectedLearning = [];

window.addEventListener('DOMContentLoaded', async function() {
    //set up event listeners for language selection buttons
    setupLanguageSelection();
    //load initial set of language exchange requests
    await loadExchangeRequests();
    
    // Refresh requests every 10 seconds
    setInterval(loadExchangeRequests, 10000);
});

//sets up event listeners for language selection buttons and publish button
function setupLanguageSelection() {
    const speaksGrid = document.getElementById('speaksGrid');
    const learningGrid = document.getElementById('learningGrid');
    const publishBtn = document.getElementById('publishBtn');
    
    // Handle "speaks" language selection
    speaksGrid.addEventListener('click', (e) => {
        //check if a language button was clicked
        if (e.target.classList.contains('language-btn')) {
            const lang = e.target.dataset.lang;
            e.target.classList.toggle('selected');
            
            //add or remove language from selectedSpeaks array
            if (selectedSpeaks.includes(lang)) {
                //remove language
                selectedSpeaks = selectedSpeaks.filter(l => l !== lang);
            } else {
                //add language
                selectedSpeaks.push(lang);
            }
        }
    });
    
    // Handle "learning" language selection
    learningGrid.addEventListener('click', (e) => {
        if (e.target.classList.contains('language-btn')) {
            const lang = e.target.dataset.lang;
            e.target.classList.toggle('selected');
            
            //add or remove language from selectedLearning array
            if (selectedLearning.includes(lang)) {
                selectedLearning = selectedLearning.filter(l => l !== lang);
            } else {
                selectedLearning.push(lang);
            }
        }
    });
    
    // Handle publish button
    publishBtn.addEventListener('click', publishRequest);
}

async function publishRequest() {
    if (selectedSpeaks.length === 0) {
        alert(i18n.t('exchange.selectSpeaks'));
        return;
    }
    
    if (selectedLearning.length === 0) {
        //validate that user selected at least one language they speack
        alert(i18n.t('exchange.selectLearning'));
        return;
    }
    
    try {
        //send exchange request to backend
        const response = await fetch('/publish-exchange-request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                speaks: selectedSpeaks, //languages user can teach
                learning: selectedLearning  //languages user want to learn
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert(i18n.t('exchange.requestPublished'));
            // Clear selections
            document.querySelectorAll('.language-btn.selected').forEach(btn => {
                btn.classList.remove('selected');
            });
            //reset selection arrays
            selectedSpeaks = [];
            selectedLearning = [];
            
            // Reload requests
            await loadExchangeRequests();
        } else {
            alert(i18n.t('exchange.failedToPublish') + data.message);
        }
    } catch (error) {
        console.error('Error publishing request:', error);
        alert(i18n.t('exchange.errorPublishing'));
    }
}

//fetch all language exchange requests from backend
async function loadExchangeRequests() {
    try {
        //request list of exchange requests from backend
        const response = await fetch('/get-exchange-requests', {
            method: 'GET',
            credentials: 'include'  //include cookies for session
        });
        
        const data = await response.json();
        
        if (data.success) {
            //display the retrieved requests
            displayExchangeRequests(data.requests);
        } else {
            console.error('Failed to load requests:', data.message);
        }
    } catch (error) {
        console.error('Error loading requests:', error);
    }
}

//display language exchange requests as cards in the UI
function displayExchangeRequests(requests) {
    const container = document.getElementById('exchangeContainer');
    //clear existing content
    container.innerHTML = '';
    
    //show message if no requests are available
    if (requests.length === 0) {
        container.innerHTML = `<p style="text-align: center; color: #666; padding: 20px;">${i18n.t('exchange.noRequests')}</p>`;
        return;
    }
    
    //create a card for each exchange request
    requests.forEach(request => {
        //create card element
        const card = document.createElement('div');
        card.className = 'user-card';
        
        //display user name
        const name = document.createElement('h2');
        name.className = 'name';
        name.textContent = request.fullname || request.username;
        
        //create section for languages they speak
        const speaksDiv = document.createElement('div');
        speaksDiv.className = 'tags';
        const speaksLabel = document.createElement('span');
        speaksLabel.className = 'section-label';
        speaksLabel.textContent = i18n.t('exchange.speaks');
        speaksDiv.appendChild(speaksLabel);
        
        //add a tag for each language they speak
        request.speaks.forEach(lang => {
            const tag = document.createElement('span');
            tag.className = 'tag';
            tag.textContent = lang;
            speaksDiv.appendChild(tag);
        });
        
        //create section for languages theyre learning
        const learningDiv = document.createElement('div');
        learningDiv.className = 'tags';
        const learningLabel = document.createElement('span');
        learningLabel.className = 'section-label';
        learningLabel.textContent = i18n.t('exchange.learning');
        learningDiv.appendChild(learningLabel);
        
        //add a tag for each language theyre learning
        request.learning.forEach(lang => {
            const tag = document.createElement('span');
            tag.className = 'tag';
            tag.textContent = lang;
            learningDiv.appendChild(tag);
        });
        
        //create connect button
        const connectBtn = document.createElement('button');
        connectBtn.className = 'accept-btn';
        connectBtn.textContent = i18n.t('exchange.connect');
        connectBtn.onclick = () => connectToUser(request.user_id, request.username);
        
        //assemble the card
        card.appendChild(name);
        card.appendChild(speaksDiv);
        card.appendChild(learningDiv);
        card.appendChild(connectBtn);
        
        //add card to container
        container.appendChild(card);
    });
}

//Establishes a language exchange connection with another user
async function connectToUser(userId, username) {
    //confirm user wants to connect
    if (confirm(i18n.t('exchange.confirmConnect').replace('{username}', username))) {
        try {
            //send connection request to backend
            const response = await fetch('/connect-exchange', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',  //include cookies for session
                body: JSON.stringify({ partner_id: userId })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Redirect to exchange chat room
                window.location.href = `/exchange_chat.html?partner_id=${userId}`;
            } else {
                alert(i18n.t('exchange.failedToConnect') + data.message);
            }
        } catch (error) {
            console.error('Error connecting:', error);
            alert(i18n.t('exchange.errorConnecting'));
        }
    }
}


// Handle language change from dropdown
const languageDropdown = document.getElementById('language-dropdown');
if (languageDropdown) {
    languageDropdown.addEventListener('change', async () => {
        //reload page to apply new language setting
        setTimeout(async () => {
            await (window.location.href = window.location.href);
        }, 50);
    });
}