const sendBtn = document.getElementById("sendBtn");
const input = document.getElementById("messageInput");
const messageArea = document.getElementById("messageArea");

// Get friend_id from URL parameter (you'll need to pass this when linking to messages.html)
const urlParams = new URLSearchParams(window.location.search);
const friendId = urlParams.get('friend_id');

// Load existing messages when page loads
window.addEventListener('DOMContentLoaded', loadMessages);

// Auto-refresh messages every 3 seconds
setInterval(loadMessages, 3000);

async function loadMessages() {
    if (!friendId) {
        console.error('No friend_id in URL');
        return;
    }
    
    try {
        const response = await fetch(`http://localhost:5000/get-messages/${friendId}`, {
            method: 'GET',
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Clear current messages
            messageArea.innerHTML = '';
            
            // Display all messages
            data.messages.forEach(msg => {
                displayMessage(msg.message_text, msg.is_mine, msg.sender_username);
            });
            
            // Scroll to bottom
            messageArea.scrollTop = messageArea.scrollHeight;
        } else {
            console.error('Failed to load messages:', data.message);
        }
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

function displayMessage(text, isMine, senderUsername) {
    const msg = document.createElement("div");
    msg.className = isMine ? "message you" : "message friend";
    
    const label = document.createElement("div");
    label.className = isMine ? "sender" : "receiver";
    label.textContent = isMine ? "You" : senderUsername || "Friend";
    
    const content = document.createElement("div");
    content.textContent = text;
    
    msg.appendChild(label);
    msg.appendChild(content);
    messageArea.appendChild(msg);
}

async function sendMessage() {
    const text = input.value.trim();
    if (text === "") return;
    
    if (!friendId) {
        alert('No friend selected');
        return;
    }
    
    try {
        const response = await fetch('http://localhost:5000/send-message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                receiver_id: friendId,
                message_text: text
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Clear input
            input.value = "";
            
            // Reload messages to show the new one
            await loadMessages();
        } else {
            alert('Failed to send message: ' + data.message);
        }
    } catch (error) {
        console.error('Error sending message:', error);
        alert('Error sending message');
    }
}

// Button click
sendBtn.addEventListener("click", sendMessage);

// "Enter" key support
input.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
        sendMessage();
    }
});