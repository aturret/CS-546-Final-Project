// In this file, you must perform all client-side validation for every single form input (and the role dropdown) on your pages. The constraints for those fields are the same as they are for the data functions and routes. Using client-side JS, you will intercept the form's submit event when the form is submitted and If there is an error in the user's input or they are missing fields, you will not allow the form to submit to the server and will display an error on the page to the user informing them of what was incorrect or missing.  You must do this for ALL fields for the register form as well as the login form. If the form being submitted has all valid data, then you will allow it to submit to the server for processing. Don't forget to check that password and confirm password match on the registration form!


console.log('client-side JS loaded!');

const forms = document.querySelectorAll('.my-form');
const clientError = document.getElementById('client-error');
const clientErrorDiv = document.getElementById('client');

forms.forEach(form => {
    form.addEventListener('submit', async (event) => {
        const passwordInputs = document.querySelectorAll('input[type="password"]');
        const dateInputs = document.querySelectorAll('input[type="date"]');
        const emailInputs = document.querySelectorAll('input[type="email"]');
        const phoneInputs = document.querySelectorAll('input[class="phone"]');    
    }
    )
})





