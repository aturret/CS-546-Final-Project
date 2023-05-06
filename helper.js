import { Account } from "./Mongo_Connections/mongoCollections.js";
import { ObjectId } from 'mongodb';
import moment from 'moment';
import faker from 'faker';



export function CustomException(message, flag) {
    const error = new Error(message);
  
    error.code = flag? 400 : 404;
    return error;
}

export function checkString(s, key, flag){
    if(!s || typeof s !== 'string' || s.trim().length === 0) throw new CustomException(`${key} must exist and must be a non empty string`, flag);
    return s.trim();
}

// export function checkNumber(n, flag){
//     if(!n || typeof n !== 'number') throw new CustomException("Room number must exist and must be a string type.", flag);
//     n = n.trim()
//     if(!/^[0-9]{10}$/.test(n)) throw new CustomException("Phone number must be valid.", flag);
//     return n
// }

export function checkId(id, flag){
    if(!id || typeof id !== 'string' || id.trim().length === 0) throw new CustomException('Id must exist and must be a non empty string', flag);
    if(!ObjectId.isValid(id)) throw new CustomException('Id must be a valid ObjectId.', flag);

    return id.trim();
}

export function checkArray(arr, key, flag){
    if (!arr || !Array.isArray(arr) || arr.length === 0) throw new CustomException(`${key} must exist and must be a non empty array.`, flag);
    if (!arr.every(obj => typeof obj === "string" && obj.trim().length !== 0)) throw new CustomException(`Elements in ${key} must be non empty string type.`, flag);
    arr.map(str => str.trim())
    return arr
}

export function checkDate(date, flag){
    if(!date || typeof date !== "string" || date.trim().length === 0) throw new CustomException("Date must exist and must be a non empty string.", flag);
    if(!moment(date.trim(), "YYYY/MM/DD", true).isValid()) throw new CustomException("Date must be a valid date.", flag);
    date = date.trim();
    let temp = +date.split("/")[0];
    if (temp < 1900 || temp > 2023)
      throw new CustomException("The year of release of the album must be between 1900 and 2024.", flag);

    return date;
}

export function checkZip(zip, flag){
    if(!zip || typeof zip !== 'string') throw new CustomException("Zip must exist and must be a string type.", flag);
    zip = zip.trim()
    if(!/^[0-9]{5}$/.test(zip)) throw new CustomException("Zip must be valid.", flag);
    return zip
}

export function checkRating(rating, flag){
    if(!rating || typeof rating !== 'number') throw new CustomException("Rating must exist and must be a number.", flag);
    if ( (rating * 10) % 1 != 0) throw new CustomException("Rating can only have one decimal digit.", flag);
    if (rating > 5 || rating < 1) throw new CustomException("Rating must between 1 and 5"), flag;
    return rating
}

export function checkPassword(password, flag){
    if(!password|| typeof password !== "string") throw new CustomException("Password must exist and must be a string.", flag);
    if(!/\d/.test(password)) throw new CustomException("Password must contain at least one digit.", flag);
    if(!/[a-z]/.test(password)) throw new CustomException("Password must contain nat least one letter.", flag)
    if(password === password.toLowerCase()) throw new CustomException("Password must have at least one upper case letter.", flag);

    return password.trim()
}


export function checkWebsite(web, flag)
{
    web = web.trim()
    if(!web || typeof web !== 'string') throw new CustomException("Website must exist and must be a string type.", flag);
    if(!/^(https?:\/\/)?([\w.-]+)\.([a-z]{2,})(:\d{1,5})?([\/?].*)?$/i.test(web)) throw new CustomException("Website has to match the format.", flag);
    return web
}

export function checkPhone(n, flag)
{
    n = n.trim()
    if(!n || typeof n !== 'string') throw new CustomException("Phone number must exist and must be a string type.", flag);
    if(!/^\d{3}[-]?\d{3}[-]?\d{4}$/.test(n)) throw new CustomException("Cell phone number has to match the format. xxxxxxxxxxx, xxx-xxx-xxxxx or (xxx)xxx-xxxxx", flag)
    return n
}

export function checkEmail(email, flag)
{
    email = email.trim()
    if(!email || typeof email !== 'string') throw new CustomException("Email must exist and must be a string type", flag);
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new CustomException("Invalid email address", flag)
    return email
}

export function checkGuests(obj, flag)
{
    if (!obj || !Array.isArray(obj)) throw new CustomException("Object must exist and must be an object.", flag);
    for (let guest of obj){
        guest.firstName = checkNameString(guest.firstName, "First name", true)
        guest.lastName = checkNameString(guest.lastName, "last name", true)
    }

    return obj
}

export function checkPrice(price, flag)
{
    if (!price || typeof price !== "number") throw new CustomException("Price must exist and must be a number.", flag);

    return price
}

export function checkStatus(status, flag)
{
    const ref = ["cancelled", "accepted"]
    status = status.trim()
    if (!status || typeof status !== "string" || !ref.includes(status)) throw new CustomException(`Invalid status `, flag);
    return status
}

export function checkNameString(strVal, key, flag) {
    strVal = strVal.trim();
    if (/\s/.test(strVal)) throw CustomException(`Error: ${key} cannot contain spaces`, flag);
    if (/\d/.test(strVal)) throw CustomException(`Error: ${key} cannot contain numbers`, flag);
    if (strVal.length < 2 || strVal.length > 25) throw CustomException(`Error: ${key} must be between 2 and 25 characters`, flag);
    return strVal;
}

export function checkUserName(username, flag) {
    username = username.trim();
    if (/\s/.test(username)) throw CustomException("Error: Username cannot contain spaces", flag);
    return username;
}


/* ------------------------------------------- seed functions ------------------------------------------- */
const ref = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"]
export function* randomUserGenerator(){
    for (let i of ref)
    {
        
        yield {
            username: "User" + i,
            firstName: "User" + i,
            password: "User" + i + "1!",
            lastName: i,
            email: "User" + i + "@email.com",
            phone: faker.phone.phoneNumber("###-###-####"),
            identity: "user",
            avatar: "https://www.pngitem.com/pimgs/m/146-1468479_my-profile-icon-blank-profile-picture-circle-hd.png"
        }
    }
}

export function* randomHotelGenerator(){
    const base = "hotel"
    for (let i of ref)
    {
        yield {
            name: "hotel" + i,
            street: faker.address.streetAddress(),
            city: faker.address.city(),
            state: faker.address.state(),
            zip_code: faker.address.zipCode("#####"),
            phone: faker.phone.phoneNumber("###-###-####"),
            email: faker.internet.email(),
            picture: ["https://www.pngitem.com/pimgs/m/146-1468479_my-profile-icon-blank-profile-picture-circle-hd.png"],
            managers: []
        }
    }
}

export function* randomManagerGenerator(){
    const base = "Manager"
    for (let i of ref)
    {
        yield {
            username: base + i,
            password: base + i + "1!",
            firstName: base + i,
            lastName: i,
            email: base + i + "@email.com",
            phone: faker.phone.phoneNumber("###-###-####"),
            identity: "manager",
            avatar: "https://www.pngitem.com/pimgs/m/146-1468479_my-profile-icon-blank-profile-picture-circle-hd.png"
        }
    }
}

export function* randomRoomTypeGenerator(i){
    while(true)
    {
        yield {
            name: undefined,
            price: faker.random.number(50, 1000),
            picture: ["https://www.pngitem.com/pimgs/m/146-1468479_my-profile-icon-blank-profile-picture-circle-hd.png"],
        }
    }
}
   

export function* randomRoomGenerator(i){
    while(true)
    {
        yield {
            room_number: faker.random.number(99999).toString(),
            picture: ["https://www.pngitem.com/pimgs/m/146-1468479_my-profile-icon-blank-profile-picture-circle-hd.png"],
        }
    }
}

export function* randomOrderGenerator(i){
    for (let i of ref)
    {
        const checkin_date = "2023/05/01"
        const checkout_date = "2023/05/07"
        yield {
            checkin_date: checkin_date,
            checkout_date: checkout_date,
            price: faker.datatype.number(50, 1000),
            status: "accepted",
            guest: [{
                firstName: faker.name.firstName(),
                lastName: faker.name.lastName(),
            }]
        }
    }
}

export function* randomReviewGenerator(){
    while(true)
    {
        yield {
            rating: faker.datatype.number(1, 5),
            comment: faker.lorem.paragraph()
        }
    }
}