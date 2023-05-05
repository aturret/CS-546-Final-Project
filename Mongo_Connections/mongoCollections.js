import { dbConnection } from './mongoConnection.js';

const getCollectionFn = (collection) => {
  let _col = undefined;

  return async () => {
    if (!_col) {
      const db = await dbConnection();
      _col = await db.collection(collection);
    }

    return _col;
  };
};

// Note: You will need to change the code below to have the collection required by the assignment!
export const Account = getCollectionFn('accounts')
export const Order = getCollectionFn('orders')
export const Review = getCollectionFn('reviews')
export const Room = getCollectionFn('rooms')
export const hotelReg = getCollectionFn('hotels')
export const mgrReq = getCollectionFn('managerRequests')
export const roomType = getCollectionFn('roomTypes')