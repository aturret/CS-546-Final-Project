import express from "express";
import { Account } from "../Mongo_Connections/mongoCollections.js";
import { Order } from "../Mongo_Connections/mongoCollections.js";
import { Room } from "../Mongo_Connections/mongoCollections.js";
import { hotelReg } from "../Mongo_Connections/mongoCollections.js";
import { roomType } from "../Mongo_Connections/mongoCollections.js";
import { mgrReq } from "../Mongo_Connections/mongoCollections.js";
import { ObjectId } from "mongodb";
import * as helper from "../helper.js";
import bcrypt from "bcryptjs";
import { CustomException } from "../helper.js";
const saltRounds = 12;

/*-------------------------User Account-------------------------*/
const refInfo = {
  username: helper.checkString.bind(null, undefined, "username", true),
  avatar: helper.checkWebsite.bind(null, undefined, true),
  firstName: helper.checkNameString.bind(null, undefined, "first name", true),
  lastName: helper.checkNameString.bind(null, undefined, "last name", true),
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
  user.hotel_id = "";
  user.orders = {};

  user.password = await bcrypt.hash(args[6], saltRounds);

  const tempAccount = await Account();
  if ((await tempAccount.findOne({ username: user.username })))
    throw Error(`Account with username ${user.username} already exist.`);

  const insertInfo = tempAccount.insertOne(user);
  if (insertInfo.insertedCount === 0) throw Error("Can not create user.");


  return {message: "Create user successfully."};
}

// export async function getAllUsers() {
//   const userCollection = await users();
//   let userList = await userCollection.find({}).toArray();
//   userList = userList.map((element) => {
//     element._id = element._id.toString();
//     return element;
//   });
//   return userList;
// }

export async function getUser(username) {
  username = helper.checkString(username, "username", true);

  const tempAccount = await Account();
  const user = await tempAccount.findOne({ username: username });
  if (!user) throw CustomException(`Could not find user with username ${username}`, true);

  user._id = user._id.toString();
  return user;
  // let authenticate_result = false
  // authenticate_result = await bcrypt.compare(password, refPassword)
  // if(authenticate_result)
  // {
  //     return true;
  // }
  // return false;
}

//FINISHED: update user info
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
    { $set: set },
    { returnDocument: "after" }
  );
  if (userInfo.lastErrorObject.n === 0)
    throw CustomException(`Could not update the document with id ${id}`, true);
  return userInfo;
}

export async function addMgr(mgrName, userName, hotelId) {
  mgrName = helper.checkNameString(mgrName, "manager username", true);
  userName = helper.checkNameString(userName, "user username", true);
  hotelId = helper.checkId(hotelId, true);

  const tempAccount = await Account();
  const tempHotel = await hotelReg();

  const mgrInfo = await tempAccount.findOne({ username: mgrName }, { _id: 1 });
  if (mgrInfo === null) throw CustomException(`Could not find user with username ${mgrName}`, true);
  if (mgrInfo.identity === 'user') throw CustomException(`User ${mgrName} is not a manager, could not add another manager`, true);
  
  const userInfo = await tempAccount.findOne({ username: userName }, { _id: 1 });
  if (userInfo === null) throw CustomException(`Could not find user with username ${userName}`, true);
  if (userInfo.identity !== 'user') throw CustomException(`User ${userName} is not a user, could not upgrade`, true);

  const hotelInfo = await tempHotel.findOne({ _id: Object(hotelId) }, { _id: 1 });
  if (hotelInfo === null) throw CustomException(`Could not find hotel with ID ${hotelId}`, true);

  const newMgrMessage = userFuncs.updateUser(
    userName, 
    { identity: 'manager' }
  )

  const hotelAddMgrInfo = await tempHotel.findOneUpdate(
    { _id: hotelId },
    { $addToSet: {manager: userInfo._id}, },
    { returnDocument: "after" }
  );
  if (!hotelAddMgrInfo)
    throw CustomException(`Update hotel with id ${hotelId} failed.`, true);

  return { message: `Add a new manager ${userName} to hotel ${hotelId}` };
}

//delete account
export async function deleteAccount(username) {

  username = helper.checkString(username, "username", true);
  const tempAccount = await Account();

  //get orders
  const info = await tempAccount.find({username: username}, {orders: 1, Identity: 1, hotel_id: 1});

  //delete orders
  const reviews = [];
  const tempOrder = await Order();
  const tempRoom = await Room();
  let find_result = undefined;
  let temp_room = undefined;
  for (let i of info.orders)
  {
    find_result = await tempOrder.findOne({order_id: i}, {review: 1, hotel_id: 1, room_id: 1})
    if(!find_result) throw CustomException(`Could not find order with order_id ${i}`, true);

    //update room
    temp_room = await tempRoom.updateOne({_id: find_result.room_id}, {$pull: {order: i}});
    if(temp_room.modifiedCount === 0) throw CustomException(`Could not delete order with order_id ${i}`, true);

    reviews.push(find_result.review);

    //delete order
    await tempOrder.deleteOne({order_id: i});
  }

  //delete reviews
  const tempHotel = await hotelReg();
  let update_info = undefined;
  for (let i of reviews)
  {
    update_info = await tempHotel.updateOne({_id: i.hotel_id}, {$pull: {review: i.review}});
    if(update_info.modifiedCount === 0) throw CustomException(`Could not delete review with review_id ${i.review}`, true);
  }

  //update hotel if manager
  if(info.Identity === "manager")
  {
    const tempHotel = await hotelReg();
    const update_info = await tempHotel.updateOne({_id: info.hotel_id}, {$pull: {manager: username}});
    if(update_info.modifiedCount === 0) throw CustomException(`Could not delete manager with username ${username}`, true);
  }

  //delete user
  const delete_info = await tempAccount.deleteOne({username: username});
  if(delete_info.deletedCount === 0) throw CustomException(`Could not delete user with username ${username}`, true);

  return {message: "Delete user successfully."};

}


/*----------------------------------------  order  ----------------------------------------*/
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
//TODO: search hotel username order
export async function searchOrder(userName, hotel_id) {
  userName = helper.checkString(userName, "username", true);
  hotel_id = ObjectId(helper.checkId(hotel_id, true));
  const tempAccount = await Account();

  const user_id = tempAccount({username: userName}, {_id: 1});
  if(!user_id) throw CustomException(`Could not find user with username ${userName}`, true);
  
  const tempOrder = await Order();
  const orders = tempOrder.find({user_id: user_id, hotel_id: hotel_id}).toArray();
  if(!orders) throw CustomException(`Could not find order with username ${userName} and hotel_id ${hotel_id}`, true);

  return orders
}

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

export async function getOrderById(orderId) {
  orderId = helper.checkId(orderId, true);
  const tempOrder = await Order();

  const order = await tempOrder.findOne({ _id: ObjectId(orderId) });
  if (!order) throw CustomException(`Could not find order with ID ${orderId}`, true);
  return order;
}

export async function addOrder(...args) {
  if (args.keys().length < 9) throw CustomException("Missing inputs.");
  args.hotel_id = ObjectId(helper.checkId(args[0]), true);
  args.user_id = ObjectId(helper.checkId(args[1]), true);
  args.room_id = ObjectId(helper.checkId(args[2]), true);

  args.hotel_name = helper.checkString(args[3], "hotel name", true);
  args.checkin_date = helper.checkDate(args[4], true);
  args.checkout_date = helper.checkDate(args[5], true);

  if (!args.guests || args.guests === "null") {
    args.guests = {};
  } else {
    args.guests = helper.checkGuests(args[6], true);
  }
  args.price = helper.checkPrice(args.price[7], true);
  args.status = helper.checkStatus(args.status[8], true);
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


/*----------------------------------------  review  ----------------------------------------*/
//TODO: add review  to hotel

//get review for username
export async function getReview(username) {
  username = helper.checkString(username, "username", true);
  const tempAccount = await Account();
  const tempReview = await Review();
  const tempOrder = await Order();

  const orders = await tempAccount.find({ username: username }, { orders: 1});
  if (!orders) throw CustomException(`Could not find orders with username ${username}`, true);
  let reviews_id = [];

  for (let i = 0; i < orders.length; i++) {
    reviews_id.push(orders[i].review);
  }

  const reviews = await tempReview.find({ _id: { $in: reviews_id } }).toArray();
  if (!reviews) throw CustomException(`Could not find reviews with username ${username}`, true);

  return reviews;
}

export async function addReview(order_id, hotel_id, user_id, review, rating) {
  //rating is 1-5 stars
  const tempOrder = await Order();
  const tempHotel = await hotelReg();
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

  //check if already reviewed
  const orderInfo = await tempOrder.findOne({ _id: ObjectId(order_id) }, {review: 1});
  if (orderInfo.review !== "") throw CustomException(`Already reviewed.`, true);

  const reviewInfo = await tempReview.insertOne(newReview);
  if (reviewInfo.insertedCount.n === 0)
    throw CustomException(`Could not add the review.`, true);
  
    //update order
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
  

  //update hotel
  const hotelInfo = await tempHotel.findOneUpdate(
    { _id: ObjectId(hotel_id) },
    { $addToSet: { reviews: reviewInfo.insertedId } },
    { returnDocument: "after" }
  );
  if (hotelInfo.lastErrorObject.n === 0)
    throw CustomException(
      `Could not update the hotel with id ${hotel_id}`,
      true
    );
  
  const newHotel = await tempAccount.findOne({_id: ObjectId(hotel_id)}, {reviews: 1});
  if (newHotel.reviews.length === 0) throw CustomException(`Could not find hotel with id ${hotel_id}`, true);
  
  //calculate overall rating
  let sum = 0;
  for (let i = 0; i < newHotel.reviews.length; i++){
    const tempReview = await tempReview.findOne({_id: ObjectId(newHotel.reviews[i])}, {rating: 1});
    sum += tempReview.rating;
  }
  let overallRating = sum / newHotel.reviews.length;
  overallRating = overallRating.toFixed(2);
  overallRating = parseFloat(overallRating);
  const updateHotel = await tempHotel.findOneUpdate({_id: ObjectId(hotel_id)}, {$set: {overall_rating: overallRating}}, {returnDocument: "after"});

  return true;
}

//TODO: vote review
export async function voteReview(review_id, flag) {
  review_id = helper.checkId(review_id, true);

  const tempReview = await Review();
  let updateInfo = undefined;
  if (flag){
    updateInfo = await tempReview.findOneUpdate(
      { _id: ObjectId(review_id) },
      { $inc: { upvote: 1 } },
      { returnDocument: "after" }
    );
  }
  else{
    updateInfo = await tempReview.findOneUpdate(
      { _id: ObjectId(review_id) },
      { $inc: { downvote: 1 } },
      { returnDocument: "after" }
    );
  }
  if (updateInfo.lastErrorObject.n === 0)
    throw CustomException(
      `Could not update the document with id ${review_id}`,
      true
    );

  return true;
}

//update review
export async function updateReview(review_id, review, rating) {
  review_id = helper.checkId(review_id, true);
  review = helper.checkString(review, "review", true);
  rating = helper.checkRating(rating, true);

  const tempReview = await Review();
  const reviewInfo = await tempReview.findOneUpdate(
    { _id: ObjectId(review_id) },
    { $set: { comment: review, rating: rating } },
    { returnDocument: "after" }
  );
  if (reviewInfo.lastErrorObject.n === 0) throw CustomException(`Could not update the review with id ${review_id}`, true);

  //update hotel rating
  const hotel_id = reviewInfo.hotel_id;
  const tempHotel = await hotelReg();
  const hotel_reviews = await tempHotel.findOne({_id: ObjectId(hotel_id)}, {reviews: 1});
  if (hotelInfo.reviews.length === 0) throw CustomException(`Could not find hotel with id ${hotel_id}`, true);
  let sum = 0;
  for (let i of hotel_reviews){
    const tempReview = await tempReview.findOne({_id: ObjectId(i)}, {rating: 1});
    sum += tempReview.rating;
  }
  let overallRating = sum / hotel_reviews.length;
  overallRating = overallRating.toFixed(2);
  overallRating = parseFloat(overallRating);
  const updateHotel = await tempHotel.findOneUpdate({_id: ObjectId(hotel_id)}, {$set: {overall_rating: overallRating}}, {returnDocument: "after"});
  if (updateHotel.lastErrorObject.n === 0) throw CustomException(`Could not update the hotel with id ${hotel_id}`, true);

  return {successMessage: "Review updated successfully."};
}




//delete review
export async function deleteReview(review_id) {
  review_id = helper.checkId(review_id, true);

  const tempReview = await Review();
  const reviewInfo = await tempReview.findOne(
    { _id: ObjectId(review_id) }
  );
  if (reviewInfo === null) throw CustomException(`Could not find review with id ${review_id}`, true);
  
  const user_id = reviewInfo.user_id;
  //delete review from user
  const tempAccount = await Account();
  const userInfo = await tempAccount.findOneUpdate({_id: ObjectId(user_id)}, {$pull: {reviews: review_id}});
  if (userInfo.lastErrorObject.n === 0) throw CustomException(`Could not update user with id ${user_id}`, true);

  //delete review from hotel
  const hotel_id = reviewInfo.hotel_id;
  const tempHotel = await hotelReg();
  const hotelInfo = await tempHotel.findOneUpdate({_id: ObjectId(hotel_id)}, {$pull: {reviews: review_id}});
  if (hotelInfo.lastErrorObject.n === 0) throw CustomException(`Could not update hotel with id ${hotel_id}`, true);

  //update hotel rating
  const hotel_reviews = await tempHotel.findOne({_id: ObjectId(hotel_id)}, {reviews: 1});
  if (hotelInfo.reviews.length === 0) throw CustomException(`Could not find hotel with id ${hotel_id}`, true);
  let sum = 0;
  for (let i of hotel_reviews){
    const tempReview = await tempReview.findOne({_id: ObjectId(i)}, {rating: 1});
    sum += tempReview.rating;
  }
  let overallRating = sum / hotel_reviews.length;
  overallRating = overallRating.toFixed(2);
  overallRating = parseFloat(overallRating);
  const updateHotel = await tempHotel.findOneUpdate({_id: ObjectId(hotel_id)}, {$set: {overall_rating: overallRating}}, {returnDocument: "after"});
  if (updateHotel.lastErrorObject.n === 0) throw CustomException(`Could not update the hotel with id ${hotel_id}`, true);


  //delete review for order
  const tempOrder = await Order();
  const orderInfo = await tempOrder.findOneUpdate({review: review_id}, {$set: {review: ""}});
  if (orderInfo.lastErrorObject.n === 0) throw CustomException(`Could not update order with id ${order_id}`, true);

  const deleteInfo = await tempReview.deleteOne({ _id: ObjectId(review_id) });
  if (deleteInfo.deletedCount.n === 0) throw CustomException(`Could not delete review with id ${review_id}`, true);

  return {message: "Review deleted."};
}

/*-----------------------------Request---------------------------------*/
//TODO: create request. request document should have three field. id, user_id, hotel_id.
export async function createRequest(...args) {
  args[0] = helper.checkString(args[0], "hotel name", true);
  args[1] = helper.checkString(args[1], "street", true);
  args[2] = helper.checkString(args[2], "city", true);
  args[3] = helper.checkString(args[3], "state", true);
  args[4] = helper.checkZip(args[4], true);
  args[5] = helper.checkPhone(args[5], true);
  args[6] = helper.checkEmail(args[6], true);
  args[7] = args[7]
    ? args[7].map((web) => helper.checkWebsite(web, true))
    : [];
  if (args[8] && Array.isArray(args[8])) {
    args[8] = args[8].map((facility) =>
      helper.checkString(facility, "facility", true)
    );
  } else if (!args[8]) {
    args[8] = [];
  } else {
    throw CustomException("Invalid facilities.", true);
  }
  args[9] = args[9]
  ? args[9].map((manager) => helper.checkId(manager, true))
  : undefined;

  const tempAccount = await Account();
  const tempRequest = await mgrReq();
  const tempHotel = await hotelReg();

  const userInfo = await tempAccount.findOne({ _id: args[9][0] }, { _id: 1 });
  if (userInfo === null) throw CustomException(`Could not find user with username ${username}`, true);

  const hotelInfo = await tempHotel.findOne(
    {
      name: args[0],
      street: args[1],
      city: args[2],
      state: args[3],
      zip_code: args[4],
    }, 
    { _id: 1 });
  if (hotelInfo !== null) throw CustomException('Hotel exist', true);

  const newRequest = {
    username: userInfo.username,
    args: args,
    status: "pending"
  };

  const requestInfo = await tempRequest.insertOne(newRequest);
  if (requestInfo.insertedCount.n === 0)
    throw CustomException(`Could not add the request.`, true);

  return { message: 'Request submit, wait for approval' };
}

//get request by username
export async function getRequest(username) {
  username = helper.checkString(username, "username", true);

  const tempRequest = await mgrReq();
  const requestInfo = await tempRequest.findOne({username: username});
  if (requestInfo !== null) return false;

  return true
}