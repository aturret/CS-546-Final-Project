import { Account } from "./Mongo_Connections/mongoCollections.js";
import { ObjectId } from 'mongodb';
import moment from 'moment';
import _ from 'underscore'



export function CustomException(message) {
    const error = new Error(message);
  
    error.code = "400 or 500";
    return error;
}

export function checkString(s, key){
    if(!s || typeof s !== 'string' || s.trim().length === 0) throw new CustomException(`${key} must exist and must be a non empty string`);
    return s.trim();
}

export function checkNumber(n){
    if(!n || typeof n !== 'string') throw new CustomException("Website must exist and must be a string type.");
    n = n.trim()
    if(!/^[0-9]{10}$/.test(n)) throw new CustomException("Phone number must be valid.");
    return n
}

export function checkId(id){
    if(!id || typeof id !== 'string' || id.trim().length === 0) throw new CustomException('Id must exist and must be a non empty string');
    if(!ObjectId.isValid(id)) throw new CustomException('Id must be a valid ObjectId.');

    return id.trim();
}

export function checkArray(arr, key){
    if (!arr || !Array.isArray(arr) || arr.length === 0) throw new CustomException(`${key} must exist and must be a non empty array.`);
    if (!arr.every(obj => typeof obj === "string" && obj.trim().length !== 0)) throw new CustomException(`Elements in ${key} must be non empty string type.`);
    arr.map(str => str.trim())
    return arr
}

export function checkDate(date){
    if(!date || typeof date !== "string" || date.trim().length === 0) throw new CustomException("releaseDate must exist and must be a non empty string.");
    if(!moment(date.trim(), "YYYY-MM-DD", true).isValid()) throw new CustomException("releaseDate must be a valid date.");
    date = date.trim();
    let temp = +date.split("/")[-1];
    if (temp < 1900 || temp > 2023)
      throw new CustomException("The year of release of the album must be between 1900 and 2024.");

    return date
}

export function checkRating(rating){
    if(!rating || typeof rating !== 'number') throw new CustomException("Rating must exist and must be a number.");
    if ( (rating * 10) % 1 != 0) throw new CustomException("Rating can only have one decimal digit.");
    if (rating > 5 || rating < 1) throw new CustomException("Rating must between 1 and 5");
    return rating
}

export function checkPassword(password){
    if(!password|| typeof password !== "string") throw new CustomException("Password must exist and must be a string.");
    if(!/\d/.test(password)) throw new CustomException("Password must contain at least one digit.");
    if(!/[a-z]/.test(password)) throw new CustomException("Password must contain nat least one letter.")
    if(password === password.toLowerCase()) throw new CustomException("Password must have at least one upper case letter.");

    return password.trim()
}


export function checkWebsite(web)
{
    web = web.trim()
    if(!web || typeof web !== 'string') throw new CustomException("Website must exist and must be a string type.");
    if(!/^(https?:\/\/)?([\w.-]+)\.([a-z]{2,})(:\d{1,5})?([\/?].*)?$/i.test(web)) throw new CustomException("Website has to match the format.");
    return web
}

export function checkPhone(n)
{
    n = n.trim()
    if(!n || typeof n !== 'string') throw new CustomException("Phone number must exist and must be a string type.");
    if(!/^\d{3}[-]?\d{3}[-]?\d{4}$/.test(web)) throw new CustomException("Cell phone number has to match the format. xxxxxxxxxxx, xxx-xxx-xxxxx or (xxx)xxx-xxxxx")
    return n
}

export function checkEmail(email)
{
    email = email.trim()
    if(!email || typeof email !== 'string') throw new CustomException("Email must exist and must be a string type");
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new CustomException("Invalid email address")
    return email
}

export function checkGuest(obj)
{
    if (!obj || !Array.isArray(obj)) throw new CustomException("Object must exist and must be an object.");
    for (let guest in obj){
        guest.firstName = checkString(guest.firstName, "First name")
        guest.lastName = checkString(quest.lastName, "last name")
    }

    return obj
}

export function checkPrice(price)
{
    if (!price || typeof price !== "number") throw new CustomException("Price must exist and must be a number.");

    return price
}