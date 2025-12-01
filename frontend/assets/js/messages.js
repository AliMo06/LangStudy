const sendBtn = document.getElementById("sendBtn");
const input = document.getElementById("messageInput");
const messageArea = document.getElementById("messageArea");

// Read the text inputted into the message box
function sendMessage() {
    const text = input.value.trim();
    if (text === "") return; // ignore empty messages

    // Create message container
    const msg = document.createElement("div");
    msg.className = "message";

    // Create sender class
    const sender = document.createElement("div");
    sender.className = "sender";
    sender.textContent = "You";

    // Create message text
    const content = document.createElement("div");
    content.textContent = text;

    // Append the separate parts together
    msg.appendChild(sender);
    msg.appendChild(content);
    messageArea.appendChild(msg);

    // Auto scroll to bottom
    messageArea.scrollTop = messageArea.scrollHeight;

    // Clear message box
    input.value = "";
}

// Send message when send button clicked
sendBtn.addEventListener("click", sendMessage);

// If the enter key is pressed, send message
input.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
            sendMessage();
    }
});