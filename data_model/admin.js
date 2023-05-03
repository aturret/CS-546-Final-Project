import {apps, users, hotels} from '../config/mongoCollections.js';
import {ObjectId} from 'mongodb';
import * as helper from "../helper.js";

export async function getAllApp() {
  const appCollection = await apps();
  let appList = await appCollection.find({}).toArray();
  appList = appList.map((element) => {
    element._id = element._id.toString();
    return element;
  });
  return appList;
}

export async function getApp(id) {
  id = helper.checkId(id, true);

  const appCollection = await apps();

  let app = await appCollection.find({_id: new ObjectId(id)});

  if (!app) throw CustomException(`No application with ID ${id}`);
  app._id = app._id.toString();
  return app;
}

export async function appApprove(appId, response) {
  let app = getApp(appId);

  const appCollection = await apps();
  const deletionInfo = await appCollection.findOneAndDelete({
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