import express from 'express'
import { Account } from ".././Account_Connections/mongoCollections.js";
import { ObjectId } from "mongodb";
import helper from ".././helper.js";
import bcrypt from 'bcryptjs'

const saltRounds = 12;

export function CustomException(message) {
    const error = new Error(message);
  
    error.code = "400 or 500";
    return error;
}


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
