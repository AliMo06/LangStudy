         // login button click
        document.getElementById('loginBtn').addEventListener('click', async function() {
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            if (!username || !password) {
                alert('Please enter both username and password');
                return;
            }

            //puts the data in an object and sends it to python
           const loginData = {
        username: username,
        password: password
    };


    //sends data to python backend
    try {
        const response = await fetch('http://localhost:5000/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(loginData),
            credentials: 'include'
        });

        const data = await response.json();  //converts response from JSON to JavaScript


        //checks if login worked
        if (data.success) {  
            alert('Login successful! Welcome ' + data.username);
            window.location.href = 'social_posting.html';
        } else {
            alert('Error: ' + data.message);
        }
    } catch (error) {
        alert('Error connecting to server!');
        console.error('Error:', error);
    }
});

        // if press enter instead of clicking login
        document.getElementById('username').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                document.getElementById('loginBtn').click();
            }
        });

        document.getElementById('password').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                document.getElementById('loginBtn').click();
            }
        });