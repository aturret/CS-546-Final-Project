// In this file, you must perform all client-side validation for every single form input (and the role dropdown) on your pages. The constraints for those fields are the same as they are for the data functions and routes. Using client-side JS, you will intercept the form's submit event when the form is submitted and If there is an error in the user's input or they are missing fields, you will not allow the form to submit to the server and will display an error on the page to the user informing them of what was incorrect or missing.  You must do this for ALL fields for the register form as well as the login form. If the form being submitted has all valid data, then you will allow it to submit to the server for processing. Don't forget to check that password and confirm password match on the registration form!

// import {moment} from 'https://momentjs.com/downloads/moment.js'
// import moment from "moment";
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
        try {
            allInputs.forEach(input => {
                if (input.value.trim() !== '') input.value = checkString(input.value, input.name);
            })
        }
        catch (e) {
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
        const nameInputs = form.querySelectorAll('.name');
        const userNameInputs = form.querySelectorAll('.userName');              
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
            nameInputs.forEach(input => {                
                input.value = checkNameString(input.value, input.name, false);
            })
            userNameInputs.forEach(input => {
                input.value = checkUserName(input.value);
            })
            if (form.classList.contains('picForm')) {
                picInputs.forEach(input => {
                    const file = input.files[0];
                    if (!file) throw "No file selected";
                    if (!file.type.startsWith('image/')) throw "Picture file must be an image";
                })
            }
            if (date1 && date2) {
                checkLaterDate(date1.value, date2.value);
            }
            if (form.getElementsByClassName('confirmNewPasswordInput')) {
                const confirmPasswordInput = form.getElementsByClassName('newPasswordInput')[0];
                const PasswordInput = form.getElementsByClassName('confirmNewPasswordInput')[0];
                const oldPasswordInput = form.getElementsByClassName('oldPasswordInput')[0];
                if (confirmPasswordInput && PasswordInput && oldPasswordInput) {
                    if (confirmPasswordInput.value !== PasswordInput.value) throw "Passwords do not match";
                    if (confirmPasswordInput.value === oldPasswordInput.value) throw "New password cannot be the same as the old password";
                }
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





function checkUserName(username) {
    username = username.trim();
    if (/\s/.test(username)) throw `Error: Username cannot contain spaces`;
    return username;
}

function checkNameString(strVal, key, flag) {
    strVal = strVal.trim();
    if (/\s/.test(strVal)) throw `Error: ${key} cannot contain spaces`;
    if (/\d/.test(strVal)) throw `Error: ${key} cannot contain numbers`;
    if (strVal.length < 2 || strVal.length > 25) throw `Error: ${key} must be between 2 and 25 characters`;
    return strVal;
}



function checkString(s, key) {
    if (!s || typeof s !== 'string' || s.trim().length === 0) throw `${key} must exist and must be a non empty string`;
    return s.trim();
}

function checkDate(date) {
    const today = new Date().toISOString().split("T")[0];
    if (date < today) throw "Date must be in the future";
    return date
}

function checkLaterDate(date1, date2) {
    if (date1 > date2) throw "Date must be later than the start date";
}

function checkPhone(n)
{
    n = n.trim()
    if(!n || typeof n !== 'string') throw new "Phone number must exist and must be a string type.";
    if(!/^\d{3}[-]?\d{3}[-]?\d{4}$/.test(n)) throw new "Cell phone number has to match the format. xxxxxxxxxxx, xxx-xxx-xxxxx or (xxx)xxx-xxxxx";
    return n
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

function checkPassword(password) {
    if (!password || typeof password !== "string") throw "Password must exist and must be a string.";
    if (!/\d/.test(password)) throw "Password must contain at least one digit.";
    if (!/[a-z]/.test(password)) throw "Password must contain nat least one letter."
    if (password === password.toLowerCase()) throw "Password must have at least one upper case letter.";

    return password.trim()
}

function checkArray(arr, key, flag){
    if (!arr || !Array.isArray(arr) || arr.length === 0) throw new CustomException(`${key} must exist and must be a non empty array.`, flag);
    if (!arr.every(obj => typeof obj === "string" && obj.trim().length !== 0)) throw new CustomException(`Elements in ${key} must be non empty string type.`, flag);
    arr.map(str => str.trim())
    return arr
}


// function CustomException(message) {
//     const error = new Error(message);

//     error.code = flag ? 400 : 404;
//     return error;
// }

const deleteManager = document.getElementById("deleteMgr-form");
deleteManager.addEventListener('submit', async (event) => {    
    // event.preventDefault();
    const yourname = deleteManager.querySelectorAll('.yourname')[0].value;
    const userNameInput = deleteManager.querySelectorAll('.userNameInput')[0].value;
    if (yourname === userNameInput) {
        event.preventDefault();
        console.log('sss');
        clientError.innerHTML = "you cannot delete yourself";
    }
})