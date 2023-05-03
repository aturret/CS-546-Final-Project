import {hotelApps, mgrApps, users, hotels} from '../config/mongoCollections.js';
import {ObjectId} from 'mongodb';
import * as helper from "../helper.js";

export async function getAllHotelApp() {
  const hotelAppCollection = await hotelApps();
  let appList = await hotelAppCollection.find({}).toArray();
  appList = appList.map((element) => {
    element._id = element._id.toString();
    return element;
  });
  return appList;
}

export async function getAllMgrApp() {
  const mgrAppCollection = await mgrApps();
  let appList = await mgrAppCollection.find({}).toArray();
  appList = appList.map((element) => {
    element._id = element._id.toString();
    return element;
  });
  return appList;
}

export async function getHotelApp(id) {
  id = helper.checkId(id, true);

  const hotelAppCollection = await hotelApps();

  let app = await hotelAppCollection.find({_id: new ObjectId(id)});

  if (!app) throw CustomException(`No application with ID ${id}`);
  app._id = app._id.toString();
  return app;
}

export async function getMgrApp(id) {
  id = helper.checkId(id, true);

  const mgrAppCollection = await mgrApps();

  let app = await mgrAppCollection.find({_id: new ObjectId(id)});

  if (!app) throw CustomException(`No application with ID ${id}`);
  app._id = app._id.toString();
  return app;
}

export async function hotelApprove(appId, response) {
  let app = getApp(appId);

  const hotelAppCollection = await hotelApps();
  const deletionInfo = await hotelAppCollection.findOneAndDelete({
    _id: new ObjectId(appId)
  })
  if (deletionInfo.lastErrorObject.n === 0)
    throw CustomException(`Could not delete application with ID ${appId}`);

  if (!response) return [app, 'Application reject'];

  // const userCollection = await users();
  // const user = await userCollection.findOne(
  //   {
  //     _id: new ObjectId(app.userId),
  //     identity: 'manager'
  //   }
  // );

  // if (!user) throw CustomException(`No user with ID ${app.userId}`);

  // if (app.identity === 'manager') throw CustomException('This user is already a manager, application delete');

  // if (!app.hotel) throw CustomException('This application does not provide a hotel, application delete');

  const hotelCollection = await hotels();
  const hotel = await hotelCollection.findOne(
    {
      name: app.name,
      state: app.state,
      city: app.city
    }
  );
  if (!hotel) throw CustomException(`There is no hotel with ID ${hotel.hotelId}`);

  const updateInfo = await user.findOneAndUpdate(
    {_id: new ObjectId(app.userId)},
    {
      $set: {identity: 'manager'}
    },
    {returnDocument: 'after'}
  )
  if (updateInfo.lastErrorObject.n === 0) throw CustomException(`No user with ID ${app.userId} application delete`);
  updateInfo.value._id = updateInfo.value._id.toString();
  return [updateInfo.value, 'Application approve'];
}

export async function mgrApprove(appId, response) {
  let app = getMgrApp(appId);

  const mgrAppCollection = await mgrApps();
  const deletionInfo = await mgrAppCollection.findOneAndDelete({
    _id: new ObjectId(appId)
  })
  if (deletionInfo.lastErrorObject.n === 0)
    throw CustomException(`Could not delete application with ID ${appId}`);

  if (!response) return [app, 'Application reject'];

  const userCollection = await users();
  const user = await userCollection.findOne(
    {
      _id: new ObjectId(app.userId)
    }
  );

  if (!user) throw CustomException(`No user with ID ${app.userId}`);

  if (app.identity === 'manager') throw CustomException('This user is already a manager, application delete');

  if (!app.hotel) throw CustomException('This application does not provide a hotel, application delete');

  const hotelCollection = await hotels();
  const hotel = await hotelCollection.findOne(
    {
      _id: new ObjectId(hotel.hotelId)
    }
  );
  if (!hotel) throw CustomException(`There is no hotel with ID ${hotel.hotelId}`);

  const updateInfo = await user.findOneAndUpdate(
    {_id: new ObjectId(app.userId)},
    {
      $set: {identity: 'manager'}
    },
    {returnDocument: 'after'}
  )
  if (updateInfo.lastErrorObject.n === 0) throw CustomException(`No user with ID ${app.userId} application delete`);
  updateInfo.value._id = updateInfo.value._id.toString();
  return [updateInfo.value, 'Application approve'];
}