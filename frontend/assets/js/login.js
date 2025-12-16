         // login button click
        document.getElementById('loginBtn').addEventListener('click', async function() {
            //gets username and password values
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            if (!username || !password) {
                alert('Please enter both username and password');
                return; //exit if validation fails
            }

            //puts the data in an object and sends it to python
           const loginData = {
        username: username,
        password: password
    };


    //sends data to python backend
    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'  //indicates JSON data
            },
            body: JSON.stringify(loginData),  //convert object to JSON string
            credentials: 'include'  //include cookies for session management
        });

        const data = await response.json();  //converts response from JSON to JavaScript


        //checks if login worked
        if (data.success) {  
            //login successful
            alert('Login successful! Welcome ' + data.username);
            window.location.href = 'social_posting.html';
        } else {
            alert('Error: ' + data.message);  //login failed
        }
    } catch (error) {
        //network error or server not responding
        alert('Error connecting to server!');
        console.error('Error:', error);
    }
});

        // if press enter instead of clicking login
        document.getElementById('username').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                //simulate login button click
                document.getElementById('loginBtn').click();
            }
        });

        document.getElementById('password').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                //simulate login button click
                document.getElementById('loginBtn').click();
            }
        });