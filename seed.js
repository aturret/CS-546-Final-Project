import {
  Account,
  Room,
  mgrReq,
  Review,
  hotelReg,
  Order,
  RoomType,
} from "./Mongo_Connections/mongoCollections.js";
import {
  dbConnection,
  closeConnection,
} from "./Mongo_Connections/mongoConnection.js";
import * as helper from "./helper.js";
import { CustomException } from "./helper.js";
import * as userFuncs from "./data_model/User_Account.js";
import faker from "faker";
import moment from "moment";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";

const saltRounds = 12;

const db = await dbConnection();
await db.dropDatabase();

const admin = {
  username: "admin",
  password: "Group47admin1!",
  firstName: "admin",
  lastName: "admin",
  email: "group47@gmail.com",
  phone: "1234567890",
  identity: "admin",
  avatar:
    "https://www.pngitem.com/pimgs/m/146-1468479_my-profile-icon-blank-profile-picture-circle-hd.png",
};

await userFuncs.create(
  admin.identity,
  admin.username,
  admin.avatar,
  admin.firstName,
  admin.lastName,
  admin.phone,
  admin.password,
  admin.email
);

//get all generators
const userGenerator = helper.randomUserGenerator();
const hotelGenerator = helper.randomHotelGenerator();
const managerGenerator = helper.randomManagerGenerator();
const roomTypeGenerator = helper.randomRoomTypeGenerator();
const roomGenerator = helper.randomRoomGenerator();
const orderGenerator = helper.randomOrderGenerator();
const reviewGenerator = helper.randomReviewGenerator();

async function create(...args) {
  console.log(args);
  let user = {};
  user.username = helper.checkString(args[1], "username", true);
  user.identity = helper.checkString(args[0], "identity", true).toLowerCase();
  if (["manager", "user", "admin"].every((obj) => obj !== user.identity))
    throw CustomException("Invalid identity.", true);
  user.avatar = args[2] ? helper.checkWebsite(args[2], true) : args[2];
  user.firstName = helper.checkString(args[3], "first name", true);
  user.lastName = helper.checkString(args[4], "last name", true);
  user.phone = args[5] ? helper.checkPhone(args[5], true) : args[5];
  args[6] = helper.checkPassword(args[6], true);
  user.email = helper.checkEmail(args[7], true);
  user.hotel_id = "";
  user.orders = [];

  user.password = await bcrypt.hash(args[6], saltRounds);

  const tempAccount = await Account();
  if (await tempAccount.findOne({ username: user.username }))
    throw Error(`Account with username ${user.username} already exist.`);

  const insertInfo = tempAccount.insertOne(user);
  if (insertInfo.insertedCount === 0) throw Error("Can not create user.");

  return insertInfo;
}

async function addHotel(...args) {
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
  newHotel.overall_rating = NaN;
  if (args[8] !== undefined && Array.isArray(args[8])) {
    newHotel.facilities = helper.checkString(facility, "facility", true)
  
  } else if (!args[8]) {
    newHotel.facilities = "";
  } else {
    throw CustomException("Invalid facilities.", true);
  }
  newHotel.managers =
    args[9] !== undefined
      ? args[9].map((manager) => new ObjectId(helper.checkId(manager, true)))
      : undefined;
  newHotel.reviews = [];

  const tempHotel = await hotelReg();
  const insertInfo = await tempHotel.insertOne(newHotel);
  if (insertInfo.insertedCount === 0)
    throw CustomException("Insert hotel failed.", true);

  return insertInfo;
}

export async function addRoomType(...args) {
  const hotel_id = new ObjectId(helper.checkId(args[0], true));
  const name = helper.checkString(args[1], "room type", true);
  const pictures = args[2]
    ? args[2].map((web) => helper.checkWebsite(web, true))
    : [];
  const price = helper.checkPrice(args[3], true);
  const rooms =
    args[4].length > 0 ? helper.checkArray(args[4], "rooms", true) : [];
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

  return insertInfo;
}

export async function addRoom(...args) {
  const hotel_id = new ObjectId(helper.checkId(args[0], true));
  const room_number = helper.checkString(args[1], "room number", true);
  if (!/^\d{1,5}$/.test(room_number))
    throw CustomException(`Invalid room number.`, true);
  const room_type = helper.checkString(args[2], "room type", true);
  const order = [];

  //check if hotel exists
  const tempHotel = await hotelReg();
  const hotelInfo = await tempHotel.findOne({ _id: hotel_id });
  if (!hotelInfo)
    throw CustomException(`Hotel with id ${hotel_id} does not exist.`, true);

  //check if room type exists
  const tempRoomType = await RoomType();
  const roomTypeInfo = await tempRoomType.findOne({
    hotel_id: hotel_id,
    name: room_type,
  });
  if (!roomTypeInfo)
    throw CustomException(`Room type ${room_type} does not exist.`, true);

  const newRoom = {
    hotel_id: hotel_id,
    room_number: room_number,
    room_type: room_type,
    order: order,
  };

  //check if room exists
  const tempRoom = await Room();
  const rv = await tempRoom.findOne({
    hotel_id: hotel_id,
    room_number: room_number,
  });
  if (rv) throw CustomException(`Room ${room_number} already exists.`, true);

  //add room
  const insertInfo = await tempRoom.insertOne(newRoom);
  if (insertInfo.insertedCount === 0)
    throw CustomException(`Could not add the room.`, true);

  const room_id = insertInfo.insertedId;
  //add room to room type
  const updateInfo = await tempRoomType.findOneAndUpdate(
    { hotel_id: hotel_id, name: room_type },
    { $addToSet: { rooms: room_id } },
    { returnDocument: "after" }
  );
  if (!updateInfo)
    throw CustomException(`Could not update the room type ${room_type}.`, true);

  //add room to hotel
  const updateInfo2 = await tempHotel.findOneAndUpdate(
    { _id: hotel_id },
    { $addToSet: { rooms: room_id } },
    { returnDocument: "after" }
  );

  if (!updateInfo2)
    throw CustomException(
      `Could not update the hotel with id ${hotel_id}`,
      true
    );

  return insertInfo;
}

export async function addOrder(...args) {
  if (args.length < 9) throw CustomException("Missing inputs.");
  let set = {};
  set.hotel_id = new ObjectId(helper.checkId(args[0]), true);
  set.user_id = new ObjectId(helper.checkId(args[1]), true);
  set.room_id = new ObjectId(helper.checkId(args[2]), true);

  set.hotel_name = helper.checkString(args[3], "hotel name", true);
  set.checkin_date = helper.checkDate(args[4], true);
  set.checkout_date = helper.checkDate(args[5], true);

  if (!args[6] || args[6] === "null") {
    set.guests = {};
  } else {
    set.guests = helper.checkGuests(args[6], true);
  }
  set.price = helper.checkPrice(args[7], true);
  set.status = helper.checkStatus(args[8], true);
  set.review = "";

  //update user account, and add order to order database
  const tempOrder = await Order();
  const tempAccount = await Account();
  const orderInfo = await tempOrder.insertOne(set);
  if (!orderInfo) throw CustomException(`Could not add the order.`, true);
  console.log(set.user_id);
  const updateInfo = await tempAccount.findOneAndUpdate(
    { _id: set.user_id },
    { $addToSet: { orders: orderInfo.insertedId } },
    { returnDocument: "after" }
  );
  if (!updateInfo)
    throw CustomException(
      `Could not update the account with id ${set.user_id}`,
      true
    );

  //update room
  const tempRoom = await Room();
  const roomInfo = await tempRoom.findOneAndUpdate(
    { _id: set.room_id},
    { $addToSet: { order: orderInfo.insertedId } },
    { returnDocument: "after" }
  );
  if (!roomInfo)
    throw CustomException(
      `Could not update the room with id ${set.room_id}`,
      true
    );

  return orderInfo;
}

let user = {};
let userInfo = {};
let manager_id = "";
let hotel_id = "";
let roomType_id = "";
let room_id = "";
let room = undefined;
let hotelInfo = {};
let roomType = {};
let t = undefined;
let order = {};
let ref = [
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
];
let review = {};
try {
  const room_types = [
    "single room",
    "double room",
    "king room",
    "queen room",
    "suite",
    "penthouse",
  ];
  for (let i = 0; i < 10; i++) {
    //create user
    user = userGenerator.next().value;
    console.log(user);
    userInfo = await create(
      user.identity,
      user.username,
      user.avatar,
      user.firstName,
      user.lastName,
      user.phone,
      user.password,
      user.email
    );
    if (!userInfo) throw "Failed to create user";
    if (i !== 3 && i !== 4 && i !== 5) {
      //create manager
      user = managerGenerator.next().value;
      console.log(user.password);
      userInfo = await create(
        user.identity,
        user.username,
        user.avatar,
        user.firstName,
        user.lastName,
        user.phone,
        user.password,
        user.email
      );
      if (!userInfo) throw "Failed to create manager";
      manager_id = userInfo.insertedId.toString();

      //create hotel
      hotelInfo = hotelGenerator.next().value;
      hotelInfo.facilities = "wifi, parking, pool, gym, spa, restaurant";
      hotelInfo.managers = [manager_id];
      console.log(hotelInfo);
      hotelInfo = await addHotel(
        hotelInfo.name,
        hotelInfo.street,
        hotelInfo.city,
        hotelInfo.state,
        hotelInfo.zip_code,
        hotelInfo.phone,
        hotelInfo.email,
        hotelInfo.pictures,
        hotelInfo.facilities,
        hotelInfo.managers
      );
      if (!hotelInfo) throw "Failed to create hotel";
      const tempAccount = await Account();
      await tempAccount.findOneAndUpdate(
        { _id: userInfo.insertedId },
        { $set: { hotel_id: hotelInfo.insertedId } },
        { returnDocument: "after" }
      );
      hotel_id = hotelInfo.insertedId.toString();
      //create room type
      t = faker.datatype.number(0, 5);

      roomType = roomTypeGenerator.next().value;
      console.log("roomType");
      roomType.hotel_id = hotelInfo.insertedId.toString();
      roomType.name = room_types[t];
      roomType.rooms = [];
      console.log(roomType);
      roomType = await addRoomType(
        roomType.hotel_id,
        roomType.name,
        roomType.pictures,
        roomType.price,
        roomType.rooms
      );
      if (!roomType) throw "Failed to create room type";
      roomType_id = roomType.insertedId.toString();
      //create room
      for (let j = 0; j < 2; j++) {
        room = roomGenerator.next(t).value;
        room.room_type = room_types[t];
        console.log(room);
        room.hotel_id = hotelInfo.insertedId.toString();
        room = await addRoom(
          room.hotel_id,
          room.room_number,
          room.room_type,
          room.floor,
          room.pictures
        );
        if (!room) throw "Failed to create room";
        room_id = room.insertedId.toString();
        console.log("room created");
      }
      //create order
      order = orderGenerator.next().value;
      order.user_id = userInfo.insertedId.toString();
      order.hotel_id = hotel_id;
      order.room_id = room_id;
      order.hotelName = "hotel" + ref[i];
      console.log(order);
      order = await addOrder(
        order.hotel_id,
        order.user_id,
        order.room_id,
        order.hotelName,
        order.checkin_date,
        order.checkout_date,
        order.guest,
        order.price,
        order.status
      );
      if (!order) throw "Failed to create order";

      //create review
      review = reviewGenerator.next().value;
      review.user_id = userInfo.insertedId.toString();
      review.hotel_id = hotel_id;
      review.order_id = order.insertedId.toString();
      console.log(review);
      review = await userFuncs.addReview(
        review.order_id,
        review.hotel_id,
        review.user_id,
        review.comment,
        review.rating
      );
      if (!review) throw "Failed to create review";
    } else {
      //create hotel
      hotelInfo = hotelGenerator.next().value;
      hotelInfo.facilities = "wifi, parking, pool, gym, spa, restaurant";
      hotelInfo.managers = [userInfo.insertedId.toString()];
      console.log(hotelInfo);
      //create request
      await userFuncs.createRequest(
        user.username,
        hotelInfo.name,
        hotelInfo.street,
        hotelInfo.city,
        hotelInfo.state,
        hotelInfo.zip_code,
        hotelInfo.phone,
        hotelInfo.email,
        hotelInfo.pictures,
        hotelInfo.facilities,
        hotelInfo.managers
      );
      console.log("request created");
    }
  }
} catch (e) {
  console.log(e);
}

console.log("Done seeding database");
await closeConnection();
