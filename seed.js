import { Account } from "./Mongo_Connections/mongoCollections.js";
import * as helper from "./helper.js";
import * as userFuncs from "./data_model/User_Account.js";
import faker from "faker";

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
  
    return insertInfo;
  }

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
  
    return insertInfo;
  }

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

    return insertInfo;
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
  
    return orderInfo;
  }





let user = {};
let userInfo = {};
let manager_id = ""; 
let hotel_id = "";
let roomType_id = "";
let room_id = "";
let hotelInfo = {};
let roomType = {};
let t = undefined;
let order = {};
let ref = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
let review = {};
try
{
    for (let i = 0; i < 10; i++)
    {   
        //create user
        user = userGenerator.next().value;
        userInfo = await create(user.identity, user.username, user.avatar, user.firstName, user.lastName, user.phone, user.password, user.email);
        if(!userInfo) throw "Failed to create user";

        if (i != 3, 4, 5){
        //create manager
            user = managerGenerator.next().value;
            userInfo = await create(user.identity, user.username, user.avatar, user.firstName, user.lastName, user.phone, user.password, user.email);
            if(!userInfo) throw "Failed to create manager";
            manager_id = userInfo.insertedId.toString();

            //create hotel
            hotelInfo = hotelGenerator.next().value;
            hotelInfo.facilities = [];
            hotelInfo.managers = [manager_id];
            hotelInfo = await addHotel(hotelInfo.name, hotelInfo.street, hotelInfo.city, hotelInfo.state, hotelInfo.zip_code, hotelInfo.phone, hotelInfo.email, hotelInfo.pictures, hotelInfo.facilities, hotelInfo.managers);
            if(!hotelInfo) throw "Failed to create hotel";
            hotel_id = hotelInfo.insertedId.toString();
            //create room type
            t = faker.random.number(0, 5)
            roomType = roomTypeGenerator.next(t).value;
            roomType.hotel_id = hotelInfo.insertedId;
            roomType = await addRoomType(roomType.name, roomType.hotel_id, roomType.price, roomType.capacity, roomType.pictures, roomType.facilities);
            if(!roomType) throw "Failed to create room type";
            roomType_id = roomType.insertedId.toString();
            //create room
            for (let j = 0; j < 2; j++){
                room = roomGenerator.next(t).value;
                room.hotel_id = hotelInfo.insertedId;
                room = await addRoom(room.hotel_id, room.room_type, room.floor, room.pictures);
                if(!room) throw "Failed to create room";
                room_id = room.insertedId.toString();
            }
            //create order
            order = orderGenerator.next().value;
            order.user_id = userInfo.insertedId.toString();
            order.hotel_id = hotel_id;
            order.room_id = room_id;
            order.hotelName = "hotel" + ref[i]
            order = await addOrder(order.user_id, order.hotel_id, order.room_id, order.hotelName, order.checkind_date, order.checkout_date, order.guest, order.price, order.status);
            if(!order) throw "Failed to create order";

            //create review
            review = reviewGenerator.next().value;
            review.user_id = userInfo.insertedId.toString();
            review.hotel_id = hotel_id;
            review.order_id = order.insertedId.toString();
            review = await userFuncs.addReview(review.order_id, review.hotel_id, review.user_id, review.comment, review.rating);
            if(!review) throw "Failed to create review";
            }
            else{
              //create hotel
                hotelInfo = hotelGenerator.next().value;
                hotelInfo.facilities = [];
                hotelInfo.managers = [userInfo.insertedId];
                
              //create request
                await userFuncs.addRequest(hotelInfo.name, hotelInfo.street, hotelInfo.city, hotelInfo.state, hotelInfo.zip_code, hotelInfo.phone, hotelInfo.email, hotelInfo.pictures, hotelInfo.facilities, hotelInfo.managers);
            }

        }

}
catch(e)
{
    console.log(e);
}