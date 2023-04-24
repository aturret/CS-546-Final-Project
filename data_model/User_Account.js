import express from 'express'
import { Account } from "../Mongo_Connections/mongoCollections.js";
import { Order } from "../Mongo_Connections/mongoCollections.js";
import { Room } from "../Mongo_Connections/mongoCollections.js";
import { ObjectId } from "mongodb";
import helper from "../helper.js";
import bcrypt from 'bcryptjs'

const saltRounds = 12;
export function CustomException(message) {
    const error = new Error(message);
  
    error.code = "400 or 500";
    return error;
}

const refInfo = {"username": helper.checkString.bind(null, key="username"), "avatar": helper.checkWebsite, "firstName": helper.checkString.bind(null, key="firstName"), "lastName": helper.checkString.bind(null, key="lastName"), "phone": helper.checkPhone, "password": helper.checkPassword, "email": helper.checkEmail}

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
    if (userInfo.lastErrorObject.n === 0) throw Error(`Could not update the document with id ${id}`);
    return userInfo;
}

//TODO: add delete orders
//add order
export async function addOrder(arg){
    if (arg.keys().length < 8) throw CustomException("Missing inputs.")
    arg.hotel_id = ObjectId(helper.checkId(arg.hotel_id));
    arg.user_id = ObjectId(helper.checkId(arg.user_id));
    arg.room_id = ObjectId(helper.checkId(arg.room_id));
    //how to check date?
    arg.checkin_date = helper.checkDate(arg.checkin_date);
    arg.checkout_date = helper.checkDate(arg.checkout_date);
    if (!arg.guests || arg.guests === "null") {arg.guests = {};}
    else{arg.guests = helper.checkGuests(arg.guests);}
    arg.price = helper.checkPrice(arg.price);
    arg.status = helper.checkStatus(arg.status);
    arg.review = "";

    //update user account, and add order to order database
    const tempOrder = await Order();
    const tempAccount = await Account();
    const orderInfo = tempOrder.insertOne(arg);
    if (orderInfo.insertedCount.n === 0) throw Error(`Could not add the order.`);
    const updateInfo = await tempAccount.findOneUpdate({_id: ObjectId(args.user_id)}, {$set, set}, {returnDocument: 'after'});
    if (updateInfo.lastErrorObject.n === 0) throw Error(`Could not update the account with id ${args.user_id}`);

    //update room 
    const tempRoom = await Room();
    const roomInfo = await tempRoom.findOneUpdate({_id: ObjectId(arg.room_id)}, {$set, set}, {returnDocument: 'after'});
    if(roomInfo.lastErrorObject.n === 0) throw Error(`Could not update the room with id ${arg.room_id}`);

    return true;
}

//change order status to canceled
export async function deleteOrder(order_id){
    order_id = helper.checkId(order_id);

    const tempOrder = await Order();
    const orderInfo = await tempOrder.findOneUpdate({"_id": order_id}, {"status": "canceled"});
    if (orderInfo.lastErrorObject.n === 0) throw Error(`Could not update the document with id ${order_id}`);
    return orderInfo;
}



//TODO: add review  to hotel
export async function addReview(order_id, hotel_id, user_id, review, rating){
     //rating is 1-5 stars
    const tempOrder = await Order();
    const tempHotel = await Hotel();
    const tempReview = await Review();

    order_id = helper.checkId(order_id);
    hotel_id = helper.checkId(hotel_id);
    user_id = helper.checkId(user_id);
    review = helper.checkString(review, 'review');
    rating = helper.checkRating(rating);
    const review = {
        hotel_id: hotel_id,
        user_id: user_id,
        comment: review,
        rating: rating,
        upvote: 0,
        downvote: 0,
    }

    const reviewInfo = await tempReview.insertOne(review);
    if (reviewInfo.insertedCount.n === 0) throw Error(`Could not add the review.`);
    const updateInfo = await tempOrder.findOneUpdate({_id: ObjectId(order_id)}, {$set: {review: reviewInfo.insertedId}}, {returnDocument: 'after'});
    if (updateInfo.lastErrorObject.n === 0) throw Error(`Could not update the order with id ${order_id}`);

    const hotelInfo = await tempHotel.findOneUpdate({_id: ObjectId(hotel_id)}, {$addToSet: {review: reviewInfo.insertedId}}, {returnDocument: 'after'});
    if (hotelInfo.lastErrorObject.n === 0) throw Error(`Could not update the hotel with id ${hotel_id}`);

    return true;
}

//TODO: vote review
export async function voteReview(review_id){

    review_id = helper.checkId(review_id);

    const tempReview = await Review();
    const updateInfo = await tempReview.findOneUpdate({_id: ObjectId(review_id)}, {$inc: {upvote: 1}}, {returnDocument: 'after'});
    if (updateInfo.lastErrorObject.n === 0) throw Error(`Could not update the document with id ${review_id}`);

    return true;
}