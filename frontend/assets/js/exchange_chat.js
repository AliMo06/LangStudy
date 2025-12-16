const sendBtn = document.getElementById("sendBtn");
const input = document.getElementById("messageInput");
const messageArea = document.getElementById("messageArea");

// Get partner_id from URL
const urlParams = new URLSearchParams(window.location.search);
const partnerId = urlParams.get('partner_id');

// Store translations to avoid re-translating
const translations = {};

//load messages when page loads
window.addEventListener('DOMContentLoaded', loadMessages);
//poll for new messages every 3 seconds to keep chat updated
setInterval(loadMessages, 3000);

async function loadMessages() {
    //validate that we have a partner id
    if (!partnerId) {
        console.error('No partner_id in URL');
        return;
    }
    
    try {
        //request messages frmo back end
        const response = await fetch(`/get-exchange-messages/${partnerId}`, {
            method: 'GET',
            credentials: 'include'  //include session cookies for authentication
        });
        
        const data = await response.json();
        
        if (data.success) {
            //clear existing messages
            messageArea.innerHTML = '';
            
            //display each message in chronological order
            data.messages.forEach(msg => {
                displayMessage(msg);
            });
            
            //scroll to bottom to show latest messages
            messageArea.scrollTop = messageArea.scrollHeight;
        } else {
            console.error('Failed to load messages:', data.message);
        }
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

function displayMessage(msg) {
    //create wrapper for message
    const wrapper = document.createElement("div");
    wrapper.className = "message-wrapper";
    
    //create main message div woth styling based on sender
    const msgDiv = document.createElement("div");
    msgDiv.className = msg.is_mine ? "message you" : "message friend";
    
    //create label showing who sent the message
    const label = document.createElement("div");
    label.className = msg.is_mine ? "sender" : "receiver";
    label.textContent = msg.is_mine ? i18n.t('exchangeChat.you') : msg.sender_username;
    
    //create div for message content
    const content = document.createElement("div");
    content.textContent = msg.message_text;
    
    //build message structure
    msgDiv.appendChild(label);
    msgDiv.appendChild(content);
    
    // Add translate button only for messages from the other person
    if (!msg.is_mine) {
        const translateBtn = document.createElement("button");
        translateBtn.className = "translate-btn";
        translateBtn.textContent = i18n.t('exchangeChat.translate');
        translateBtn.onclick = () => translateMessage(msg.id, msg.message_text, wrapper, translateBtn);
        msgDiv.appendChild(translateBtn);
    }
    
    wrapper.appendChild(msgDiv);
    
    // Show cached translation if exists
    if (translations[msg.id]) {
        const translationDiv = document.createElement("div");
        translationDiv.className = "translation";
        translationDiv.textContent = i18n.t('exchangeChat.translation') + translations[msg.id];
        wrapper.appendChild(translationDiv);
    }
    
    messageArea.appendChild(wrapper);
}

async function translateMessage(messageId, text, wrapper, button) {
    const targetLang = i18n.currentLang;
    // Check if already translated
    if (translations[messageId]) {
        return;
    }
    
    // Disable button and show loading state
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = i18n.t('exchangeChat.translating') || 'Translating...';
    
    try {
        // Use your backend translation API
        const response = await fetch('/api/translate', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                text: text,
                target_language: targetLang // You can make this dynamic based on user preference
            })
        });
        
        const data = await response.json();
        
        if (data.translated_text) {
            const translatedText = data.translated_text;
            //cache translation to avoid re-translating
            translations[messageId] = translatedText;
            
            // Add translation to the message
            const translationDiv = document.createElement("div");
            translationDiv.className = "translation";
            translationDiv.textContent = i18n.t('exchangeChat.translation') + translatedText;
            wrapper.appendChild(translationDiv);
            
            // Update button to show translation is complete
            button.textContent = i18n.t('exchangeChat.translated') || 'Translated';
        } else if (data.error) {
            console.error('Translation error:', data.error);
            alert(i18n.t('exchangeChat.translationFailed') || 'Translation failed. Please try again.');
            button.disabled = false;
            button.textContent = originalText;
        }
    } catch (error) {
        //handle network or other errors
        console.error('Translation error:', error);
        alert(i18n.t('exchangeChat.translationUnavailable') || 'Translation service unavailable. Please try again later.');
        button.disabled = false;
        button.textContent = originalText;
    }
}

//send message to language exahange partner
async function sendMessage() {
    //get and validate message text
    const text = input.value.trim();
    if (text === "") return;  //no empty messages
    
    if (!partnerId) {
        alert(i18n.t('exchangeChat.noPartnerSelected'));
        return;
    }
    
    try {
        //send message to backend
        const response = await fetch('/send-exchange-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                partner_id: partnerId,  //recipient user id
                message_text: text  //message content
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            //clear input field after successful send
            input.value = "";
            await loadMessages();
        } else {
            //show error if message failed to send
            alert(i18n.t('exchangeChat.failedToSend') + data.message);
        }
    } catch (error) {
        console.error('Error sending message:', error);
        alert(i18n.t('exchangeChat.errorSendingMessage'));
    }
}

//attach click handler to send button
sendBtn.addEventListener("click", sendMessage);

//allow sending message by pressing enter key
input.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
        sendMessage();
    }
});