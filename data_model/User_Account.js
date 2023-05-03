import express from "express";
import { Account } from "../Mongo_Connections/mongoCollections.js";
import { Order } from "../Mongo_Connections/mongoCollections.js";
import { Room } from "../Mongo_Connections/mongoCollections.js";
import { Hotel } from "../Mongo_Connections/mongoCollections.js";
import { roomType } from "../Mongo_Connections/mongoCollections.js";
import { request } from "../Mongo_Connections/mongoCollections.js";
import { ObjectId } from "mongodb";
import * as helper from "../helper.js";
import bcrypt from "bcryptjs";
import { CustomException } from "../helper.js";
const saltRounds = 12;

const refInfo = {
  username: helper.checkString.bind(null, undefined, "username", true),
  avatar: helper.checkWebsite.bind(null, undefined, true),
  firstName: helper.checkString.bind(null, undefined, "first name", true),
  lastName: helper.checkString.bind(null, undefined, "last name", true),
  phone: helper.checkPhone.bind(null, undefined, true),
  password: helper.checkPassword.bind(null, undefined, true),
  email: helper.checkEmail.bind(null, undefined, true),
};

export async function create(...args) {
  console.log(args);
  let user = {};
  user.username = helper.checkString(args[1], "username", true);
  user.identity = helper.checkString(args[0], "identity", true).toLowerCase();
  if (["manager", "user", "admin"].every((obj) => obj !== user.identity))
    throw CustomException("Invalid identity.", true);
  user.avatar = args[2]? helper.checkWebsite(args[2], true): args[2];
  user.firstName = helper.checkString(args[3], "first name", true);
  user.lastName = helper.checkString(args[4], "last name", true);
  user.phone = args[5]? helper.checkNumber(args[5], true): args[5];
  args[6] = helper.checkPassword(args[6], true);
  user.email = helper.checkEmail(args[7], true);
  user.hotels = [];
  user.orders = {};

  user.password = await bcrypt.hash(args[6], saltRounds);

  const tempAccount = await Account();
  if ((await tempAccount.findOne({ username: user.username })))
    throw Error(`Account with username ${user.username} already exist.`);

  const insertInfo = tempAccount.insertOne(user);
  if (insertInfo.insertedCount === 0) throw Error("Can not create user.");


  return {message: "Create user successfully."};
}

export async function getUser(username) {
  username = helper.checkString(username, "username", true);

  const tempAccount = await Account();
  const user = await tempAccount.findOne({ username: username });
  return user;
  // let authenticate_result = false
  // authenticate_result = await bcrypt.compare(password, refPassword)
  // if(authenticate_result)
  // {
  //     return true;
  // }
  // return false;
}

//TODO: update user info
export async function updateUser(username, set) {
  if (typeof set !== "object" || Array.isArray(set) || set === "null")
    throw CustomException("invalid update input", true);
  username = helper.checkString(username, "username", true);
  const tempAccount = await Account();
  let updateInfo = {};
  for (let items in set.keys()) {
    updateInfo[items] = refInfo[items](set.items);
  }
  const userInfo = await tempAccount.findOneUpdate(
    { username: username },
    { $set, set },
    { returnDocument: "after" }
  );
  if (userInfo.lastErrorObject.n === 0)
    throw CustomException(`Could not update the document with id ${id}`, true);
  return userInfo;
}

//TODO: add delete orders
//get order for user.  return order details
/*
@params: username
@return: hotel_name: 1,
        checkin_date: 1,
        checkout_date: 1,
        guests: 1,
        order_price: 1,
        order_status: 1,
        review: 1
*/
export async function getOrder(username) {
  username = helper.checkString(username, "username", true);
  const tempAccount = await Account();

  const rv = await tempAccount.aggregate([
    {
      $match: { username: username },
    },
    {
      $lookup: {
        from: "hotels",
        localField: "hotel_id",
        foreignField: "_id",
        as: "order_details",
      },
    },
    {
      $project: {
        _id: 0,
        hotel_name: 1,
        checkin_date: 1,
        checkout_date: 1,
        guests: 1,
        order_price: 1,
        order_status: 1,
        review: 1,
      },
    }
  ]);
  if (!rv)
    throw CustomException(
      `Could not find order with username ${username}`,
      true
    );
  return rv;
}

export async function addOrder(...args) {
  if (args.keys().length < 9) throw CustomException("Missing inputs.");
  args.hotel_id = ObjectId(helper.checkId(args.hotel_id), true);
  args.user_id = ObjectId(helper.checkId(args.user_id), true);
  args.room_id = ObjectId(helper.checkId(args.room_id), true);
  //how to check date?
  args.hotel_name = helper.checkString(args.hotel_name, "hotel name", true);
  args.checkin_date = helper.checkDate(args.checkin_date, true);
  args.checkout_date = helper.checkDate(args.checkout_date, true);
  if (!args.guests || args.guests === "null") {
    args.guests = {};
  } else {
    args.guests = helper.checkGuests(args.guests, true);
  }
  args.price = helper.checkPrice(args.price, true);
  args.status = helper.checkStatus(args.status, true);
  args.review = "";

  //update user account, and add order to order database
  const tempOrder = await Order();
  const tempAccount = await Account();
  const orderInfo = tempOrder.insertOne(args);
  if (orderInfo.insertedCount.n === 0)
    throw CustomException(`Could not add the order.`, true);
  const updateInfo = await tempAccount.findOneUpdate(
    { _id: ObjectId(args.user_id) },
    { $set, set },
    { returnDocument: "after" }
  );
  if (updateInfo.lastErrorObject.n === 0)
    throw CustomException(
      `Could not update the account with id ${args.user_id}`,
      true
    );

  //update room
  const tempRoom = await Room();
  const roomInfo = await tempRoom.findOneUpdate(
    { _id: ObjectId(args.room_id) },
    { $set, set },
    { returnDocument: "after" }
  );
  if (roomInfo.lastErrorObject.n === 0)
    throw CustomException(
      `Could not update the room with id ${args.room_id}`,
      true
    );

  return true;
}

//Manager can update order dates, guests, price, status
export async function updateOrder(order_id, checkin_date, checkout_date, guest, price, status) {
  order_id = ObjectId(helper.checkId(order_id, true));
  checkin_date = helper.checkDate(checkin_date, true);
  checkout_date = helper.checkDate(checkout_date, true);
  guest = helper.checkArray(guest, "guest", true);
  price = helper.checkPrice(price, true);
  status = helper.checkStatus(status, true);

  const newInfo = {
    checkin_date: checkin_date,
    checkout_date: checkout_date,
    guest: guest,
    price: price,
    status: status
  }

  const tempOrder = await Order();
  const orderInfo = await tempOrder.findOneUpdate({_id: order_id}, {$set: newInfo}, {returnDocument: "after"});
  if (orderInfo.lastErrorObject.n === 0) {
    throw CustomException(`Could not update the order with id ${order_id}`, true);
  }
  return {message: "Order updated successfully."};
}


//change order status to canceled
export async function deleteOrder(order_id) {
  order_id = helper.checkId(order_id, true);

  const tempOrder = await Order();
  const orderInfo = await tempOrder.findOneUpdate(
    { _id: order_id },
    { status: "canceled" }
  );
  if (orderInfo.lastErrorObject.n === 0)
    throw CustomException(
      `Could not update the document with id ${order_id}`,
      true
    );
  return orderInfo;
}

//TODO: add review  to hotel
export async function addReview(order_id, hotel_id, user_id, review, rating) {
  //rating is 1-5 stars
  const tempOrder = await Order();
  const tempHotel = await Hotel();
  const tempReview = await Review();

  order_id = helper.checkId(order_id, true);
  hotel_id = helper.checkId(hotel_id, true);
  user_id = helper.checkId(user_id, true);
  review = helper.checkString(review, "review", true);
  rating = helper.checkRating(rating, true);
  const newReview = {
    hotel_id: hotel_id,
    user_id: user_id,
    comment: review,
    rating: rating,
    upvote: 0,
    downvote: 0,
  };

  const reviewInfo = await tempReview.insertOne(newReview);
  if (reviewInfo.insertedCount.n === 0)
    throw CustomException(`Could not add the review.`, true);
  const updateInfo = await tempOrder.findOneUpdate(
    { _id: ObjectId(order_id) },
    { $set: { review: reviewInfo.insertedId } },
    { returnDocument: "after" }
  );
  if (updateInfo.lastErrorObject.n === 0)
    throw CustomException(
      `Could not update the order with id ${order_id}`,
      true
    );

  const hotelInfo = await tempHotel.findOneUpdate(
    { _id: ObjectId(hotel_id) },
    { $addToSet: { review: reviewInfo.insertedId } },
    { returnDocument: "after" }
  );
  if (hotelInfo.lastErrorObject.n === 0)
    throw CustomException(
      `Could not update the hotel with id ${hotel_id}`,
      true
    );

  return true;
}

//TODO: vote review
export async function voteReview(review_id) {
  review_id = helper.checkId(review_id, true);

  const tempReview = await Review();
  const updateInfo = await tempReview.findOneUpdate(
    { _id: ObjectId(review_id) },
    { $inc: { upvote: 1 } },
    { returnDocument: "after" }
  );
  if (updateInfo.lastErrorObject.n === 0)
    throw CustomException(
      `Could not update the document with id ${review_id}`,
      true
    );

  return true;
}



//TODO: create request. request document should have three field. id, user_id, hotel_id.
export async function createRequest(username) {}

