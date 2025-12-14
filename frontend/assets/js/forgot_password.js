document.getElementById('forgotPasswordForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    //gets all three fields
    const email = document.getElementById('email').value;
    const username = document.getElementById('username').value;
    const new_password = document.getElementById('new_password').value;
    const successMessage = document.getElementById('successMessage');
    
    //checks password length
    if (new_password.length < 8) {
        alert('Password must be at least 8 characters long');
        return;
    }
    
    //puts the data in an object
    const resetData = {
        email: email,
        username: username,
        new_password: new_password
    };
    
    //sends the request
    try {
        const response = await fetch('/forgot-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(resetData)
        });
        
        const data = await response.json();
        
        if (data.success) {  //show success message
            successMessage.classList.add('show');
            this.reset();
            
            setTimeout(function() {  //wait 2 seconds then redirect to login
                successMessage.classList.remove('show');
                window.location.href = 'login.html';
            }, 2000);
        } else {
            alert('Error: ' + data.message);
        }
    } catch (error) {
        alert('Error connecting to server!');
        console.error('Error:', error);
    }
});