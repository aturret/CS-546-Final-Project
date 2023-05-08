// In this file, you must perform all client-side validation for every single form input (and the role dropdown) on your pages. The constraints for those fields are the same as they are for the data functions and routes. Using client-side JS, you will intercept the form's submit event when the form is submitted and If there is an error in the user's input or they are missing fields, you will not allow the form to submit to the server and will display an error on the page to the user informing them of what was incorrect or missing.  You must do this for ALL fields for the register form as well as the login form. If the form being submitted has all valid data, then you will allow it to submit to the server for processing. Don't forget to check that password and confirm password match on the registration form!



console.log('client-side JS loaded!');

const forms = document.querySelectorAll('.my-form');
const searchForms = document.querySelectorAll('.search-form');
const clientError = document.getElementById('client-error');
const clientErrorDiv = document.getElementById('client');

searchForms.forEach(form => {
    form.addEventListener('submit', async (event) => {
        const textInputs = document.querySelectorAll('input[type="text"]');
        const selectInputs = document.querySelectorAll('select');
        const allInputs = textInputs.concat(selectInputs);
        try{
            allInputs.forEach(input => {
                if(input.value.trim() !== '') input.value = checkString(input.value, input.name);
            })
        }
        catch(e){
            event.preventDefault();
            clientError.innerHTML = e;
        }
    })
})


forms.forEach(form => {
    console.log('hi');
    form.addEventListener('submit', async (event) => {
        const textInputs = form.querySelectorAll('input[type="text"]');
        const roomTypeInputs = form.querySelectorAll('select[class="roomType"]');
        const hotelStateInputs = form.querySelectorAll('select[id="hotelState"]');
        const passwordInputs = form.querySelectorAll('input[type="password"]');
        const dateInputs = form.querySelectorAll('input[type="date"]');
        const emailInputs = form.querySelectorAll('input[type="email"]');
        const phoneInputs = form.querySelectorAll('input[class="phone"]');
        const textareas = form.querySelectorAll('textarea');
        const picInputs = form.querySelectorAll('input[type="file"]');
        const date1 = form.querySelectorAll('input[name="startDate"]')[0];
        const date2 = form.querySelectorAll('input[name="endDate"]')[0];
        try {
            textInputs.forEach(input => {
                console.log('text checking');
                console.log(input.value);        
                input.value = checkString(input.value, input.name, false);
            })
            roomTypeInputs.forEach(input => {                
                input.value = checkString(input.value, input.name, false);
            })
            phoneInputs.forEach(input => {                
                input.value = checkPhone(input.value, false);
            })
            emailInputs.forEach(input => {                
                input.value = checkEmail(input.value, false);
            })            
            passwordInputs.forEach(input => {               
                input.value = checkPassword(input.value, false);
            })
            dateInputs.forEach(input => {                
                input.value = checkDate(input.value, false);
            })
            textareas.forEach(input => {                
                input.value = checkString(input.value, input.name, false);
            })
            picInputs.forEach(input => {
                const file = input.files[0];
                if (!file) throw "No file selected";
                if (!file.type.startsWith('image/')) throw "Picture file must be an image";
                input.value = file.name;
            })
            if (date1 && date2) {
                    checkLaterDate(date1.value, date2.value);
            }
            if (document.getElementById('confirmPasswordInput')) {    
                const confirmPasswordInput = document.getElementsByClassName('confirmPasswordInput')[0];
                const PasswordInput = document.getElementsByClassName('PasswordInput')[0];
                if (confirmPasswordInput.value !== PasswordInput.value) throw "Passwords do not match";
            }
        }
        catch (e) {
            console.log(`Ooops..${e}`);
            event.preventDefault();
            clientError.innerHTML = e;
        }
    }
    )
})







function checkString(s, key){
    if(!s || typeof s !== 'string' || s.trim().length === 0) throw `${key} must exist and must be a non empty string`;
    return s.trim();
}

function checkDate(date) {
    const today = new Date().toISOString().split("T")[0];
    if(date<today) throw "Date must be in the future";
    return date
}

function checkLaterDate(date1,date2) {
    if(date1>date2) throw "Date must be later than the start date";
}

// function checkDate(date) {
//     if (!date || typeof date !== "string" || date.trim().length === 0) throw "releaseDate must exist and must be a non empty string.";
//     if (!moment(date.trim(), "YYYY/MM/DD", true).isValid()) throw "releaseDate must be a valid date.";
//     date = date.trim();
//     let temp = +date.split("/")[-1];
//     if (temp < 1900 || temp > 2023)
//         throw "The year of release of the album must be between 1900 and 2024.";

//     return date
// }
function checkEmail(email) {
    email = email.trim()
    if (!email || typeof email !== 'string') throw "Email must exist and must be a string type";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw "Invalid email address"
    return email
}
function checkPhone(n)
{
    n = n.trim()
    // if(n.length === 0) throw "Phone number must exist and must be a string type.";
    if(!n || typeof n !== 'string') throw "Phone number must exist and must be a string type.";
    if(!/^\d{3}[-]?\d{3}[-]?\d{4}$/.test(n)) throw "Cell phone number has to match the format. xxxxxxxxxxx, xxx-xxx-xxxxx or (xxx)xxx-xxxxx"
    return n
}
function checkPassword(password){
    if(!password|| typeof password !== "string") throw "Password must exist and must be a string.";
    if(!/\d/.test(password)) throw "Password must contain at least one digit.";
    if(!/[a-z]/.test(password)) throw "Password must contain nat least one letter."
    if(password === password.toLowerCase()) throw "Password must have at least one upper case letter.";

    return password.trim()
}


// function CustomException(message) {
//     const error = new Error(message);

//     error.code = flag ? 400 : 404;
//     return error;
// }

