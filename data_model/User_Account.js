import express from 'express'
import { Account } from "../Mongo_Connections/mongoCollections.js";
import { Order } from "../Mongo_Connections/mongoCollections.js";
import { ObjectId } from "mongodb";
import helper from "../helper.js";
import bcrypt from 'bcryptjs'

const saltRounds = 12;

export function CustomException(message) {
    const error = new Error(message);
  
    error.code = "400 or 500";
    return error;
}

const refInfo = {"username": helper.checkString(key="username"), "avatar": helper.checkWebsite(), "firstName": helper.checkString(key="firstName"), "lastName": helper.checkString(key="lastName"), "phone": helper.checkPhone(), "password": helper.checkPassword(), "email": helper.checkEmail()}

export async function create(...args){
    if (args.length < 8) throw CustomException("Missing inputs.")
    let user = {};

    user.username = helper.checkString(args[1], 'username');
    user.identity = helper.checkString(args[0], 'identity').toLowerCase();
    if (['manager', 'user', 'admin'].every(obj => obj !== user.identity)) throw CustomException("Invalid identity.")
    user.avatar = helper.checkWebsite(args[2]);
    user.firstName = helper.checkString(args[3], 'first name');
    user.lastName = helper.checkString(args[4], 'last name');
    user.phone = helper.checkNumber(args[5])
    args[6] = helper.checkPassword(args[6])
    user.email = helper.checkEmail(args[7])
    user.hotel = [];
    user.orders = {};   

    user.password = await bcrypt.hash(args[6], saltRounds);
    
    const tempAccount = await account();
    if(!(await tempAccount.findOne({username: user.username}))) throw Error(`Account with username ${user.username} already exist.`);

    const insertInfo = tempAccount.insertOne(user);
    if (insertInfo.insertedCount === 0) throw Error('Can not create user.');

    const tempId = insertInfo.insertedId;

    const curAccount = await tempAccount.findOne({_id: tempId});
    curAccount._id = curAccount._id.toString();
    return curAccount;
}

export async function getUser (username){
    username = helper.checkString(username, 'username');

    const tempAccount = await Account();
    const user = await tempAccount.findOne({username: username})
    return user
    // let authenticate_result = false
    // authenticate_result = await bcrypt.compare(password, refPassword)
    // if(authenticate_result)
    // {
    //     return true;
    // }
    // return false;
}

//TODO: update user info
export async function updateUser(username, set)
{
    if (typeof set !== "object" || Array.isArray(set)|| set === "null") throw Error("invalid update input")
    username = helper.checkString(username, 'username');
    const tempAccount = await Account();
    let updateInfo = {}
    for (let items in set.keys())
    {
        updateInfo[items] = refInfo[items](set.items)
    }
    const userInfo = await tempAccount.findOneUpdate({username: username}, {$set, set}, {returnDocument: 'after'});
    
}

//TODO: add delete update orders
export async function updateOrder(order_id, set)

//TODO: create order
export async function bookHotel(hotel_id, room_id, user_id, check_in, check_out, guests, price){

}

//TODO: add review
export async function comment(user_id, hotel_id, rating, comment){

}

//TODO: vote review
export async function voteReview(review_id){


}