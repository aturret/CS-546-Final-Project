//crud for hotel
import { Account } from "../Mongo_Connections/mongoCollections.js";
import { Order } from "../Mongo_Connections/mongoCollections.js";
import { Room } from "../Mongo_Connections/mongoCollections.js";
import { hotelReg } from "../Mongo_Connections/mongoCollections.js";
import { roomType } from "../Mongo_Connections/mongoCollections.js";
import { mgrReq } from "../Mongo_Connections/mongoCollections.js";
import { ObjectId } from "mongodb";
import * as helper from "../helper.js";
import { CustomException } from "../helper.js";
import { Review } from "../Mongo_Connections/mongoCollections.js";
import * as userFuncs from "./User_Account.js";

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
  id = helper.checkId(id, true);
  const hotelCollection = await hotelReg();

  let hotel = await hotelCollection.find({ _id: new ObjectId(id) });

  if (!hotel) throw CustomException(`No hotel with ID ${id}`, true);
  hotel._id = hotel._id.toString();
  return hotel;
}

//get manager hotel
export async function getMgrHotel(username) {
  username = helper.checkString(username, "username", true);
  const tempAccount = await Account();
  const hotel = await tempAccount.findOne({ username: username }, { _id: 0, hotel: 1 });
  if (!hotel) throw CustomException(`No hotel with username ${username}`, true);

  //get hotel info
  const hotelCollection = await hotelReg();
  const hotelInfo = await hotelCollection.findOne({ _id: hotel.hotel});

  if (!hotelInfo) throw CustomException(`No hotel with ID ${hotel.hotel}`, true);
  hotelInfo._id = hotelInfo._id.toString();
  return hotelInfo;
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
    ? args[7].map((web) => helper.checkWebsite(web, true))
    : [];
  newHotel.rooms = [];
  newHotel.room_types = [];
  newHotel.overall_rating = 0;
  if (args[8] && Array.isArray(args[8])) {
    newHotel.facilities = args[7].map((facility) =>
      helper.checkString(facility, "facility", true)
    );
  } else if (!args[8]) {
    newHotel.facilities = [];
  } else {
    throw CustomException("Invalid facilities.", true);
  }
  newHotel.managers = args[9]
    ? args[9].map((manager) => helper.checkId(manager, true))
    : undefined;
  newHotel.reviews = [];

  const tempHotel = await hotelReg();
  const insertInfo = await tempHotel.insertOne(newHotel);
  if (insertInfo.insertedCount === 0)
    throw CustomException("Insert hotel failed.", true);

  return { message: `${newHotel.name} Hotel added successfully.` };
}

export async function updateHotel(...args) {
  const hotel_id = ObjectId(helper.checkId(args[0], true));
  const updateHotel = {};
  updateHotel.name = helper.checkString(args[1], "hotel name", false);
  updateHotel.street = helper.checkString(args[2], "street", false);
  updateHotel.city = helper.checkString(args[3], "city", false);
  updateHotel.state = helper.checkString(args[4], "state", false);
  updateHotel.zip_code = helper.checkZip(args[5], false);
  updateHotel.phone = helper.checkPhone(args[6], false);
  updateHotel.email = helper.checkEmail(args[7], false);
  updateHotel.picture = args[8]
    ? args[8].map((web) => helper.checkWebsite(web, false))
    : undefined;
  updateHotel.rooms = args[9] ? args[9].map((room) => helper.checkId(room, false)) : [];
  if (args[8] && Array.isArray(args[8])) {
    updateHotel.facilities = args[8] ? args[8].map((facility) =>
      helper.checkString(facility, "facility", false)) : [];
  } else if (!args[8]) {
    updateHotel.facilities = [];
  } else {
    throw CustomException("Invalid facilities.", true);
  }
  updateHotel.managers = args[10]
    ? args[10].map((manager) => helper.checkId(manager, false))
    : [];
  updateHotel.roomTypes = args[11]
    ? args[11].map((roomType) => helper.checkString(roomType, false))
    : [];
  updateHotel.reviews = args[12]
    ? args[12].map((reviews) => helper.checkString(reviews, false))
    : [];

  const tempHotel = await hotelReg();
  const updateInfo = await tempHotel.findOneUpdate(
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

    const temp = await tempHotel.findOne({ _id: new ObjectId(id) }, {reviews: 1, room_types: 1, rooms: 1});

    if (temp.deletedCount === 0)  throw CustomException(`Delete hotel with id ${id} failed.`, true);

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
    const result_order = await orderCollection.deleteMany({ hotel_id: id }, {Document: "before"});

    //delete user order
    const userCollection = await User();
    for (let i of order_ids) {
      const delete_result = await userCollection.findOneAndUpdate({_id: i.user_id}, {$pull: {orders: i._id}}, {returnDocument: "after"});
      if (!delete_result) throw CustomException(`Delete order with id ${i._id} failed.`, true);
    }

    //delete Hotel
    const deleteInfo = await tempHotel.deleteOne({ _id: new ObjectId(id) });
    if (deleteInfo.deletedCount === 0)
        throw CustomException(`Delete hotel with id ${id} failed.`, true);


    return { message: `Hotel with id ${id} deleted successfully.` };
}

export async function hotelSearch(...args) {
  const hotelCollection = await hotelReg();

  let query = {};
  const name = helper.checkString(args[0], "hotel name", true);
  query.name = { $regex: new RegExp(name, "i") };

  const city = helper.checkString(args[1], "city", true);
  query.city = { $regex: new RegExp(city, "i") };

  const state = helper.checkString(args[2], "state", true);
  query.state = { $regex: new RegExp(state, "i") };

  const zipCode = helper.checkZip(args[3], true);
  query.zipCode = { $regex: new RegExp(zipCode, "i") };

  let hotelList = await hotelCollection.find(query).toArray();
  if (!hotelList) throw CustomException("Hotel not found", false);

  hotelList = hotelList.map((element) => {
    element._id = element._id.toString();
    return element;
  });
  return hotelList;
}

//get hotel review
export async function getHotelReview(id) {
  id = ObjectId(helper.checkId(id, true));
  const tempHotel = await hotelReg();

  const reviewInfo = tempHotel.aggregate([
    {$match: {_id: ObjectId(id)}},
    {$lookup: {
      from: "reviews",
      localField: "reviews",
      foreignField: "_id",
      as: "reviews"
    }},
    {$unwind: "$reviews"},
    {
      $lookup: {
        from: "users",
        localField: "reviews.user_id",
        foreignField: "_id",
        as: "reviews.user"
      }
    },
    {
        $project: {
          _id: "$reviews._id",
          rating: "$reviews.rating",
          comment: "$reviews.comment",
          upVote: "$reviews.upvote",
          downVote: "$reviews.downvote",
          userAvatar: "$reviews.user.avatar"
        }
    }
  ])
  if (!reviewInfo) throw CustomException("Hotel not found", false);
  return reviewInfo;
}

//room type
export async function addRoomType(...args) {
  const hotel_id = helper.checkId(args[0], true);
  const name = helper.checkString(args[1], "room type", true);
  const picture = helper.checkWebsite(args[2], true);
  const price = helper.checkPrice(args[3], true);
  const rooms = args[4] ? helper.checkArray(args[4], true) : [];
  const type = {
    hotel_id: hotel_id,
    name: name,
    picture: picture,
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
  const updateInfo = await tempHotel.findOneUpdate(
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

//get hotel room
export async function getHotelRoom(id) {
  id = ObjectId(helper.checkId(id, true));
  const tempHotel = await hotelReg();
  const tempRoom = await Room();

  const room_ids = await hotelReg.findOne({_id: id}, {rooms: 1});
  const roomInfo = await tempRoom.find({_id: {$in: room_ids}}).toArray();
  if (!roomInfo) throw CustomException("Hotel not found", false);
  return roomInfo;
}

//get hotel room type
export async function getHotelRoomType(id) {
  id = ObjectId(helper.checkId(id, true));
  const tempRoomType = await RoomType();

  const roomTypeInfo = await tempRoomType.find({hotel_id: id}).toArray();
  if (!roomTypeInfo) throw CustomException("Hotel not found", false);
  return roomTypeInfo;
}


//check room availability
export async function checkRoomAvailability(...args) {
  const hotel_id = ObjectId(helper.checkId(args[0], true));
  const room_id = helper.checkId(args[1], "room type", true);
  const checkin_date = moment(helper.checkDate(args[2], true), "YYYY-MM-DD");
  const checkout_date = moment(helper.checkDate(args[3], true), "YYYY-MM-DD");
  const order_id = helper.checkId(args[4], true);

  //check if hotel exists
  const tempHotel = await hotelReg();
  const hotelInfo = await tempHotel.findOne({ _id: hotel_id });
  if (!hotelInfo)
    throw CustomException(`Hotel with id ${hotel_id} does not exist.`, true);

  //check if room is avaliable
  const tempRoom = await Room();
  const room_orders = Room.findOne({ _id: room_id }, { orders: 1 });

  if (!room_orders) throw CustomException(`Room does not exist.`, true);
  //if the target room has no orders return the true.
  if (!room_orders.orders) return true;
  room_order.orders = room_orders.orders.filter((order) => order !== order_id);
  room_orders.orders = room_orders.orders.map((order) => ObjectId(order));

  //get all orders' checkin and checkout date
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
    const hotel_id = ObjectId(helper.checkId(args[0], true));
    const room_number = helper.checkString(args[1], "room number", true);
    if(!/^\[0-9]{0,5}$/.test(room_number)) throw CustomException(`Invalid room number.`, true);
    const room_type = helper.checkString(args[2], "room type", true);
    const order = {};

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
    const rv = tempRoom.findOne({ hotel_id: hotel_id, room_number: room_number });
    if (rv) throw CustomException(`Room ${room_number} already exists.`, true);

    //add room
    const insertInfo = await tempRoom.insertOne(newRoom);
    if (insertInfo.insertedCount === 0) throw CustomException(`Could not add the room.`, true);

    const room_id = insertInfo.insertedId;
    //add room to room type
    const updateInfo = await tempRoomType.findOneUpdate(
        { hotel_id: hotel_id, name: room_type },
        { $addToSet: { rooms: room_id } },
        { returnDocument: "after" }
    );
    if (!updateInfo) throw CustomException(`Could not update the room type ${room_type}.`, true);

    //add room to hotel
    const updateInfo2 = await tempHotel.findOneUpdate(
        { _id: hotel_id },
        { $addToSet: { rooms: room_id } },
        { returnDocument: "after" }
    );

    if (!updateInfo2) throw CustomException(`Could not update the hotel with id ${hotel_id}`, true);

    return { message: `Room ${room_number} added successfully.` };
}