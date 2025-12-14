// Track selected languages
let selectedSpeaks = [];
let selectedLearning = [];

window.addEventListener('DOMContentLoaded', async function() {
    setupLanguageSelection();
    await loadExchangeRequests();
    
    // Refresh requests every 10 seconds
    setInterval(loadExchangeRequests, 10000);
});

function setupLanguageSelection() {
    const speaksGrid = document.getElementById('speaksGrid');
    const learningGrid = document.getElementById('learningGrid');
    const publishBtn = document.getElementById('publishBtn');
    
    // Handle "speaks" language selection
    speaksGrid.addEventListener('click', (e) => {
        if (e.target.classList.contains('language-btn')) {
            const lang = e.target.dataset.lang;
            e.target.classList.toggle('selected');
            
            if (selectedSpeaks.includes(lang)) {
                selectedSpeaks = selectedSpeaks.filter(l => l !== lang);
            } else {
                selectedSpeaks.push(lang);
            }
        }
    });
    
    // Handle "learning" language selection
    learningGrid.addEventListener('click', (e) => {
        if (e.target.classList.contains('language-btn')) {
            const lang = e.target.dataset.lang;
            e.target.classList.toggle('selected');
            
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
        alert('Please select at least one language you speak');
        return;
    }
    
    if (selectedLearning.length === 0) {
        alert('Please select at least one language you want to learn');
        return;
    }
    
    try {
        const response = await fetch('/publish-exchange-request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                speaks: selectedSpeaks,
                learning: selectedLearning
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Request published successfully!');
            // Clear selections
            document.querySelectorAll('.language-btn.selected').forEach(btn => {
                btn.classList.remove('selected');
            });
            selectedSpeaks = [];
            selectedLearning = [];
            
            // Reload requests
            await loadExchangeRequests();
        } else {
            alert('Failed to publish request: ' + data.message);
        }
    } catch (error) {
        console.error('Error publishing request:', error);
        alert('Error publishing request');
    }
}

async function loadExchangeRequests() {
    try {
        const response = await fetch('/get-exchange-requests', {
            method: 'GET',
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            displayExchangeRequests(data.requests);
        } else {
            console.error('Failed to load requests:', data.message);
        }
    } catch (error) {
        console.error('Error loading requests:', error);
    }
}

function displayExchangeRequests(requests) {
    const container = document.getElementById('exchangeContainer');
    container.innerHTML = '';
    
    if (requests.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No exchange requests available</p>';
        return;
    }
    
    requests.forEach(request => {
        const card = document.createElement('div');
        card.className = 'user-card';
        
        const name = document.createElement('h2');
        name.className = 'name';
        name.textContent = request.fullname || request.username;
        
        const speaksDiv = document.createElement('div');
        speaksDiv.className = 'tags';
        const speaksLabel = document.createElement('span');
        speaksLabel.className = 'section-label';
        speaksLabel.textContent = 'Speaks:';
        speaksDiv.appendChild(speaksLabel);
        
        request.speaks.forEach(lang => {
            const tag = document.createElement('span');
            tag.className = 'tag';
            tag.textContent = lang;
            speaksDiv.appendChild(tag);
        });
        
        const learningDiv = document.createElement('div');
        learningDiv.className = 'tags';
        const learningLabel = document.createElement('span');
        learningLabel.className = 'section-label';
        learningLabel.textContent = 'Learning:';
        learningDiv.appendChild(learningLabel);
        
        request.learning.forEach(lang => {
            const tag = document.createElement('span');
            tag.className = 'tag';
            tag.textContent = lang;
            learningDiv.appendChild(tag);
        });
        
        const connectBtn = document.createElement('button');
        connectBtn.className = 'accept-btn';
        connectBtn.textContent = 'Connect';
        connectBtn.onclick = () => connectToUser(request.user_id, request.username);
        
        card.appendChild(name);
        card.appendChild(speaksDiv);
        card.appendChild(learningDiv);
        card.appendChild(connectBtn);
        
        container.appendChild(card);
    });
}

async function connectToUser(userId, username) {
    if (confirm(`Connect with ${username} for language exchange?`)) {
        try {
            const response = await fetch('/connect-exchange', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ partner_id: userId })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Redirect to exchange chat room
                window.location.href = `/exchange_chat.html?partner_id=${userId}`;
            } else {
                alert('Failed to connect: ' + data.message);
            }
        } catch (error) {
            console.error('Error connecting:', error);
            alert('Error connecting to user');
        }
    }
}