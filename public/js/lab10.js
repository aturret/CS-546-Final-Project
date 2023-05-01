// In this file, you must perform all client-side validation for every single form input (and the role dropdown) on your pages. The constraints for those fields are the same as they are for the data functions and routes. Using client-side JS, you will intercept the form's submit event when the form is submitted and If there is an error in the user's input or they are missing fields, you will not allow the form to submit to the server and will display an error on the page to the user informing them of what was incorrect or missing.  You must do this for ALL fields for the register form as well as the login form. If the form being submitted has all valid data, then you will allow it to submit to the server for processing. Don't forget to check that password and confirm password match on the registration form!


console.log('client-side JS loaded!');

let loginForm = document.getElementById('login-form');
let registerForm = document.getElementById('register-form');
let emailAddressInput = document.getElementById('emailAddressInput');
let passwordInput = document.getElementById('passwordInput');
let confirmPasswordInput = document.getElementById('confirmPasswordInput');
let firstNameInput = document.getElementById('firstNameInput');
let lastNameInput = document.getElementById('lastNameInput');
let roleInput = document.getElementById('roleInput');
let clientError = document.getElementById('client-error');


const helper = {
    checkId(id, varName) {
        if (!id) throw `Error: You must provide a ${varName}`;
        if (typeof id !== 'string') throw `Error:${varName} must be a string`;
        id = id.trim();
        if (id.length === 0)
            throw `Error: ${varName} cannot be an empty string or just spaces`;
        if (!ObjectId.isValid(id)) throw `Error: ${varName} invalid object ID`;
        return id;
    },

    checkString(strVal, varName) {

        if (!strVal) throw `Error: You must supply a ${varName}!`;
        if (typeof strVal !== 'string') throw `Error: ${varName} must be a string!`;
        strVal = strVal.trim();
        if (strVal.length === 0)
            throw `Error: ${varName} cannot be an empty string or string with just spaces`;
        return strVal;
    },

    checkNameString(strVal, varName) {
        if (/\s/.test(strVal))
            throw `Error: ${varName} cannot contain spaces`;
        if (/\d/.test(strVal))
            throw `Error: ${varName} cannot contain numbers`;
        if (strVal.length < 2 || strVal.length > 25)
            throw `Error: ${varName} must be between 2 and 25 characters`;
        return strVal;
    },

    checkEmailFormat(email) {
        email = email.trim();
        // email is case-insensitive
        email = email.toLowerCase();
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
            return email;
        else
            throw `Error: Email must be in the right format`;
    },

    checkPassword(password) {
        if (password.length < 8)
            throw `Error: Password must be at least 8 characters`;
        if (/\s/.test(password))
            throw `Error: Password cannot contain spaces`;
        // There needs to be at least one uppercase character, there has to be at least one number and there has to be at least one special character
        let hasUppercase = false;
        let hasNumber = false;
        let hasSpecialChar = false;
        for (let i = 0; i < password.length; i++) {
            if (password[i] >= 'A' && password[i] <= 'Z')
                hasUppercase = true;
            else if (password[i] >= '0' && password[i] <= '9')
                hasNumber = true;
            else if ('!@#$%^&*()_+-=<>'.includes(password[i]))
                hasSpecialChar = true;
        }
        if (!hasUppercase)
            throw `Error: Password must contain at least one uppercase character`;
        if (!hasNumber)
            throw `Error: Password must contain at least one number`;
        if (!hasSpecialChar)
            throw `Error: Password must contain at least one special character`;        
        return password;
    },



    checkStringArray(arr, varName) {
        //We will allow an empty array for this,
        //if it's not empty, we will make sure all tags are strings
        if (!arr || !Array.isArray(arr))
            throw `You must provide an array of ${varName}`;
        for (let i in arr) {
            if (typeof arr[i] !== 'string' || arr[i].trim().length === 0) {
                throw `One or more elements in ${varName} array is not a string or is an empty string`;
            }
            arr[i] = arr[i].trim();
        }

        return arr;
    }
};

if (loginForm) {
    loginForm.addEventListener('submit', (event) => {
        
        try {
            helper.checkString(emailAddressInput.value, 'Email Address');
            helper.checkEmailFormat(emailAddressInput.value);
            helper.checkString(passwordInput.value, 'Password');
            helper.checkPassword(passwordInput.value);
        }
        catch (e) {
            event.preventDefault();
            clientError.innerHTML = e;             
        }
    })
};

if (registerForm) {
    registerForm.addEventListener('submit', (event) => {    
           
        try {
            helper.checkString(emailAddressInput.value, 'Email Address');
            helper.checkEmailFormat(emailAddressInput.value);
            helper.checkString(passwordInput.value, 'Password');
            helper.checkPassword(passwordInput.value);
            helper.checkString(confirmPasswordInput.value, 'Confirm Password');
            helper.checkPassword(confirmPasswordInput.value);
            helper.checkNameString(firstNameInput.value, 'First Name');
            helper.checkString(lastNameInput.value, 'Last Name');
            helper.checkNameString(lastNameInput.value, 'Last Name');
            helper.checkString(roleInput.value, 'Role');
            if (roleInput.value.toLowerCase() !== 'admin' && roleInput.value.toLowerCase() !== 'user') {
                throw 'Role must be admin or user!';
            }
            if (passwordInput.value !== confirmPasswordInput.value) {
                throw 'Passwords do not match!';
            }
        }
        catch (e) {
            event.preventDefault(); 
            clientError.innerHTML = e;            
        }
    });
}


