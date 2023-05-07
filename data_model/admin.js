import {mgrReq} from '../Mongo_Connections/mongoCollections.js';
import {ObjectId} from 'mongodb';
import * as helper from "../helper.js";
import { CustomException } from "../helper.js";
import * as hotelFuncs from "./Hotel_Data.js";
import * as userFuncs from "./User_Account.js";

// export async function getAllHotelReq() {
//   const hotelReqCollection = await hotelReqs();
//   let reqList = await hotelReqCollection.find({}).toArray();
//   reqList = reqList.map((element) => {
//     element._id = element._id.toString();
//     return element;
//   });
//   return reqList;
// }

export async function getAllReq() {
  const mgrReqCollection = await mgrReq();
  let reqList = await mgrReqCollection.find({}).toArray();
  reqList = reqList.map((element) => {
    element._id = element._id.toString();
    return element;
  });
  return reqList;
}

// export async function getHotelReq(id) {
//   id = helper.checkId(id, true);

//   const hotelReqCollection = await hotelReqs();

//   let req = await hotelReqCollection.find({_id: new ObjectId(id)});

//   if (!req) throw CustomException(`No hotel request with ID ${id}`);
//   req._id = req._id.toString();
//   return req;
// }

export async function getReq(id) {
  id = helper.checkId(id, true);

  const mgrReqCollection = await mgrReq();

  let req = await mgrReqCollection.findOne({_id: new ObjectId(id)});

  if (!req) throw CustomException(`No manager request with ID ${id}`);
  req._id = req._id.toString();
  return req;
}

// export async function hotelReqApprove(id, response) {
//   let req = getHotelReq(id);
//   if (req.status !== 'pending') throw CustomException(`The request with ID ${id} is already closed`);
  
//   const hotelReqCollection = await hotelReqs();
//   if (!response) {
//     const requestUpdateInfo = await hotelReqCollection.findOneAndUpdate(
//       { _id: ObjectId(id) },
//       { $set: { status: 'reject' } },
//       { returnDocument: "after" }
//     );
//     if (requestUpdateInfo.lastErrorObject.n === 0) throw CustomException(`Could not update the request with id ${review_id}`, true);
//     return {message: "Request reject"};
//   }

//   const newHotelMessage = hotelData.addHotel(req)

//   const requestUpdateInfo = await hotelReqCollection.findOneAndUpdate(
//     { _id: new ObjectId(id) },
//     { $set: { status: 'approve' } },
//     { returnDocument: "after" }
//   );
//   if (requestUpdateInfo.lastErrorObject.n === 0) throw CustomException(`Could not update the request with id ${review_id}`, true);
//   return { message: newHotelMessage + " Request approve" };
// }

export async function reqApprove(reqId, response) {
  reqId = helper.checkId(reqId, true);
  let request = await getReq(reqId);
  if (request.status !== 'pending') throw CustomException(`The request with ID ${reqId} is already closed`);
  
  const reqCollection = await mgrReq();
  if (response === 'false') {
    const requestUpdateInfo = await reqCollection.findOneAndUpdate(
      { _id: new ObjectId(reqId) },
      { $set: { status: 'reject' } },
      { returnDocument: "after" }
    );
    if (requestUpdateInfo.lastErrorObject.n === 0) throw CustomException(`Could not update the request with id ${reqId}`, true);
    return {message: "Request reject"};
  } else if (response === 'true') {
    const name = request.args[0];
    const street = request.args[1];
    const city = request.args[2];
    const state = request.args[3];
    const zip_code = request.args[4];
    const phone = request.args[5];
    const email = request.args[6];
    const pictures = request.args[7];
    const facilities = request.args[8];
    console.log(request.args[9]);
    const managers = [request.args[9][0].toString()];
    
    const newHotelId = await hotelFuncs.addHotel(
      name,
      street,
      city,
      state,
      zip_code,
      phone,
      email,
      pictures,
      facilities,
      managers
    );

    const newMgrMessage = await userFuncs.updateUser(
      request.username, 
      { 
        identity: 'manager',
        hotel: newHotelId
      }
    )
    
    const requestUpdateInfo = await reqCollection.findOneAndUpdate(
      { _id: new ObjectId(reqId) },
      { $set: { status: 'approve' } },
      { returnDocument: "after" }
    );
    if (requestUpdateInfo.lastErrorObject.n === 0) throw CustomException(`Could not update the request with reqId ${reqId}`, true);
    return { message: "Request approve. Add new hotel and upgrate user to manager successfully" };
  }
}