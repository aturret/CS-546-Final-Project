//crud for hotel
import { Account } from "../Mongo_Connections/mongoCollections.js";
import { Order } from "../Mongo_Connections/mongoCollections.js";
import { Room } from "../Mongo_Connections/mongoCollections.js";
import { Hotel } from "../Mongo_Connections/mongoCollections.js";
import { roomType } from "../Mongo_Connections/mongoCollections.js";
import { request } from "../Mongo_Connections/mongoCollections.js";
import { ObjectId } from "mongodb";
import * as helper from "../helper.js";
import { CustomException } from "../helper.js";

export async function getAllHotels() {
  const hotelCollection = await Hotel();
  let hotelList = await hotelCollection.find({}).toArray();
  hotelList = hotelList.map((element) => {
    element._id = element._id.toString();
    return element;
  });
  return hotelList;
}

export async function getHotel(id) {
  id = helper.checkId(id, true);
  const hotelCollection = await Hotel();

  let hotel = await hotelCollection.find({ _id: new ObjectId(id) });

  if (!hotel) throw CustomException(`No hotel with ID ${id}`, true);
  hotel._id = hotel._id.toString();
  return hotel;
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
  newHotel.picture = args[7]
    ? args[7].map((web) => helper.checkWebsite(web, true))
    : undefined;
  newHotel.rooms = [];
  newHotel.room_types = [];
  newHotel.overall_rating = 0;
  if (args[7] && Array.isArray(args[7])) {
    newHotel.facilities = args[7].map((facility) =>
      helper.checkString(facility, "facility", true)
    );
  } else if (!args[7]) {
    newHotel.facilities = [];
  } else {
    throw CustomException("Invalid facilities.", true);
  }
  newHotel.managers = args[8]
    ? args[8].map((manager) => helper.checkId(manager, true))
    : undefined;
  newHotel.reviews = [];

  const tempHotel = await Hotel();
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
  updateHotel.rooms = [];
  if (args[8] && Array.isArray(args[8])) {
    updateHotel.facilities = args[8].map((facility) =>
      helper.checkString(facility, "facility", false)
    );
  } else if (!args[8]) {
    updateHotel.facilities = [];
  } else {
    throw CustomException("Invalid facilities.", true);
  }
  updateHotel.managers = args[9]
    ? args[9].map((manager) => helper.checkId(manager, false))
    : [];
  updateHotel.roomTypes = args[10]
    ? args[10].map((roomType) => helper.checkString(roomType, false))
    : [];
  updateHotel.reviews = args[11]
    ? args[11].map((reviews) => helper.checkString(reviews, false))
    : [];

  const tempHotel = await Hotel();
  const updateInfo = await tempHotel.findOneUpdate(
    { _id: hotel_id },
    { $set: updateHotel },
    { returnDocument: "after" }
  );
  if (!updateInfo)
    throw CustomException(`Update hotel with id ${hotel_id} failed.`, true);

  return { message: `Hotel with id ${hotel_id} updated successfully.` };
}

export async function hotelSearch(name, city, state, zipCode) {
  const hotelCollection = await Hotel();

  let query = {};
  name = helper.checkString(name, "hotel name", true);
  query.name = { $regex: new RegExp(name, "i") };

  city = helper.checkString(city, "city", true);
  query.city = { $regex: new RegExp(city, "i") };

  state = helper.checkString(state, "state", true);
  query.state = { $regex: new RegExp(state, "i") };

  zipCode = helper.checkString(zipCode, "ZIP Code", true);
  query.zipCode = { $regex: new RegExp(zipCode, "i") };

  let hotelList = await hotelCollection.find(query).toArray();
  if (!hotelList) throw [404, "Hotel not found"];

  hotelList = hotelList.map((element) => {
    element._id = element._id.toString();
    return element;
  });
  return hotelList;
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
  const tempHotel = await Hotel();
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

//check room availability
export async function checkRoomAvailability(...args) {
  const hotel_id = ObjectId(helper.checkId(args[0], true));
  const room_id = helper.checkId(args[1], "room type", true);
  const checkin_date = moment(helper.checkDate(args[2], true), "YYYY-MM-DD");
  const checkout_date = moment(helper.checkDate(args[3], true), "YYYY-MM-DD");
  const order_id = helper.checkId(args[4], true);

  //check if hotel exists
  const tempHotel = await Hotel();
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
