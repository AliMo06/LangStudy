        document.getElementById('forgotPasswordForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const successMessage = document.getElementById('successMessage');
            
            // validation
            if (email) {
                // show success message
                successMessage.classList.add('show');
                
                // clears the form
                this.reset();
                
                // hide message after 5 seconds
                setTimeout(function() {
                    successMessage.classList.remove('show');
                }, 5000);
            }
        });