         // login button click
        document.getElementById('loginBtn').addEventListener('click', function() {
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            if (!username || !password) {
                alert('Please enter both username and password');
                return;
            }

            // Placeholder for now login functionality
            console.log('Login attempt with:', { username, password });
            alert('Login functionality will be connected to backend');
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