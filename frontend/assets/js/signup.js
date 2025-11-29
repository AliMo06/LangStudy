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
        form.addEventListener('submit', function(e) {
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

            // If all validations pass
            alert('Account created successfully! Redirecting to login...');
            form.reset();
        });

        function handleSocialSignup(provider) {
            alert(`Signing up with ${provider}...`);
        }