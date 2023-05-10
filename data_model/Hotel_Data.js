//crud for hotel
import { Account } from "../Mongo_Connections/mongoCollections.js";
import { Order } from "../Mongo_Connections/mongoCollections.js";
import { Room } from "../Mongo_Connections/mongoCollections.js";
import { hotelReg } from "../Mongo_Connections/mongoCollections.js";
import { RoomType } from "../Mongo_Connections/mongoCollections.js";
import { mgrReq } from "../Mongo_Connections/mongoCollections.js";
import { ObjectId } from "mongodb";
import * as helper from "../helper.js";
import { CustomException } from "../helper.js";
import { Review } from "../Mongo_Connections/mongoCollections.js";
import * as userFuncs from "./User_Account.js";
import e from "connect-flash";
import moment from "moment";

// helper functions

export async function searchHotel( name, city, state, zip_code ) {
  const tempHotel = await hotelReg();
  if (state==='Select a State') state = undefined;
  if (city==='') city = undefined;
  else city = helper.checkString(city, "city", true).toLowerCase();
  if (name === '') name = undefined;  
  else name = helper.checkString(name, "hotel name", true).toLowerCase();
  if (zip_code === '') zip_code = undefined;
  else zip_code = helper.checkZip(zip_code, true);
  // if all parameters are undefined, return all hotels
  if (!name && !city && !state && !zip_code) {    
    var hotelList = await tempHotel.find({}).toArray();    
  } else {
    // Create a dynamic filter object based on the provided parameters
    const filter = {};
    if (name) filter.name = { $regex: new RegExp(name, "i") };
    if (city) filter.city = { $regex: new RegExp(city, "i") };
    if (state) filter.state = state;
    if (zip_code) filter.zip_code = zip_code;
    try{
    var hotelResult = await tempHotel.find(filter);
      }
    catch(e){
      throw CustomException("Hotel not found", false);
    }
    var hotelList = await hotelResult.toArray()
  }
  if (hotelList.length === 0) {
    throw CustomException("Hotel not found", false);
  }
  hotelList = hotelList.map((element) => {
    element._id = element._id.toString();
    return element;
  });
  console.log('Search results:', hotelList);
  return hotelList;
}


export async function getAllHotels() {
  const hotelCollection = await hotelReg();
  let hotelList = await hotelCollection.find({}).toArray();
  hotelList = hotelList.map((element) => {
    element._id = element._id.toString();
    return element;
  });
  return hotelList;
}

export async function getHotel(id) {
  if(id instanceof ObjectId){id = id.toString();}
  id = helper.checkId(id, true);
  const hotelCollection = await hotelReg();

  let hotel = await hotelCollection.findOne({ _id: new ObjectId(id) });

  if (!hotel) throw CustomException(`No hotel with ID ${id}`, true);
  hotel._id = hotel._id.toString();
  return hotel;
}

//get manager hotel
// export async function getMgrHotel(username) {
//   username = helper.checkString(username, "username", true);
//   const tempAccount = await Account();
//   const hotel = await tempAccount.findOne({ username: username }, { _id: 0, hotel: 1 });
//   if (!hotel) throw CustomException(`No hotel with username ${username}`, true);

//   //get hotel info
//   const hotelCollection = await hotelReg();
//   const hotelInfo = await hotelCollection.findOne({ _id: hotel.hotel});

//   if (!hotelInfo) throw CustomException(`No hotel with ID ${hotel.hotel}`, true);
//   hotelInfo._id = hotelInfo._id.toString();
//   return hotelInfo;
// }

//get hotel manager
export async function getHotelMgr(hotelId) {
  hotelId = helper.checkId(hotelId, true);
  const tempHotel = await hotelReg();
  const hotel = await tempHotel.findOne({ _id: new ObjectId(hotelId) });
  if (!hotel) throw CustomException(`No hotel with hotel ID ${hotelId}`, true);

  let mgrInfoList = []
  const tempAccount = await Account();
  hotel.managers.forEach(async mgrId => {
    const mgrInfo = await tempAccount.findOne({ _id: mgrId });
    if (!mgrInfo) throw "No manager with ID " + mgrId;
    mgrInfoList.push({
      _id: mgrId.toString(),
      avatar: mgrInfo.avatar,
      username: mgrInfo.username,
      firstName: mgrInfo.firstName,
      lastName: mgrInfo.lastName,
      email: mgrInfo.email,
      phone: mgrInfo.phone,
      hotel_id: mgrInfo.hotel_id.toString()
    });
  });

  // if (!hotelInfo) throw CustomException(`No hotel with ID ${hotel.hotel}`, true);
  // hotelInfo._id = hotelInfo._id.toString();
  return mgrInfoList;
}

//need fix order for input
export async function addHotel(...args) {
  const newHotel = {};
  newHotel.name = helper.checkString(args[0], "hotel name", true);
  newHotel.street = helper.checkString(args[1], "street", true);
  newHotel.city = helper.checkString(args[2], "city", true);
  newHotel.state = helper.checkString(args[3], "state", true);
  newHotel.zip_code = helper.checkZip(args[4], true);
  newHotel.phone = helper.checkPhone(args[5], true);
  newHotel.email = helper.checkEmail(args[6], true);
  newHotel.pictures = args[7]
    ? args[7].map((web) => helper.checkImageURL(web, true))
    : [];
  newHotel.rooms = [];
  newHotel.room_types = [];
  newHotel.overall_rating = 0;
  newHotel.facilities = helper.checkString(args[8], "facilities", true);
  newHotel.managers = args[9]
    ? args[9].map((manager) => new ObjectId(helper.checkId(manager, true)))
    : undefined;
  newHotel.reviews = [];

  const tempHotel = await hotelReg();
  const insertInfo = await tempHotel.insertOne(newHotel);
  if (insertInfo.insertedCount === 0)
    throw CustomException("Insert hotel failed.", true);
  const newHotelId = insertInfo.insertedId.toString();
  return newHotelId;
}

export async function updateHotel(...args) {
  const hotel_id = new ObjectId(helper.checkId(args[0], true));
  const updateHotel = {};
  updateHotel.name = helper.checkString(args[1], "hotel name", false);
  updateHotel.street = helper.checkString(args[2], "street", false);
  updateHotel.city = helper.checkString(args[3], "city", false);
  updateHotel.state = helper.checkString(args[4], "state", false);
  updateHotel.zip_code = helper.checkZip(args[5], false);
  updateHotel.phone = helper.checkPhone(args[6], false);
  updateHotel.email = helper.checkEmail(args[7], false);
  updateHotel.picture = args[8]
    ? args[8].map((url) => helper.checkImageURL(url, false))
    : undefined;
  // if (args[9] && Array.isArray(args[9])) {
  //   updateHotel.facilities = args[9] ? args[9].map((facility) =>
  //     helper.checkString(facility, "facility", false)) : [];
  // } else if (!args[9]) {
  //   updateHotel.facilities = [];
  // } else {
  //   throw CustomException("Invalid facilities.", true);
  // }
  updateHotel.facilities = helper.checkString(args[9], "facilities", true);

  const tempHotel = await hotelReg();
  const updateInfo = await tempHotel.findOneAndUpdate(
    { _id: hotel_id },
    { $set: updateHotel },
    { returnDocument: "after" }
  );
  if (!updateInfo)
    throw CustomException(`Update hotel with id ${hotel_id} failed.`, true);

  return { message: `Hotel with id ${hotel_id} updated successfully.` };
}
//delete hotel
export async function deleteHotel(id) {
  id = helper.checkId(id, true);
  const tempHotel = await hotelReg();

  const temp = await tempHotel.findOne({ _id: new ObjectId(id) }, { reviews: 1, room_types: 1, rooms: 1 });

  if (temp.deletedCount === 0) throw CustomException(`Delete hotel with id ${id} failed.`, true);

  //delete reviews
  let delete_review_info = undefined;
  for (let i = 0; i < temp.reviews.length; i++) {
    delete_review_info = await userFuncs.deleteReview(temp.reviews[i]);
    if (delete_review_info.deletedCount === 0) throw CustomException(`Delete review with id ${temp.reviews[i]} failed.`, true);
  }

  //delete rooms
  const roomCollection = await Room();
  const result_room = await roomCollection.deleteMany({ _id: { $in: temp.rooms } });

  //delete room types
  const roomType = await RoomType();
  const result_roomType = await roomType.deleteMany({ _id: { $in: temp.room_types } });

  //delete orders
  const orderCollection = await Order();
  //get order id
  const order_ids = await orderCollection.find({ hotel_id: id }, { _id: 1, user_id: 1 }).toArray();
  const result_order = await orderCollection.deleteMany({ hotel_id: id }, { Document: "before" });

  //delete user order
  const userCollection = await User();
  for (let i of order_ids) {
    const delete_result = await userCollection.findOneAndUpdate({ _id: i.user_id }, { $pull: { orders: i._id } }, { returnDocument: "after" });
    if (!delete_result) throw CustomException(`Delete order with id ${i._id} failed.`, true);
  }

  //delete Hotel
  const deleteInfo = await tempHotel.deleteOne({ _id: new ObjectId(id) });
  if (deleteInfo.deletedCount === 0)
    throw CustomException(`Delete hotel with id ${id} failed.`, true);


  return { message: `Hotel with id ${id} deleted successfully.` };
}

// export async function hotelSearch(...args) {
//   const hotelCollection = await hotelReg();
  
//   let query = {};
//   const name = helper.checkString(args[0], "hotel name", true);
//   query.name = { $regex: new RegExp(name, "i") };

//   const city = helper.checkString(args[1], "city", true);
//   query.city = { $regex: new RegExp(city, "i") };

//   const state = helper.checkString(args[2], "state", true);
//   query.state = { $regex: new RegExp(state, "i") };

//   const zipCode = helper.checkZip(args[3], true);
//   query.zip_code = { $regex: new RegExp(zipCode, "i") };

//   let hotelList = await hotelCollection.find(query).toArray();
//   if (hotelList.length===0) throw CustomException("Hotel not found", false);
//   hotelList = hotelList.map((element) => {
//     element._id = element._id.toString();
//     return element;
//   });
//   return hotelList;
// }

//get hotel review
export async function getHotelReview(id) {
  id = new ObjectId(helper.checkId(id, true));
  const tempHotel = await hotelReg();

  //get hotel review
  const reviewInfo = await tempHotel.findOne({ _id: id }, { reviews: 1 });
  const reviewId = reviewInfo.reviews;

  //get review
  const tempReview = await Review();
  const reviewList = await tempReview.find({ _id: { $in: reviewId } }).toArray();
  if (reviewList && !Array.isArray(reviewList)) reviewList = [reviewList];
  if (reviewList.length === 0) throw CustomException("Review not found", false);

  //get user 
  console.log(reviewList)
  const tempAccount = await Account();
  for (let i of reviewList) {
    const userInfo = await tempAccount.findOne({ _id: i.user_id }, { username: 1, avatar: 1 });
    i.upVote = i.upvote
    i.downVote = i.downvote
    i.upvote = null
    i.downvote = null
    i.userName = userInfo.username
    i.userAvatar = userInfo.avatar
    i.reviewRating = i.rating
  }
  console.log(reviewList)
  if (!reviewInfo) throw CustomException("Hotel not found", false);
  return reviewList;
}





//room type
export async function addRoomType(...args) {
  if (args.length !== 5) throw CustomException("Missing inputs.", true);
  const hotel_id = new ObjectId(helper.checkId(args[0], true));
  const name = helper.checkString(args[1], "room type name", true);
  const pictures = args[2]
    ? args[2].map((url) => helper.checkImageURL(url, true))
    : [];
  const price = helper.checkPrice(args[3], true);
  const rooms = args[4].length > 0 ? helper.checkArray(args[4], "rooms", true) : [];
  const type = {
    hotel_id: hotel_id,
    name: name,
    pictures: pictures,
    price: price,
    rooms: rooms,
  };

  //avoid duplicate room type
  const tempHotel = await hotelReg();
  const tempRoomType = await RoomType();
  const rv = await tempRoomType.findOne({ hotel_id: hotel_id, name: name });
  if (rv) throw CustomException(`Room type ${name} already exists.`, true);

  //check if hotel exists
  const target = await tempHotel.findOne({ _id: hotel_id });
  if (!target)
    throw CustomException(`Hotel with id ${hotel_id} does not exist.`, true);

  //add room type
  const insertInfo = await tempRoomType.insertOne(type);
  if (insertInfo.insertedCount === 0)
    throw CustomException(`Could not add the room type.`, true);

  //add room type to hotel
  const updateInfo = await tempHotel.findOneAndUpdate(
    { _id: hotel_id },
    { $addToSet: { room_types: name } },
    { returnDocument: "after" }
  );
  if (!updateInfo)
    throw CustomException(
      `Could not update the hotel with id ${hotel_id}`,
      true
    );

  return { message: `Room type ${name} added successfully.` };
}


//delete room type
export async function deleteRoomType(id, hotel_id) {
  id = new ObjectId(helper.checkId(id, true));
  hotel_id = new ObjectId(helper.checkId(hotel_id, true));

  //get room type details
  const tempRoomType = await RoomType();
  const roomType = await tempRoomType.findOne({ _id: id });
  if (!roomType) throw CustomException(`Room type with id ${id} does not exist.`, true);

  //delete room 
  const room_ids = roomType.rooms.map(obj => obj.toString());
  for (let i of room_ids) {
    const rv = await deleteRoom(hotel_id, i);
  }

  //update hotel
  const tempHotel = await hotelReg();
  const updateInfo = await tempHotel.findOneAndUpdate({ _id: hotel_id }, { $pull: { room_types: roomType.name } }, { returnDocument: "after" });
  if (!updateInfo) throw CustomException(`Could not update the hotel with id ${hotel_id.toString()}`, true);

  //delete room type
  const deleteInfo = await tempRoomType.deleteOne({ _id: id });
  if (deleteInfo.deletedCount === 0) throw CustomException(`Delete room type with id ${id} failed.`, true);

  return { message: `Room type with id ${id} deleted successfully.` };
}

//update room type
export async function updateRoomType(id, hotel_id, roomType, price, picture) {
  id = new ObjectId(helper.checkId(id, true));
  hotel_id = new ObjectId(helper.checkId(hotel_id, true));
  roomType = helper.checkString(roomType, "room type", true);
  price = helper.checkPrice(price, true);
  picture = helper.checkImageURL(picture, true);
  picture = picture
    ? picture.map((url) => helper.checkImageURL(url, true))
    : [];
  const updateInfo = {
    name: roomType,
    price: price,
    picture: picture
  }

  //get room type details
  const tempRoomType = await RoomType();
  const rv = await tempRoomType.findOne({ _id: id }, { rooms: 1, name: 1 });


  if (rv.name !== roomType) {
    //update room
    const tempRoom = await Room();
    for (let i of rv.rooms) {
      const rv = await tempRoom.findOneAndUpdate({ _id: i }, { $set: { room_type: roomType } }, { returnDocument: "after" });
      if (!rv) throw CustomException(`Could not update the room with id ${i}`, true);
    }
  }


  //update room type
  const rv2 = await tempRoomType.findOneAndUpdate({ _id: id }, { $set: updateInfo }, { returnDocument: "after" });
  if (!rv2) throw CustomException(`Could not update the room type with id ${id}`, true);

  return { message: `Room type with id ${id} updated successfully.` };
}



//get hotel room
export async function getHotelRoom(id) {
  id = new ObjectId(helper.checkId(id, true));
  const tempHotel = await hotelReg();
  const tempRoom = await Room();

  const room_ids = await tempHotel.findOne({ _id: id }, { rooms: 1 });
  const roomInfo = await tempRoom.find({ _id: { $in: room_ids.rooms } }).toArray();
  if (!roomInfo) throw CustomException("Hotel not found", false);
  return roomInfo;
}

//get single room
export async function getRoom(id) {
  id = id.toString();
  id = new ObjectId(helper.checkId(id, true));
  const tempRoom = await Room();

  const roomInfo = await tempRoom.findOne({ _id: new ObjectId(id) });
  if (!roomInfo) throw CustomException("Room not found", false);
  return roomInfo;
}

//get hotel room type
export async function getHotelRoomType(id) {
  id = new ObjectId(helper.checkId(id, true));
  const tempRoomType = await RoomType();

  const roomTypeInfo = await tempRoomType.find({ hotel_id: new ObjectId(id) }).toArray();
  if (!roomTypeInfo) throw CustomException("Hotel not found", false);
  if (!Array.isArray(roomTypeInfo)) return [roomTypeInfo];
  return roomTypeInfo;
}

export async function getRoomType(id) {
  id = new ObjectId(helper.checkId(id, true));
  const tempRoomType = await RoomType();

  const roomTypeInfo = await tempRoomType.findOne({ _id: id });
  if (!roomTypeInfo) throw CustomException("Room type not found", false);
  return roomTypeInfo;
}


//check room availability
export async function checkRoomAvailability(...args) {
  const room_id = new ObjectId(helper.checkId(args[0], "room type", true));
  const checkin_date = moment(helper.checkDate(args[1], true), "YYYY-MM-DD");
  const checkout_date = moment(helper.checkDate(args[2], true), "YYYY-MM-DD");
  const order_id = new ObjectId(helper.checkId(args[3], true));

  //check if room is avaliable
  const tempRoom = await Room();
  const room_orders = tempRoom.findOne({ _id: new ObjectId(room_id) }, { orders: 1 });

  if (!room_orders) throw CustomException(`Room does not exist.`, true);
  //if the target room has no orders return the true.
  if (!room_orders.orders) return true;
  room_order.orders = room_orders.orders.filter((order) => order !== order_id);
  room_orders.orders = room_orders.orders.map((order) => new ObjectId(order));

  //get all orders' checkin findOneAndUpdate checkout date
  let temp = [];
  temp.push(
    await tempOrder.find(
      { _id: { $in: room_orders.orders } },
      { _id: 0, checkin_date: 1, checkout_date: 1, status: 1 }
    )
  );
  if (
    temp.every(
      (order) =>
        order.status === "canceled" ||
        checkin_date.isAfter(moment(order.checkout_date, "YYYY/MM/DD")) ||
        checkout_date.isBefore(moment(order.checkin_date, "YYYY/MM/DD"))
    )
  ) {
    return true;
  }

  return false;
}


//add room
export async function addRoom(...args) {
  const hotel_id = new ObjectId(helper.checkId(args[0], true));
  const room_number = helper.checkString(args[1], "room number", true);
  if (!/^\d{1,5}$/.test(room_number)) throw CustomException(`Invalid room number.`, true);
  const room_type = helper.checkString(args[2], "room type", true);
  const order = [];

  //check if hotel exists
  const tempHotel = await hotelReg();
  const hotelInfo = await tempHotel.findOne({ _id: hotel_id });
  if (!hotelInfo) throw CustomException(`Hotel with id ${hotel_id} does not exist.`, true);

  //check if room type exists
  const tempRoomType = await RoomType();
  const roomTypeInfo = await tempRoomType.findOne({ hotel_id: hotel_id, name: room_type });
  if (!roomTypeInfo) throw CustomException(`Room type ${room_type} does not exist.`, true);

  const newRoom = {
    hotel_id: hotel_id,
    room_number: room_number,
    room_type: room_type,
    order: order
  };

  //check if room exists
  const tempRoom = await Room();
  const rv = await tempRoom.findOne({ hotel_id: hotel_id, room_number: room_number });
  if (rv) throw CustomException(`Room ${room_number} already exists.`, true);

  //add room
  const insertInfo = await tempRoom.insertOne(newRoom);
  if (insertInfo.insertedCount === 0) throw CustomException(`Could not add the room.`, true);

  const room_id = insertInfo.insertedId;
  //add room to room type
  const updateInfo = await tempRoomType.findOneAndUpdate(
    { hotel_id: hotel_id, name: room_type },
    { $addToSet: { rooms: room_id } },
    { returnDocument: "after" }
  );
  if (!updateInfo) throw CustomException(`Could not update the room type ${room_type}.`, true);

  //add room to hotel
  const updateInfo2 = await tempHotel.findOneAndUpdate(
    { _id: hotel_id },
    { $addToSet: { rooms: room_id } },
    { returnDocument: "after" }
  );

  if (!updateInfo2) throw CustomException(`Could not update the hotel with id ${hotel_id}`, true);

  return { message: `Room ${room_number} added successfully.` };
}

//TODO: delete room
export async function deleteRoom(hotel_id, room_id) {
  //checkinput
  hotel_id = new ObjectId(helper.checkId(hotel_id, true));
  room_id = new ObjectId(helper.checkId(room_id, true));

  //check if room exists
  const tempRoom = await Room();
  const roomInfo = await tempRoom.findOne({ _id: room_id });
  if (!roomInfo) throw CustomException(`The room does not exist.`, true);
  const typeNme = roomInfo.room_type
  //check if hotel exists
  const tempHotel = await hotelReg();
  const hotelInfo = await tempHotel.findOne({ _id: hotel_id });
  if (!hotelInfo) throw CustomException(`Hotel with id ${hotel_id} does not exist.`, true);

  //check if room type exists
  const tempRoomType = await RoomType();
  const roomTypeInfo = await tempRoomType.findOne({ hotel_id: hotel_id, name: typeNme });
  if (!roomTypeInfo) throw CustomException(`Room type ${typeNme} does not exist.`, true);

  //delete room
  const rv = await tempRoom.deleteOne({ _id: room_id });
  if (rv.deletedCount === 0) throw CustomException(`Could not delete the room.`, true);

  //delete room from room type
  const updateInfo = await tempRoomType.findOneAndUpdate({ hotel_id: hotel_id, name: typeNme }, { $pull: { rooms: room_id } }, { returnDocument: "after" });
  if (!updateInfo) throw CustomException(`Could not update the room type ${typeNme}.`, true);

  //delete room from hotel
  const updateInfo2 = await tempHotel.findOneAndUpdate({ _id: hotel_id }, { $pull: { rooms: room_id } }, { returnDocument: "after" });
  if (!updateInfo2) throw CustomException(`Could not update the hotel with id ${hotel_id}`, true);

  //delete order with room_id
  const tempOrder = await Order();
  const temp = await tempOrder.find({ room_id: room_id }, { _id: 1, review: 1 }).toArray();
  const orderList = temp.map((order) => order._id);
  const reviewList = temp.map((order) => order.review);
  const deleteInfo = await tempOrder.deleteMany({ room_id: room_id });
  if (deleteInfo.deletedCount !== orderList.length) throw Error(`Could not delete the order.`);

  //delete order from user
  const tempUser = await Account();
  const updateInfo3 = await tempUser.updateMany({ orders: { $in: orderList } }, { $pull: { orders: { $in: orderList } } }, { returnDocument: "after" });
  if (!updateInfo3) throw Error(`Could not update the user with id ${hotel_id}`);

  //delete review
  const tempReview = await Review();
  const deleteInfo2 = await tempReview.deleteMany({ _id: { $in: reviewList } });
  if (deleteInfo2.deletedCount !== reviewList.length) throw Error(`Could not delete the review.`);

  return { message: `The Room deleted successfully.` };
}


//TODO: update room
export async function updateRoom(hotel_id, room_id, typeNme, roomNum) {
  //checkinput
  hotel_id = new ObjectId(helper.checkId(hotel_id, true));
  room_id = new ObjectId(helper.checkId(room_id, true));
  typeNme = helper.checkString(typeNme, "room type", true);
  if (!/[0-9]{0,5}$/.test(roomNum)) throw CustomException(`Invalid room number.`, true);

  //check if room exists
  const tempRoom = await Room();
  const roomInfo = await tempRoom.findOne({ _id: room_id });
  if (!roomInfo) throw CustomException(`Room ${roomNum} does not exist.`, true);

  //check if hotel exists
  const tempHotel = await hotelReg();
  const hotelInfo = await tempHotel.findOne({ _id: hotel_id });
  if (!hotelInfo) throw CustomException(`Hotel with id ${hotel_id} does not exist.`, true);

  //check if room type exists
  const tempRoomType = await RoomType();
  const roomTypeInfo = await tempRoomType.findOne({ hotel_id: hotel_id, name: typeNme });
  if (!roomTypeInfo) throw CustomException(`Room type ${typeNme} does not exist.`, true);

  //update room type
  const updateInfo = await tempRoomType.findOneAndUpdate({ hotel_id: hotel_id, name: typeNme }, { $addToSet: { rooms: room_id } }, { returnDocument: "after" });
  if (!updateInfo) throw CustomException(`Could not update the room type ${typeNme}.`, true);

  //remove room from old room type
  const oldType = roomInfo.room_type;
  const updateInfo2 = await tempRoomType.findOneAndUpdate({ hotel_id: hotel_id, name: oldType }, { $pull: { rooms: room_id } }, { returnDocument: "after" });
  if (!updateInfo2) throw CustomException(`Could not update the room type ${oldType}.`, true);

  //update room
  const rv = await tempRoom.updateOne({ _id: room_id }, { $set: { room_number: roomNum, room_type: typeNme } });

  if (rv.modifiedCount === 0) throw CustomException(`Could not update the room.`, true);

  return `Room ${roomNum} updated successfully.`;
}


//TODO: get room
export async function checkRoomAvailabilityOrder(...args) {
  const hotel_id = new ObjectId(helper.checkId(args[0], "hotel id", true));
  const checkin_date = moment(helper.checkDate(args[1], true), "YYYY/MM/DD");
  const checkout_date = moment(helper.checkDate(args[2], true), "YYYY/MM/DD");
  const returnInfo = [];
  //get all room
  const tempHotel = await hotelReg();
  const roomInfo = await tempHotel.findOne({ _id: hotel_id }, { _id: 0, rooms: 1 });
  const roomsId = roomInfo.rooms;
  
  //find orders of rooms
  console.log(roomsId)
  const tempRoom = await Room();
  let roomsOrders = await tempRoom.find({ _id: { $in: roomsId } }, { orders: 1 }).toArray();
  console.log(roomsOrders)
  if (!roomsOrders) throw CustomException(`No available rooms.`, true);
  if (!Array.isArray(roomsOrders)) roomsOrders = [roomsOrders];

  //if the target room has no orders return the true.
  //[{[]}, {[]}, {[]}]
  let ordersPerRoom = []; // [[], [], []]
  let roomAvailable = new Set();
  for (let i of roomsOrders) {
    console.log(i)
    if (i.order.length === 0) roomAvailable.add(i._id);
    else ordersPerRoom.push({orders: i.order, room_id: i._id});
  }

  //get all orders' checkin findOneAndUpdate checkout date
  const tempOrder = await Order();
  console.log(ordersPerRoom)
  let temp = [];
  for (let i of ordersPerRoom) {
    temp = await tempOrder.find(
        { _id: { $in: i.orders } },
        { _id: 0, checkin_date: 1, checkout_date: 1, status: 1}
      ).toArray()
    console.log(temp)
    if(!Array.isArray(temp)) temp = [temp];
    if (
      temp.every(
        (order =>
          order.status === "canceled" ||
          checkin_date.isAfter(moment(order.checkout_date, "YYYY/MM/DD")) ||
          checkout_date.isBefore(moment(order.checkin_date, "YYYY/MM/DD"))
        ))
    ) {
      roomAvailable.add(i.room_id);
    }

    //get room type
    const tempRoomType = await RoomType();
    let roomTypeInfo = {};
    console.log(roomAvailable)
    let visitedName = new Set();
    for (let i of roomAvailable.values()) {
      console.log(i)
      roomTypeInfo = await tempRoomType.findOne({ hotel_id: hotel_id, rooms: { $in: [i] } });
      if(visitedName.has(roomTypeInfo.name)) continue;
      visitedName.add(roomTypeInfo.name);
      returnInfo.push(roomTypeInfo);
      console.log(roomTypeInfo)
    }
    if (!returnInfo) throw CustomException(`No room available.`, true);
    let roomType = [];
    for (let i of returnInfo.values()) {
      i.roomTypeName = i.name;
      i.roomPhoto = i.pictures;
      i.roomPrice = i.price;
      i.name = null;
      i.pictures = null;
      i.price = null;
      roomType.push(i);
    }
    let rv = {}
    console.log(returnInfo)
    rv.roomType = roomType;
    rv.remainingHotelRooms = roomAvailable.size;
    console.log(rv)
    return rv;
  }

  //get all orders' checkin findOneAndUpdate checkout date

}

export async function addOrderByRoomType(...args) {
  console.log(args)
  const roomTypeId = new ObjectId(helper.checkId(args[0], "hotel id", true));
  const checkin_date = moment(helper.checkDate(args[1], true), "YYYY/MM/DD");
  const checkout_date = moment(helper.checkDate(args[2], true), "YYYY/MM/DD");

  console.log(checkin_date)
  //get all room
  const tempRoomType = await RoomType();
  const roomTypeInfo = await tempRoomType.findOne({ _id: roomTypeId }, { _id: 0, rooms: 1 });
  if (!roomTypeInfo) throw CustomException(`Room type does not exist.`, true);
  console.log(roomTypeInfo)
  //find orders of rooms
  const tempRoom = await Room();
  let roomsOrders = [];
  for (let i of roomTypeInfo.rooms) {
    roomsOrders.push(await tempRoom.findOne({ _id: i }, { order: 1 }));
  }

  console.log(roomsOrders)
  const tempOrder = await Order();

  let temp = [];
  for (let i of roomsOrders) {
    if (i.order.length === 0) {
      return i._id;
    }
    else {
     temp = await tempOrder.find(
        { _id: { $in: i.order } },
        { _id: 0, checkin_date: 1, checkout_date: 1, status: 1 }
      ).toArray();
      console.log(temp)
      if (
        temp.every(
          (order) =>
            order.status === "canceled" ||
            checkin_date.isAfter(moment(order.checkout_date, "YYYY/MM/DD")) ||
            checkout_date.isBefore(moment(order.checkin_date, "YYYY/MM/DD"))
        )
      ) {
        console.log(temp)
        return i._id.toString();
      }
    }
  }
  throw CustomException(`No room available.`, true);
}