// In this file, you must perform all client-side validation for every single form input (and the role dropdown) on your pages. The constraints for those fields are the same as they are for the data functions and routes. Using client-side JS, you will intercept the form's submit event when the form is submitted and If there is an error in the user's input or they are missing fields, you will not allow the form to submit to the server and will display an error on the page to the user informing them of what was incorrect or missing.  You must do this for ALL fields for the register form as well as the login form. If the form being submitted has all valid data, then you will allow it to submit to the server for processing. Don't forget to check that password and confirm password match on the registration form!


console.log('client-side JS loaded!');

const forms = document.querySelectorAll('.my-form');
const clientError = document.getElementById('client-error');
const clientErrorDiv = document.getElementById('client');

forms.forEach(form => {
    form.addEventListener('submit', async (event) => {
        const textInputs = document.querySelectorAll('input[type="text"]');
        const roomTypeInputs = document.querySelectorAll('select[class="roomType"]');
        const passwordInputs = document.querySelectorAll('input[type="password"]');
        const dateInputs = document.querySelectorAll('input[type="date"]');
        const emailInputs = document.querySelectorAll('input[type="email"]');
        const phoneInputs = document.querySelectorAll('input[class="phone"]');
        try {
            textInputs.forEach(input => {
                input.value = checkString(input.value, input.name, false);
            })
            passwordInputs.forEach(input => {
                input.value = checkPassword(input.value, false);
            })
            dateInputs.forEach(input => {
                input.value = checkDate(input.value, false);
            })
            emailInputs.forEach(input => {
                input.value = checkEmail(input.value, false);
            })
            phoneInputs.forEach(input => {
                input.value = checkPhone(input.value, false);
            })
        }
        catch (e) {
            e.preventDefault();
            clientErrorDiv.style.display = 'block';
            clientError.innerHTML = e.message;
        }
    }
    )
})










function CustomException(message, flag) {
    const error = new Error(message);

    error.code = flag ? 400 : 404;
    return error;
}

function checkString(s, key, flag){
    if(!s || typeof s !== 'string' || s.trim().length === 0) throw new CustomException(`${key} must exist and must be a non empty string`, flag);
    return s.trim();
}

function checkDate(date, flag) {
    if (!date || typeof date !== "string" || date.trim().length === 0) throw new CustomException("releaseDate must exist and must be a non empty string.", flag);
    if (!moment(date.trim(), "YYYY/MM/DD", true).isValid()) throw new CustomException("releaseDate must be a valid date.", flag);
    date = date.trim();
    let temp = +date.split("/")[-1];
    if (temp < 1900 || temp > 2023)
        throw new CustomException("The year of release of the album must be between 1900 and 2024.", flag);

    return date
}
function checkEmail(email, flag) {
    email = email.trim()
    if (!email || typeof email !== 'string') throw new CustomException("Email must exist and must be a string type", flag);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new CustomException("Invalid email address", flag)
    return email
}
function checkPhone(n, flag)
{
    n = n.trim()
    if(!n || typeof n !== 'string') throw new CustomException("Phone number must exist and must be a string type.", flag);
    if(!/^\d{3}[-]?\d{3}[-]?\d{4}$/.test(n)) throw new CustomException("Cell phone number has to match the format. xxxxxxxxxxx, xxx-xxx-xxxxx or (xxx)xxx-xxxxx", flag)
    return n
}
function checkPassword(password, flag){
    if(!password|| typeof password !== "string") throw new CustomException("Password must exist and must be a string.", flag);
    if(!/\d/.test(password)) throw new CustomException("Password must contain at least one digit.", flag);
    if(!/[a-z]/.test(password)) throw new CustomException("Password must contain nat least one letter.", flag)
    if(password === password.toLowerCase()) throw new CustomException("Password must have at least one upper case letter.", flag);

    return password.trim()
}