import {mgrReqs} from '../Mongo_Connections/mongoCollections.js';
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

export async function getAllMgrReq() {
  const mgrReqCollection = await mgrReqs();
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

export async function getMgrReq(id) {
  id = helper.checkId(id, true);

  const mgrReqCollection = await mgrReqs();

  let req = await mgrReqCollection.find({_id: new ObjectId(id)});

  if (!req) throw CustomException(`No manager request with ID ${id}`);
  req._id = req._id.toString();
  return req;
}

// export async function hotelReqApprove(id, response) {
//   let req = getHotelReq(id);
//   if (req.status !== 'pending') throw CustomException(`The request with ID ${id} is already closed`);
  
//   const hotelReqCollection = await hotelReqs();
//   if (!response) {
//     const requestUpdateInfo = await hotelReqCollection.findOneUpdate(
//       { _id: ObjectId(id) },
//       { $set: { status: 'reject' } },
//       { returnDocument: "after" }
//     );
//     if (requestUpdateInfo.lastErrorObject.n === 0) throw CustomException(`Could not update the request with id ${review_id}`, true);
//     return {message: "Request reject"};
//   }

//   const newHotelMessage = hotelData.addHotel(req)

//   const requestUpdateInfo = await hotelReqCollection.findOneUpdate(
//     { _id: new ObjectId(id) },
//     { $set: { status: 'approve' } },
//     { returnDocument: "after" }
//   );
//   if (requestUpdateInfo.lastErrorObject.n === 0) throw CustomException(`Could not update the request with id ${review_id}`, true);
//   return { message: newHotelMessage + " Request approve" };
// }

export async function mgrReqApprove(id, response) {
  let req = getMgrReq(id);
  if (req.status !== 'pending') throw CustomException(`The request with ID ${id} is already closed`);
  
  const mgrReqCollection = await mgrReqs();
  if (!response) {
    const requestUpdateInfo = await mgrReqCollection.findOneUpdate(
      { _id: new ObjectId(id) },
      { $set: { status: 'reject' } },
      { returnDocument: "after" }
    );
    if (requestUpdateInfo.lastErrorObject.n === 0) throw CustomException(`Could not update the request with id ${review_id}`, true);
    return {message: "Request reject"};
  }

  const newMgrMessage = userFuncs.updateUser(req.username, {
    identity: 'manager'
  })

  const requestUpdateInfo = await mgrReqCollection.findOneUpdate(
    { _id: ObjectId(id) },
    { $set: { status: 'approve' } },
    { returnDocument: "after" }
  );
  if (requestUpdateInfo.lastErrorObject.n === 0) throw CustomException(`Could not update the request with id ${review_id}`, true);
  return { message: "Upgrate user to manager successfully. Request approve" };
}