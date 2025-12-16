//get DOM element references for the messaging interface
const sendBtn = document.getElementById("sendBtn");  //send message button
const input = document.getElementById("messageInput");  //message input field
const messageArea = document.getElementById("messageArea");  //container for displaying messages

// Get friend_id from URL parameter (you'll need to pass this when linking to messages.html)
const urlParams = new URLSearchParams(window.location.search);
const friendId = urlParams.get('friend_id');

// Load existing messages when page loads
window.addEventListener('DOMContentLoaded', loadMessages);

// Auto-refresh messages every 3 seconds
setInterval(loadMessages, 3000);

// Fetch and display messages from the server
async function loadMessages() {
    //validate friendId
    if (!friendId) {
        console.error('No friend_id in URL');
        return;
    }
    
    try {
        //send request to backend to get messages
        const response = await fetch(`/get-messages/${friendId}`, {
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

//creates and displays a single message in the chat area
function displayMessage(text, isMine, senderUsername) {
    //create message container
    const msg = document.createElement("div");
    msg.className = isMine ? "message you" : "message friend";
    
    //create sender/receiver label
    const label = document.createElement("div");
    label.className = isMine ? "sender" : "receiver";
    label.textContent = isMine ? i18n.t('messages.you') : senderUsername || i18n.t('messages.friend');
    
    //create message content
    const content = document.createElement("div");
    content.textContent = text;
    
    //buold message structure
    msg.appendChild(label);
    msg.appendChild(content);
    //add message to message area
    messageArea.appendChild(msg);
}

//send a new message to the friend
async function sendMessage() {
    //get and validate message text
    const text = input.value.trim();
    if (text === "") return;  //do not send empty messages
    
    //validate friendId
    if (!friendId) {
        alert(i18n.t('messages.noFriendSelected'));
        return;
    }
    
    try {
        //send message to backend
        const response = await fetch('/send-message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'  //indicates JSON data
            },
            credentials: 'include',  //include session cookies
            body: JSON.stringify({
                receiver_id: friendId,  //id of message recipient
                message_text: text  //message content
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Clear input
            input.value = "";
            
            // Reload messages to show the new one
            await loadMessages();
        } else {
            //show error if message failed to send
            alert(i18n.t('messages.failedToSend') + data.message);
        }
    } catch (error) {
        console.error('Error sending message:', error);
        alert(i18n.t('messages.errorSendingMessage'));
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