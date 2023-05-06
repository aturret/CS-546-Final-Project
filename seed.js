import { Account } from "./Mongo_Connections/mongoCollections.js";
import * as helper from "./helper.js";
import * as userFuncs from './data_model/User_Account.js'


const admin = {
    username: "admin",
    password: "admin",
    firstName: "admin",
    lastName: "admin",
    email: "group47@gmail.com",
    phone: "1234567890",
    identity: "admin",
    avatar: "https://www.pngitem.com/pimgs/m/146-1468479_my-profile-icon-blank-profile-picture-circle-hd.png"
}

await userFuncs.create(admin.identity, admin.username, admin.avatar, admin.firstName, admin.lastName, admin.phone, admin.password, admin.email);

const user1 = {
    username: "userone",
    password: "userone",
    firstName: "userone",
    lastName: "one",
    email: "userone@email.com",
    phone: "1234567890",
    identity: "user",
    avatar: "https://www.pngitem.com/pimgs/m/146-1468479_my-profile-icon-blank-profile-picture-circle-hd.png"
}