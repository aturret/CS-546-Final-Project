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

export async function getReq(id) {
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

export async function reqApprove(reqId, response) {
  reqId = helper.checkId(reqId, true);
  let request = getReq(reqId);
  if (request.status !== 'pending') throw CustomException(`The request with ID ${reqId} is already closed`);
  
  const reqCollection = await mgrReq();
  if (!response) {
    const requestUpdateInfo = await reqCollection.findOneUpdate(
      { _id: new ObjectId(reqId) },
      { $set: { status: 'reject' } },
      { returnDocument: "after" }
    );
    if (requestUpdateInfo.lastErrorObject.n === 0) throw CustomException(`Could not update the request with id ${reqId}`, true);
    return {message: "Request reject"};
  }

  const newMgrMessage = userFuncs.updateUser(
    request.username, 
    { identity: 'manager' }
  )

  const newHotelMessage = hotelFuncs.addHotel(request.args);

  const requestUpdateInfo = await reqCollection.findOneUpdate(
    { _id: ObjectId(reqId) },
    { $set: { status: 'approve' } },
    { returnDocument: "after" }
  );
  if (requestUpdateInfo.lastErrorObject.n === 0) throw CustomException(`Could not update the request with reqId ${reqId}`, true);
  return { message: "Request approve. Add new hotel and upgrate user to manager successfully" };
}