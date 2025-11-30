const sendBtn = document.getElementById("sendBtn");
        const input = document.getElementById("messageInput");
        const messageArea = document.getElementById("messageArea");

        function sendMessage() {
            const text = input.value.trim();
            if (text === "") return; // ignore empty messages

            // Create message container
            const msg = document.createElement("div");
            msg.className = "message";

            // Sender label
            const sender = document.createElement("div");
            sender.className = "sender";
            sender.textContent = "You";

            // Message text
            const content = document.createElement("div");
            content.textContent = text;

            // Append to DOM
            msg.appendChild(sender);
            msg.appendChild(content);
            messageArea.appendChild(msg);

            // Scroll to bottom
            messageArea.scrollTop = messageArea.scrollHeight;

            // Clear input
            input.value = "";
        }

        // Button click
        sendBtn.addEventListener("click", sendMessage);

        // "Enter" key support
        input.addEventListener("keypress", function (e) {
            if (e.key === "Enter") {
                sendMessage();
            }
        });