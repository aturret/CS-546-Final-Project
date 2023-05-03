import {Hotel} from '../config/mongoCollections.js';
import {ObjectId} from 'mongodb';
import * as helper from "../helper.js";

//crud for hotel
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

    let hotel = await hotelCollection.find({_id: new ObjectId(id)});

    if (!hotel) throw CustomException(`No hotel with ID ${id}`);
    hotel._id = hotel._id.toString();
    return hotel;
}

export async function hotelSearch(
    name,
    city,
    state,
    zipCode
  ) {
    const hotelCollection = await Hotel();

    let query = {};
    name = helper.checkString(name, "hotel name", true);   
    query.name = { $regex: new RegExp(name, 'i') };
    
    city = helper.checkString(city, "city", true);   
    query.city = { $regex: new RegExp(city, 'i') };
    
    state = helper.checkString(state, "state", true);  
    query.state = { $regex: new RegExp(state, 'i') };
    
    zipCode = helper.checkString(zipCode, "ZIP Code", true);  
    query.zipCode = { $regex: new RegExp(zipCode, 'i') };

    let hotelList = await hotelCollection.find(query).toArray();
    if (!hotelList) throw [404, 'Hotel not found'];

    hotelList = hotelList.map((element) => {
      element._id = element._id.toString();
      return element;
    });
    return hotelList;
  }

//room type
export async function addRoomType(...args){
    const hotel_id = helper.checkId(args[0], true)
    const name = helper.checkString(args[1], "room type", true)
    const picture = helper.checkWebsite(args[2], true)
    const price = helper.checkPrice(args[3], true)
    const rooms = args[4]? helper.checkArray(args[4], true) : []
    const type = {
        hotel_id: hotel_id,
        name: name,
        picture: picture,
        price: price,
        rooms: rooms
    }

    //avoid duplicate room type
    const tempHotel = await Hotel();    
    const tempRoomType = await RoomType();
    const rv = await tempRoomType.findOne({hotel_id: hotel_id, name: name})
    if (rv) throw CustomException(`Room type ${name} already exists.`, true)

    //check if hotel exists
    const target = await tempHotel.findOne({_id: hotel_id})
    if (!target) throw CustomException(`Hotel with id ${hotel_id} does not exist.`, true)

    //add room type
    const insertInfo = await tempRoomType.insertOne(type);
    if (insertInfo.insertedCount === 0)
        throw CustomException(`Could not add the room type.`, true);

    //add room type to hotel
    const updateInfo = await tempHotel.findOneUpdate({_id: hotel_id}, {$addToSet: {room_types: name}}, {returnDocument: "after"})
    if(!updateInfo) throw CustomException(`Could not update the hotel with id ${hotel_id}`, true);

    return {message: `Room type ${name} added successfully.`}
}