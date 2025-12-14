const sendBtn = document.getElementById("sendBtn");
const input = document.getElementById("messageInput");
const messageArea = document.getElementById("messageArea");

// Get partner_id from URL
const urlParams = new URLSearchParams(window.location.search);
const partnerId = urlParams.get('partner_id');

// Store translations to avoid re-translating
const translations = {};

window.addEventListener('DOMContentLoaded', loadMessages);
setInterval(loadMessages, 3000);

async function loadMessages() {
    if (!partnerId) {
        console.error('No partner_id in URL');
        return;
    }
    
    try {
        const response = await fetch(`/get-exchange-messages/${partnerId}`, {
            method: 'GET',
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            messageArea.innerHTML = '';
            
            data.messages.forEach(msg => {
                displayMessage(msg);
            });
            
            messageArea.scrollTop = messageArea.scrollHeight;
        } else {
            console.error('Failed to load messages:', data.message);
        }
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

function displayMessage(msg) {
    const wrapper = document.createElement("div");
    wrapper.className = "message-wrapper";
    
    const msgDiv = document.createElement("div");
    msgDiv.className = msg.is_mine ? "message you" : "message friend";
    
    const label = document.createElement("div");
    label.className = msg.is_mine ? "sender" : "receiver";
    label.textContent = msg.is_mine ? "You" : msg.sender_username;
    
    const content = document.createElement("div");
    content.textContent = msg.message_text;
    
    msgDiv.appendChild(label);
    msgDiv.appendChild(content);
    
    // Add translate button only for messages from the other person
    if (!msg.is_mine) {
        const translateBtn = document.createElement("button");
        translateBtn.className = "translate-btn";
        translateBtn.textContent = "Translate";
        translateBtn.onclick = () => translateMessage(msg.id, msg.message_text, wrapper);
        msgDiv.appendChild(translateBtn);
    }
    
    wrapper.appendChild(msgDiv);
    
    // Show cached translation if exists
    if (translations[msg.id]) {
        const translationDiv = document.createElement("div");
        translationDiv.className = "translation";
        translationDiv.textContent = `Translation: ${translations[msg.id]}`;
        wrapper.appendChild(translationDiv);
    }
    
    messageArea.appendChild(wrapper);
}

async function translateMessage(messageId, text, wrapper) {
    // Check if already translated
    if (translations[messageId]) {
        return;
    }
    
    try {
        // Simple translation using a free API (you can replace with better service)
        const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=auto|en`);
        const data = await response.json();
        
        if (data.responseData && data.responseData.translatedText) {
            const translatedText = data.responseData.translatedText;
            translations[messageId] = translatedText;
            
            // Add translation to the message
            const translationDiv = document.createElement("div");
            translationDiv.className = "translation";
            translationDiv.textContent = `Translation: ${translatedText}`;
            wrapper.appendChild(translationDiv);
        } else {
            alert('Translation failed');
        }
    } catch (error) {
        console.error('Translation error:', error);
        alert('Translation service unavailable');
    }
}

async function sendMessage() {
    const text = input.value.trim();
    if (text === "") return;
    
    if (!partnerId) {
        alert('No partner selected');
        return;
    }
    
    try {
        const response = await fetch('/send-exchange-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                partner_id: partnerId,
                message_text: text
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            input.value = "";
            await loadMessages();
        } else {
            alert('Failed to send message: ' + data.message);
        }
    } catch (error) {
        console.error('Error sending message:', error);
        alert('Error sending message');
    }
}

sendBtn.addEventListener("click", sendMessage);

input.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
        sendMessage();
    }
});