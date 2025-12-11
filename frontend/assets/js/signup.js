        const form = document.getElementById('signupForm');
        const password = document.getElementById('password');
        const confirmPassword = document.getElementById('confirmPassword');
        const passwordError = document.getElementById('passwordError');
        const emailInput = document.getElementById('email');
        const emailError = document.getElementById('emailError');

        // Email validation
        emailInput.addEventListener('blur', function() {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (this.value && !emailRegex.test(this.value)) {
                emailError.classList.add('show');
            } else {
                emailError.classList.remove('show');
            }
        });

        // Password match validation
        confirmPassword.addEventListener('input', function() {
            if (password.value !== confirmPassword.value) {
                passwordError.classList.add('show');
            } else {
                passwordError.classList.remove('show');
            }
        });

        // Form submission
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Check if passwords match
            if (password.value !== confirmPassword.value) {
                passwordError.classList.add('show');
                return;
            }

            // Check password length
            if (password.value.length < 8) {
                alert('Password must be at least 8 characters long');
                return;
            }

            //grabs values from form fields and puts them in an object
    const formData = {
        fullname: document.getElementById('fullname').value,
        email: emailInput.value,
        username: document.getElementById('username').value,
        password: password.value
    };


    //sends data to python backend
    try {
        const response = await fetch('http://localhost:5000/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });


        //handles the response
        const data = await response.json();

        if (data.success) {
            alert('Account created successfully! Redirecting to login...');
            window.location.href = 'login.html';
        } else {
            alert('Error: ' + data.message);
        }
    } catch (error) {
        alert('Error connecting to server. Make sure the backend is running!');
        console.error('Error:', error);
    }
});

        function handleSocialSignup(provider) {
            alert(`Signing up with ${provider}...`);
        }