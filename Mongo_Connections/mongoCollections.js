import { dbConnection } from './mongoConnection.js.js';

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
export const account = getCollectionFn('accounts')
export const order = getCollectionFn('orders')
export const review = getCollectionFn('reviews')
export const room = getCollectionFn('rooms')
export const hotel = getCollectionFn('hotels')
export const request = getCollectionFn('requests')