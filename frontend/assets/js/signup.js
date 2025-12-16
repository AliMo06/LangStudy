        //get references to form elements for validation
        const form = document.getElementById('signupForm');
        const password = document.getElementById('password');
        const confirmPassword = document.getElementById('confirmPassword');
        const passwordError = document.getElementById('passwordError');  //error message element
        const emailInput = document.getElementById('email');
        const emailError = document.getElementById('emailError');  //error message element

        // Email validation
        emailInput.addEventListener('blur', function() {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;  //simple email regex
            //only validate if field is not empty
            if (this.value && !emailRegex.test(this.value)) {
                emailError.classList.add('show');  //invalid email format
            } else {
                emailError.classList.remove('show');  //valid email format
            }
        });

        // Password match validation
        confirmPassword.addEventListener('input', function() {
            //compare password and confirm password fields
            if (password.value !== confirmPassword.value) {
                passwordError.classList.add('show');
            } else {
                passwordError.classList.remove('show');
            }
        });

        // Form submission
        form.addEventListener('submit', async function(e) {
            e.preventDefault();  //prevent default form submission
            
            // Check if passwords match
            if (password.value !== confirmPassword.value) {
                passwordError.classList.add('show');
                return;  //exit if validation fails
            }

            // Check password length
            if (password.value.length < 8) {
                alert('Password must be at least 8 characters long');
                return;  //exit if password is too short
            }

    //grabs values from form fields and puts them in an object
    const formData = {
        fullname: document.getElementById('fullname').value,
        email: emailInput.value,
        username: document.getElementById('username').value,
        password: password.value  //confirm passwword not sent
    };


    //sends data to python backend
    try {
        const response = await fetch('/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'  //indicates JSON data
            },
            body: JSON.stringify(formData)
        });


        //handles the response
        const data = await response.json();

        //checks if account creation worked
        if (data.success) {
            //account created successfully
            alert('Account created successfully! Redirecting to login...');
            window.location.href = 'login.html';
        } else {
            //account creation failed
            alert('Error: ' + data.message);
        }
    } catch (error) {
        //network error or server not responding
        alert('Error connecting to server. Make sure the backend is running!');
        console.error('Error:', error);
    }
});