import { Strategy as auth } from "passport-local";
import express, { Router } from "express";
import { ObjectId } from "mongodb";
import { Review, Account } from "../Mongo_Connections/mongoCollections.js";
import passport from "passport";
import bcrypt from "bcryptjs";
import * as userFuncs from "../data_model/User_Account.js";
import * as hotelFuncs from "../data_model/Hotel_Data.js";
import * as helper from "../helper.js";
import isAuth from "./user.js";
import moment from "moment";
import {upload} from '../helper.js'


const router = express.Router();

// functions for checking session authentication
export const isMgr = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.redirect("/user/login");
  }
  if (req.user && req.user.identity === 'user') {
    req.flash("errorMessage", "You are not allow to access this page")
    return res.redirect("/user/dashboard");
  }
  if (req.user.identity === 'manager' && req.user.hotel !== req.params.hotelId) {
    req.flash("errorMessage", "You are not allow to access this page")
    return res.redirect("/user/dashboard");
  }
  next();
};

export const isAdmin = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.redirect("/user/login");
  }
  if (req.user && req.user.identity !== 'admin') {
    req.flash("errorMessage", "You are not allow to access this page")
    return res.redirect("/user/dashboard");
  }
  next();
};
//helper functions


//TODO: Hotel searching main page
router
  .route("/")
  .get((req, res) => {
    const errorMessage = req.session && req.session.errorMessage || null;
    const status = req.session && req.session.status || 200;
    if (req.session) {
      req.session.status = null;
      req.session.errorMessage = null;
    }
    else req.session = {};

    if (errorMessage) return res.status(status).render("landpage", { errorMessage: errorMessage, title:"HotelFinder" });
    return res.status(status).render("landpage",{title:"HotelFinder"});
  })
  //search hotel
  .post(async (req, res) => {
    const hotel_name = req.body.hotelNameInput;
    const hotel_city = req.body.hotelCityInput;
    const hotel_state = req.body.hotelStateInput;
    const hotel_zip = req.body.hotelZipcodeInput;
    try{
      const result = await hotelFuncs.searchHotel(hotel_name, hotel_city, hotel_state, hotel_zip);
      const hotelList = [];      
      let price = undefined;
      let roomTypeInfo = undefined
      for (let i = 0; i < result.length; i++){
        for(let j = 0; j < result[i].room_types.length; j++){
          roomTypeInfo = await hotelFuncs.getHotelRoomType(result[i]._id);
          if(price === undefined) {
             price = roomTypeInfo[j].price;
          }
          else if(roomTypeInfo.price < price){
            price = roomTypeInfo.price;
          }
        }
        let hotelInfo = {};
        hotelInfo.hotelPrice = price;
        hotelInfo.hotelId = result[i]._id;
        hotelInfo.hotelAddress = result[i].street + ", " + result[i].city + ", " + result[i].state + ", " + result[i].zip_code;
        hotelInfo.hotelName = result[i].name;
        hotelInfo.hotelId = result[i]._id;
        hotelInfo.hotelPicture = result[i].picture?.[0];
        hotelInfo.hotelPhone = result[i].phone;
        hotelInfo.hotelEmail = result[i].email;
        hotelInfo.hotelRoom = result[i].rooms;
        hotelInfo.hotelRoomTypes = result[i].room_types;
        hotelInfo.hotelReviewNumber = result[i].reviews.length;
        hotelInfo.hotelRating = result[i].overall_rating;
        hotelList.push(hotelInfo);
      }
      return res.status(200).render("searchHotelsResult", { hotels: hotelList, title: "Hotel search result" });
    }
    catch(e){
      req.session.status = e.code ? e.code : 500;
      req.session.errorMessage = e.message;
      return res.redirect("/");
    }
  });


//TODO: Hotel searching -> hotel searching result -> hotel detail page
// -> review page
router
  .route("/reviews/:reviewId")
  .get(async (req, res) => {
    try {
      const theUser = req.user;
      const reviewId = helper.checkId(req.params.reviewId, true);
      
      const review = await userFuncs.getReviewById(reviewId);
      const user = await userFuncs.getUserById(review.user_id);
      const hotel = await hotelFuncs.getHotel(review.hotel_id);
      let editable = false;
      if(theUser){
      const theUserId = await userFuncs.getUser(theUser.username);
      if(theUser.identity==='admin' || review.user_id === theUserId._id){
        editable = true;
      }}
      const reviewInfo = {
        reviewId: review._id,
        orderId: review.order_id,
        reviewRating: review.rating,
        reviewUpvotes: review.upvote,
        reviewDownvotes: review.downvote,
        hotelName: hotel.name,
        hotelPhoto: hotel.pictures,
        hotelRating: hotel.overall_rating,
        hotelAddress: hotel.street + ", " + hotel.city + ", " + hotel.state + ", " + hotel.zip_code,
        hotelPhone: hotel.phone,
        hotelEmail: hotel.email,
        reviewTitle: `${user.username}'s Review`,
        hotelId: review.hotel_id,
        reviewComment: review.comment,
        username: user.username,
        userAvatar: user.avatar,
        reviewUserId: review.user_id,
        title: 'Review Control Panel',
        editable: editable
      };
      res.render('reviews', reviewInfo);
    } catch (e) {
      console.log(e);
      req.session.status = e.code ? e.code : 500;
      req.session.errorMessage = e.message;
      const previousUrl = req.headers.referer || '/hotel';
      res.redirect(previousUrl);
    }
  })
  .put(isAuth, async (req, res) => {
    const reviewId = req.params.reviewId;
    const reviewRating = req.body.reviewRating;
    const reviewComment = req.body.reviewComment;
    try{
      const result = await userFuncs.updateReview(reviewId, reviewComment, reviewRating);
      return res.redirect(`/reviews/${{reviewId}}`);
    }
    catch(e){
      console.log(e.message);
      req.session.status = e.code ? e.code : 500;
      req.session.errorMessage = e.message;
      return res.redirect("/");
    }
  })
  .patch(isAuth, async (req, res) => {
    const reviewId = req.params.reviewId;
    const reviewVote= req.body.voteInput;
    let reviewVoteSign = 0
    if (reviewVote === 'upvote') {
      reviewVoteSign = 1;
    }
    else if (reviewVote === 'downvote') {
      reviewVoteSign = -1;
    }
    try{
      const result = await userFuncs.voteReview(reviewId, reviewVoteSign);
      return res.redirect(`/reviews/${{reviewId}}`);
    }
    catch(e){
      req.session.status = e.code ? e.code : 500;
      req.session.errorMessage = e.message;
      console.log(e.message);
      return res.redirect(`/reviews/${reviewId}`);
    }
  })
  .delete(isAuth, async (req, res) => {
    const reviewId = req.params.reviewId;
    try{
      const result = await userFuncs.deleteReview(reviewId);
      return res.redirect(`/user/dashboard/admin`);
    }
    catch(e){
      req.session.status = e.code ? e.code : 500;
      req.session.errorMessage = e.message;
      console.log(e.message);
      return res.redirect(`/reviews/${reviewId}`);
    }
  });
//TODO: Hotel detail page

router
  .route('/hotel/createHotel')
  .get(isAdmin, async (req, res) => {
    res.render('adminHotel', {title:"Hotel Creating Panel"});
  })
  .post(isAdmin, upload.array("hotelPictures",10), async (req, res, next) => {
    if(req.files.length > 0){
      req.body.hotelPictures = req.files.map(file => `http://localhost:3000/public/uploads/${file.filename}`);
    }
    next();
  },
     async (req, res) => {
    try {
      let hotelInput = req.body;
      let args = [];
      args[0] = helper.checkString(hotelInput.nameInput, "hotel name", true);
      args[1] = helper.checkString(hotelInput.streetInput, "street", true);
      args[2] = helper.checkString(hotelInput.cityInput, "city", true);
      args[3] = helper.checkString(hotelInput.stateInput, "state", true);
      args[4] = helper.checkZip(hotelInput.zipCodeInput, true);
      args[5] = helper.checkPhone(hotelInput.phoneInput, true);
      args[6] = helper.checkEmail(hotelInput.emailInput, true);
      args[7] = hotelInput.picturesInput
        ? hotelInput.picturesInput.map((web) => helper.checkWebsite(web, true))
        : [];
      if (hotelInput.facilitiesInput && Array.isArray(hotelInput.facilitiesInput)) {
        args[8] = hotelInput.facilitiesInput.map((facility) =>
          helper.checkString(facility, "facility", true)
        );
      } else if (!hotelInput.facilitiesInput) {
        args[8] = [];
      } else {
        throw CustomException("Invalid facilities.", true);
      }
      args[9] = [];
      const addHotelId = await hotelFuncs.addHotel(args);
      req.flash('Create hotel successfully');
      res.redirect("/admin/createHotel");
    } catch (e) {
      if (!e.code) {
        req.session.status = 500;
      } else {
        req.session.status = e.code;
      }
      req.session.errorMessage = e.message;
      return res.redirect("/admin/createHotel");
    }
  })

router
  .route("/hotel/:hotelId")
  .get(async (req, res) => {
    const hotel_id = req.params.hotelId;
    const errorMessage = req.session && req.session.errorMessage || null;
    const status = req.session && req.session.status || 200;
    if (req.session) {
      req.session.status = null;
      req.session.errorMessage = null;
    }
    else req.session = {};

    //TODO: get hotel information
    //get hotel information
    try{
      const user = req.user;
      let manageable = "false";
      if (user){
        if ((user.identity === 'manager' && user.hotel !== hotel_id) || user.identity === 'admin'){
          manageable = "true";
        }
      }
      const hotel = await hotelFuncs.getHotel(hotel_id);
      const hotelInfo = {};
      hotelInfo.hotelId = hotel._id;
      hotelInfo.hotelName = hotel.name;
      hotelInfo.hotelPhoto = hotel.picture;
      hotelInfo.HotelRating = hotel.overall_rating;
      hotelInfo.hotelAddress = hotel.street + ", " + hotel.city + ", " + hotel.state + ", " + hotel.zip_code;
      hotelInfo.hotelPhone = hotel.phone;
      hotelInfo.hotelEmail = hotel.email;
      hotelInfo.roomType = hotel.room_type;
      hotelInfo.manageable = manageable;
      hotelInfo.title = hotel.name;
      //get hotel room
      const roomTypes = await hotelFuncs.getHotelRoomType(hotel_id);
      hotelInfo.roomType = roomTypes;
      //get hotel review
      const reviews = await hotelFuncs.getHotelReview(hotel_id);
      
      const reviewList = []; 
      reviews.forEach(review => { reviewList.push(review._id); });
      req.session.hotelInfo = hotelInfo;
      req.session.hotelInfo.reviewList = reviewList;
      
      hotelInfo.reviews = reviews;
      hotelInfo.title = hotel.name;
      return res.status(status).render("hotel", hotelInfo);
    }
    catch(e){
      req.session.status = e.code ? e.code : 500;
      req.session.errorMessage = e.message;
      return res.redirect("/");
    }
  })
  .post(isAuth, async (req, res) => {
    try {
      const hotelId = helper.checkId(req.params.hotelId, true);
      const checkin = helper.checkDate(req.body.startDate, true);
      const checkout = helper.checkDate(req.body.endDate, true);
      const curDate = moment().format('YYYY/MM/DD');
      if (moment(checkin, 'YYYY/MM/DD').isBefore(curDate, 'YYYY/MM/DD')) throw new helper.CustomException(400, "Check-in date cannot be before today");
      if (moment(checkout, 'YYYY/MM/DD').isBefore(moment(checkin, 'YYYY/MM/DD'))) throw new helper.CustomException(400, "Check-out date cannot be before check-in date");
      if (moment(checkin, 'YYYY/MM/DD').isAfter(moment(checkout, 'YYYY/MM/DD'))) throw new helper.CustomException(400, "Check-in date cannot be after check-out date");
      const searchResult = await hotelFuncs.checkRoomAvailabilityOrder(hotelId, checkin, checkout);
      if(searchResult.roomType.length === 0){
        searchResult.hotelRoom = false;
        searchResult.noRoom = true;
      }
      else{
        searchResult.hotelRoom = true;
        searchResult.noRoom = false;
        searchResult.checkInDate = checkin;
        searchResult.checkOutDate = checkout;
        searchResult.hotelId = hotelId;
        
      }
      searchResult.title =  "Room Search Result"
      res.render('searchRoomsResult', searchResult);
    } catch (e) {
      if (!e.code) {
        req.session.status = 500;
      } else {
        req.session.status = e.code;
      }
      req.session.errorMessage = e.message;
      return res.redirect("/hotel/:hotelId");
    }
  })

router
  .route("/hotel/:hotelId/searchResult")
  .post(isAuth, async (req, res) => {
    const hotelId = helper.checkId(req.params.hotelId, true);
    try {

      const roomTypeId = helper.checkId(req.body.roomCheckInput, true);
      const userId = await userFuncs.getUser(req.user.username);
      const hotel = await hotelFuncs.getHotel(hotelId);
      const hotelName = hotel.name;

      const checkin = helper.checkDate(req.body.checkInDateInput, true);
      const checkout = helper.checkDate(req.body.checkOutDateInput, true);
      const curDate = moment().format('YYYY/MM/DD');
      if (moment(checkin, 'YYYY/MM/DD').isBefore(curDate, 'YYYY/MM/DD')) throw new helper.CustomException(400, "Check-in date cannot be before today");
      if (moment(checkout, 'YYYY/MM/DD').isBefore(moment(checkin, 'YYYY/MM/DD'))) throw new helper.CustomException(400, "Check-out date cannot be before check-in date");
      if (moment(checkin, 'YYYY/MM/DD').isAfter(moment(checkout, 'YYYY/MM/DD'))) throw new helper.CustomException(400, "Check-in date cannot be after check-out date");
      const guest1FirstName = req.body.guestFirstNameInputA? helper.checkString(req.body.guestFirstNameInputA, true): undefined;
      const guest1LastName = req.body.guestLastNameInputA? helper.checkString(req.body.guestLastNameInputA, true): undefined;
      const guest2FirstName = req.body.guestFirstNameInputB? helper.checkString(req.body.guestFirstNameInputB, true): undefined;
      const guest2LastName = req.body.guestLastNameInputB? helper.checkString(req.body.guestLastNameInputB, true): undefined;

      const roomId = await hotelFuncs.addOrderByRoomType(roomTypeId, checkin, checkout); 

      const guests = [
        {
          firstName: guest1FirstName,
          lastName: guest1LastName
        },
        {
          firstName: guest2FirstName,
          lastName: guest2LastName
        }
      ];

      const roomType = await hotelFuncs.getRoomType(roomTypeId);
      
      const days = moment(checkout).diff(moment(checkin), 'days');
      const price = roomType.price * days;
      const status = 'accepted';
      const addOrder = await userFuncs.addOrder(hotelId, userId._id.toString(), roomId.toString(), hotelName, checkin, checkout, guests, price, status);
      if (addOrder) req.flash("successMessage", 'Add order successfullly');
      res.redirect(`/hotel/${hotelId}`);
    } catch (e) {
      if (!e.code) {
        req.session.status = 500;
      } else {
        req.session.status = e.code;
      }
      req.session.errorMessage = e.message;
      return res.redirect(`/hotel/${hotelId}`);
    }

  })

router
  .route("/hotel/:hotelId/hotelManagement")
  .get(isMgr, async (req, res) => {
    const hotelId = helper.checkId(req.params.hotelId, true);
    try {
      const hotel = await hotelFuncs.getHotel(hotelId);
      res.render('hotel_management', {hotel: hotel, title: `Hotel Control Panel`});
    } catch (e) {
      req.session.status = e.code ? e.code : 500;
      req.session.errorMessage = e.message;
      const previousUrl = req.headers.referer || '/';
      res.redirect(previousUrl);
    }
  })
  .put(isMgr, upload. array("hotelPictures",10), async (req, res, next) => {
    if(req.files.length > 0){
      req.body.hotelPictures = req.files.map(file => `http://localhost:3000/public/uploads/${file.filename}`);
    }
    next();
  }, async (req, res) => {
    const hotelId = req.params.hotelId;
    try {
      
      const hotelName = req.body.hotelName;
      const hotelStreet = req.body.hotelStreet;
      const hotelCity = req.body.hotelCity;
      const hotelState = req.body.hotelState;
      const hotelZipCode = req.body.hotelZipCode;
      const hotelPhone = req.body.hotelPhone;
      const hotelEmail = req.body.hotelEmail;
      const hotelPicture = req.body.hotelPictures;
      const hotelFacilities = req.body.hotelFacilities;
      const result = await hotelFuncs.updateHotel(
        hotelId,
        hotelName,
        hotelStreet,
        hotelCity,
        hotelState,
        hotelZipCode,
        hotelPhone,
        hotelEmail,
        hotelPicture,
        // rooms,
        hotelFacilities,
        // manager,
        // roomType,
        // reviews
      );
      req.flash(result);
      return res.redirect(200).redirect(`/hotel/${hotelId}/hotelManagement`);
    } catch (e) {
      console.log(e);
      e.code = e.code ? e.code : 500;
      req.session.errorMessage = e.message;
      res.redirect(`/hotel/${hotelId}/hotelManagement`);
    }
  })
  .delete(isAdmin, async (req, res) => {
    const hotelId = helper.checkId(req.params.hotelId, true);
    try {
      const message = await hotelFuncs.deleteHotel(hotelId);
      req.flash(message);
      return res.redirect("/hotel");
    } catch (e) {
      req.session.status = e.code ? e.code : 500;
      req.session.errorMessage = e.message;
      const previousUrl = req.headers.referer || `/hotel/${hotelId}/hotelManagement`;
      res.redirect(previousUrl);
    }
  })

router
  .route("/hotel/:hotelId/hotelManagement/rooms")
  .get(isMgr, async (req, res) => {
    const hotelId = helper.checkId(req.params.hotelId, true);
    const rooms = await hotelFuncs.getHotelRoom(hotelId);
    const roomTypes = await hotelFuncs.getHotelRoomType(hotelId);
    res.render('rooms', {hotelId: hotelId, rooms: rooms, roomTypes: roomTypes, title: `Room Control Panel`});
  })
  .post(isMgr, async (req, res) => {
    const hotelId = helper.checkId(req.params.hotelId, true);
    try {
      const hotelId = helper.checkId(req.params.hotelId, true);
      // const roomId = helper.checkId(req.body.roomIdInput, true);
      const roomNumber = helper.checkString(req.body.newRoomNumberInput, "room number", true);
      if(!/^[0-9]{0,5}$/.test(roomNumber)) throw CustomException(`Invalid room number.`, true);
      const roomType = helper.checkString(req.body.newRoomTypeInput, "room type", true);

      const addRoomMessage = hotelFuncs.addRoom(hotelId, roomNumber, roomType);
      req.flash(addRoomMessage);

      const rooms = await hotelFuncs.getHotelRoom(hotelId);
      const roomTypes = await hotelFuncs.getHotelRoomType(hotelId);
      res.redirect(`/hotel/${hotelId}/hotelManagement/rooms`);
      // res.status(200).render('rooms', {hotelId: hotelId, rooms: rooms, roomTypes: roomTypes, title: `Room Control Panel`});
    } catch (e) {
      req.session.status = e.code ? e.code : 500;
      req.session.errorMessage = e.message;
      const previousUrl = req.headers.referer || `/hotel/${hotelId}/hotelManagement/rooms`;
      res.redirect(previousUrl);
    }
  })

router
  .route("/hotel/:hotelId/hotelManagement/rooms/:roomId")
  .get(isMgr, async (req, res) => {
    const hotelId = helper.checkId(req.params.hotelId, true);
    const roomId = helper.checkId(req.params.roomId, true);
    try {
      const room = await hotelFuncs.getRoom(roomId);
      res.render('singleRoom', {room: room, title: `Room Control Panel`});
    } catch (e) {
      req.session.status = e.code ? e.code : 500;
      req.session.errorMessage = e.message;
      const previousUrl = req.headers.referer || `/hotel/${hotelId}/hotelManagement/rooms`;
      res.redirect(previousUrl);
    }
  })
  .put(isMgr, async (req, res) => {
    const hotelId = helper.checkId(req.params.hotelId, true);
    const roomId = helper.checkId(req.params.roomId, true);
    try {
      const typeName = helper.checkString(req.body.roomTypeInput, "room type", true);
      const roomNum = helper.checkId(req.body.roomNum, 'room number', true);
      if(!/[0-9]{0,5}$/.test(roomNum)) throw CustomException(`Invalid room number.`, true);
      
      const updateRoomMessage = await hotelFuncs.updateRoom(hotelId, roomId, typeName, roomNum);
      req.flash(updateRoomMessage);
      res.redirect(`/hotel/${hotelId}/hotelManagement/rooms/${roomId}`);
    } catch (e) {
      req.session.status = e.code ? e.code : 500;
      req.session.errorMessage = e.message;
      const previousUrl = req.headers.referer || `/hotel/${hotelId}/hotelManagement/rooms/${roomId}`;
      res.redirect(previousUrl);
    }
  })
  .delete(isMgr, async (req, res) => {
    const hotelId = helper.checkId(req.body.hotelId, true);
    const roomId = helper.checkId(req.body.roomId, true);
    try {
      const deleteRoomMessage = await hotelFuncs.deleteRoom.deleteRoom(hotelId,roomId );
      req.flash(deleteRoomMessage);
      res.redirect(`/hotel/${hotelId}/hotelManagement/rooms`);
    } catch (e) {
      console.log(e);
      req.session.status = e.code ? e.code : 500;
      req.session.errorMessage = e.message;
      const previousUrl = req.headers.referer || `/hotel/${hotelId}/hotelManagement/rooms/${roomId}`;
      res.redirect(previousUrl);
    }
  })

router
  .route("/hotel/:hotelId/hotelManagement/roomtypes")
  .get(isMgr, async (req, res) => {
    const hotelId = helper.checkId(req.params.hotelId, true);
    try {
      const roomTypes = await hotelFuncs.getHotelRoomType(hotelId);
      res.render('roomtTypes', {hotelId: hotelId, roomTypes: roomTypes, title: `Room Type Control Panel`});
    } catch (e) {
      req.session.status = e.code ? e.code : 500;
      req.session.errorMessage = e.message;
      const previousUrl = req.headers.referer || `/hotel/${hotelId}/hotelManagement`;
      res.redirect(previousUrl);
    }
  })
  .post(isMgr, async (req, res) => {
    const hotelId = helper.checkId(req.params.hotelId, true);
    try {
      const roomTypeName = helper.checkString(req.body.newRoomTypeNameInput, "room type name", true);
      const roomTypePicture = helper.checkWebsite(req.body.roomTypePictureInput, true);
      const price = helper.checkPrice(req.body.newPriceInput, true);
      const pictures = req.body.picturesInput ? helper.checkArray(req.body.picturesInput, true) : [];
      const rooms = req.body.rooms ? helper.checkArray(req.body.rooms, true) : [];

      const addRoomTypeMessage = await hotelFuncs.addRoomType(hotelId, roomTypeName, roomTypePicture, price, rooms);
      req.flash(addRoomTypeMessage);
      res.redirect(`/hotel/${hotelId}/hotelManagement/roomtypes`);
    } catch (e) {
      req.session.status = e.code ? e.code : 500;
      req.session.errorMessage = e.message;
      const previousUrl = req.headers.referer || `/hotel/${hotelId}/hotelManagement/roomtypes`;
      res.redirect(previousUrl);
    }
  })
  .put(isMgr, async (req, res) => {
    const hotelId = helper.checkId(req.params.hotelId, true);
    try {
      const roomTypeId = helper.checkId(req.body.roomTypeId, true);
      const roomTypeName = helper.checkString(req.body.roomTypeNameInput, "room type name", true);
      const price = helper.checkPrice(req.body.priceInput, true);
      const pictures = req.body.picturesInput ? helper.checkArray(req.body.picturesInput, true) : [];

      const updateRoomTypeMessage = await hotelFuncs.updateRoomType(roomTypeId, hotelId, roomTypeName, price, pictures);
      req.flash(updateRoomTypeMessage);
      res.redirect(`/hotel/${hotelId}/hotelManagement/roomtypes`);
    } catch (e) {
      req.session.status = e.code ? e.code : 500;
      req.session.errorMessage = e.message;
      const previousUrl = req.headers.referer || `/hotel/${hotelId}/hotelManagement/roomtypes`;
      res.redirect(previousUrl);
    } 
  })
  .delete(isMgr, async (req, res) => {
    const hotelId = helper.checkId(req.params.hotelId, true);
    try {
      const roomTypeId = helper.checkId(req.body.roomTypeId, true);
      const deleteRoomTypeMessage = await hotelFuncs.deleteRoomType(roomTypeId, hotelId);
      req.flash(deleteRoomTypeMessage);
      res.redirect(`/hotel/${hotelId}/hotelManagement/roomtypes`);
    } catch (e) {
      req.session.status = e.code ? e.code : 500;
      req.session.errorMessage = e.message;
      const previousUrl = req.headers.referer || `/hotel/${hotelId}/hotelManagement/roomtypes`;
      res.redirect(previousUrl);
    }
  })

router
  .route("/hotel/:hotelId/hotelManagement/orders")
  .get(isMgr, async (req, res) => {
    // const hotelId = helper.checkId(req.params.hotelId, true);
    // const hotel = await hotelFuncs.getHotel(hotelId);
    // res.render('orders', {orders: hotel.orders, title: `Order Control Panel`});
    res.render('orders', {title: `Order Control Panel`});
  })
  .delete(isMgr, async (req, res) => {
    try {
      const orderId = helper.checkId(req.body.orderId, true);
      const deleteOrderMessage = await userFuncs.deleteOrder(orderId);
      req.flash("successMessage", deleteOrderMessage);
      res.redirect('/hotel/:hotelId/hotelManagement/order');
    } catch (e) {
      req.session.status = e.code ? e.code : 500;
      req.session.errorMessage = e.message;
      const previousUrl = req.headers.referer || `/hotel/${hotelId}/hotelManagement/orders`;
      res.redirect(previousUrl);
    }
  })

// render the single review page

router
  .route("/hotel/:hotelId/hotelManagement/reviews")
  .get(isMgr, async (req, res) => {
    try {
      const hotelId = helper.checkId(req.params.hotelId, true);
      const hotelReviews = await hotelFuncs.getHotelReview(hotelId);
      hotelReviews.title = `Review Control Panel`;
      res.render('hotelReviews', hotelReviews);
    } catch (e) {
      req.session.status = e.code ? e.code : 500;
      req.session.errorMessage = e.message;
      const previousUrl = req.headers.referer || `/hotel/${hotelId}/hotelManagement`;
      res.redirect(previousUrl);
    }
  })
  .post(isAdmin, async (req, res) => {
    try {
      const orderId = helper.checkId(req.body.orderIdInput, true);
      const hotelId = helper.checkId(req.params.hotelId, true);
      const username = helper.checkId(req.body.usernameInput, true);
      const review = helper.checkString(req.body.reviewInput, "review", true);
      const rating = helper.checkRating(req.body.ratingInput, true);

      const hotelReviews = await userFuncs.addReview(orderId, hotelId, username, review, rating);
      if (hotelReviews) req.flash("successMessage",'Add review successfully');
      res.redirect('/hotel/:hotelId/hotelManagement/review');
    } catch (e) {
      req.session.status = e.code ? e.code : 500;
      req.session.errorMessage = e.message;
      const previousUrl = req.headers.referer || `/hotel/${hotelId}/hotelManagement/reviews`;
      res.redirect(previousUrl);
    }
  })
  .put(isAdmin, async (req, res) => {
    try {
      const reviewId = helper.checkId(req.body.reviewIdInput, true);
      const review = helper.checkString(req.body.reviewInput, "review", true);
      const rating = helper.checkRating(req.body.ratingInput, true);

      const updateOrderMessage = await userFuncs.updateReview(reviewId, review, rating);
      req.flash(updateOrderMessage);
      res.redirect(`/hotel/${hotelId}/hotelManagement/reviews`);
    } catch (e) {
      req.session.status = e.code ? e.code : 500;
      req.session.errorMessage = e.message;
      const previousUrl = req.headers.referer || `/hotel/${hotelId}/hotelManagement/reviews`;
      res.redirect(previousUrl);
    }
  })
  .delete(isAdmin, async (req, res) => {
    try {
      const reviewId = helper.checkId(req.body.reviewIdInput, true);
      const deleteReviewMessage = await userFuncs.deleteReview(reviewId);
      req.flash(deleteReviewMessage);
      res.redirect(`/hotel/${hotelId}/hotelManagement/reviews`);
    } catch (e) {
      req.session.status = e.code ? e.code : 500;
      req.session.errorMessage = e.message;
      const previousUrl = req.headers.referer || `/hotel/${hotelId}/hotelManagement/reviews`;
      res.redirect(previousUrl);
    }
  })

router
  .route("/hotel/:hotelId/hotelManagement/managers")
  .get(isMgr, async (req, res) => {
    const hotelId = helper.checkId(req.params.hotelId, true);
    try {
      const mgrList = await hotelFuncs.getHotelMgr(hotelId);
      res.render('hotelManagers', {managers: mgrList, title: `Manager Control Panel`});
    } catch (e) {
      req.session.status = e.code ? e.code : 500;
      req.session.errorMessage = e.message;
      const previousUrl = req.headers.referer || `/hotel/${hotelId}/hotelManagement`;
      res.redirect(previousUrl);
    }
  })
  .post(isMgr, async (req, res) => {
    const hotelId = helper.checkId(req.params.hotelId, true);
    try {
      // const mgrName = helper.checkNameString(req.body.mgrNameInput, "manager username", true);
      const userName = helper.checkNameString(req.body.userNameInput, "user username", true);

      const addMgrMessage = await userFuncs.addMgr(req.user.username, userName, hotelId);
      req.flash(addMgrMessage);
      res.redirect(`/hotel/${hotelId}/hotelManagement/manager`);
    } catch (e) {
      req.session.status = e.code ? e.code : 500;
      req.session.errorMessage = e.message;
      const previousUrl = req.headers.referer || `/hotel/${hotelId}/hotelManagement/manager`;
      res.redirect(previousUrl);
    }
  })
  .delete(isMgr, async (req, res) => {
    const hotelId = helper.checkId(req.params.hotelId, true);
    try {
      const userNameInput = helper.checkNameString(req.body.userNameInput, "user username", true);

      const deleteReviewMessage = await userFuncs.deleteMgr(req.user.username, userNameInput, hotelId);
      req.flash(deleteReviewMessage);
      res.redirect(`/hotel/${hotelId}/hotelManagement/manager`);
    } catch (e) {
      req.session.status = e.code ? e.code : 500;
      req.session.errorMessage = e.message;
      const previousUrl = req.headers.referer || `/hotel/${hotelId}/hotelManagement/manager`;
      res.redirect(previousUrl);
    }
  })

// //manager or admin only
// router.route("dashboard/:username/hotel_orders")
// .get(
//   (req, res, next) => {
//     if (!req.isAuthenticated()) {
//       return res.redirect("/user/login");
//     }
//     if (req.user.identity === "user") {
//       req.session.status = 403;
//       req.session.errorMessage = "You are not allowed to access this page";
//       return res.redirect(`/user/dashboard/${req.user.username}`);
//     }
//     next();
//   },
//   async (req, res) => {
//     try {
//       //get manager's hotels
//       const tempOrder = await Order();
//       const user = await getUser(req.user.username);
//       const hotels = user.hotels;

//       //get order of the hotels
//       const orders = await tempOrder
//         .find({ hotel_name: { $in: hotels } })
//         .toArray();
//       if (!orders) throw new CustomException("Order not found", true);

//       //get enum for room type for each order if manager want to edit that dont know if you need this or not
//       /*
//         const tempHotel = await Hotel();
//         const ref = {}
//         let hotelName = ""
//         let roomType = []
//         for (let i of orders) {
//           hotelName = i.hotel_name
//           if (ref[hotelName]) continue
//           roomType = await Hotel.findOne({name: hotelName}).room_type.toArray()
//           ref[hotelName] = roomType
//           i.room_type = roomType
//         }
//       */

//       return res.status(200).render("order", { order: orders });
//     } catch {
//       if (!e.code) {
//         req.session.status = 500;
//       } else {
//         req.session.status = e.code;
//       }
//       req.session.errorMessage = e.message;
//       res.redirect(`/user/dashboard/${req.user.username}`);
//     }
//   }
// )

// .patch((req, res, next) => {
//   if (!req.isAuthenticated()) {
//     return res.redirect("/user/login");
//   }
//   if (req.user.identity === "user") {
//     req.session.status = 403;
//     req.session.errorMessage = "You are not allowed to access this page";
//     return res.redirect(`/user/dashboard/${req.user.username}`);
//   }
//   next();
// },
// async (req, res) => {
//   try {
//     const order_id = helper.checkId(req.body.order_id, true);
//     const hotel_id = helper.checkId(req.body.hotel_id, true);
//     const checkin_date= helper.checkDate(req.body.check_in, true);
//     const checkout_date= helper.checkDate(req.body.check_out, true);
//     const guest = helper.checkArray(req.body.guest, "guest", true);
//     const room_id = helper.checkId(req.body.room_id, true)
//     const status = helper.checkStatus(req.body.status, "status", true);

//     const tempRoom = await Room();

//     const room_type = await tempRoom.findOne({_id: room_id}, {_id : 0, room_type: 1});
//     if (!room_type) throw new CustomException("Room not found", true);

//     //calculate new order_price
//     const tempRoomType = await RoomType();
//     const price = helper.checkPrice(tempRoomType.findOne({hotel_id: hotel_id, room_type: room_type}).price);
//     const order_price = price * (moment(checkout_date, "YYYY/MM/DD").diff(moment(checkin_date, "YYYY/MM/DD"), 'days'))


//     if (!await hotelFuncs.checkRoomAvailability(hotel_id, room_id, checkin_date, checkout_date, order_id, status)) throw new CustomException("Room not available", true);
//     if(!room_id) throw new CustomException(`No available ${room_type}`, true);

//     const message = await userFuncs.updateOrder(order_id, checkin_date, checkout_date, guest, order_price);
  
//     req.flash("success", message);
//     return res.status(200).redirect(`/user/dashboard/${req.user.username}/hotel_orders`);
//   }
//   catch (e) {
//     if (!e.code) {
//       req.session.status = 500;
//     } else {
//       req.session.status = e.code;
//     }
//     req.session.errorMessage = e.message;
//     res.redirect(`/user/dashboard/${req.user.username}/bookings`);
//   }
// });

// //TODO: load hotel information for the manager
// router.route("/dashboard/:username/hotel_management").get(
//   (req, res, next) => {
//     if (!req.isAuthenticated()) {
//       return res.redirect("/user/login");
//     }
//     if (req.user && req.user.identity === "user") {
//       req.session.status = 403;
//       req.session.errorMessage = "You are not allow to access this page";
//       return res.redirect("/user/dashboard");
//     }
//     next();
//   },
//   async (req, res) => {
//     try {
//       req.user.username = helper.checkString(req.user.username);
//       if (req.session && req.session.status) {
//         user.status = req.session.status;
//         user.errorMessage = req.session.errorMessage;
//         req.session.status = null;
//         req.session.errorMessage = null;
//       }
//       const hotel = await hotelFuncs.getMgrHotel(req.user.username);
//       return res.status(200).render("hotel_management", hotel);
//     } catch (e) {
//       //customized error are thrown. if e.code exist its a customized error. Otherwise, its a server error.
//       if (!e.code) {
//         req.session.status = 500;
//       } else {
//         req.session.status = e.code;
//       }
//       req.session.errorMessage = e.message;
//       res.redirect(`/user/dashboard/${req.user.username}`);
//     }
//   }
// )
// .put(
//   (req, res, next) =>  (req, res, next) => {
//     if (!req.isAuthenticated()) {
//       return res.redirect("/user/login");
//     }
//     if (req.user && req.user.identity === "user") {
//       req.session.status = 403;
//       req.session.errorMessage = "You are not allow to access this page";
//       return res.redirect("/user/dashboard");
//     }
//     next();
//   },
//   async (req, res) => {
//     try {
//       const hotel_id = req.body.hotel_id;
//       const hotel_name = req.body.hotel_name;
//       const hotel_street = req.body.hotel_street;
//       const hotel_city = req.body.hotel_city;
//       const hotel_state = req.body.hotel_state;
//       const hotel_zip = req.body.hotel_zip;
//       const hotel_phone = req.body.hotel_phone;
//       const hotel_email = req.body.hotel_email;
//       const hotel_picture = req.body.hotel_picture;
//       const facilities = req.body.facilities;
//       const manager = req.body.manager;
//       const rooms = req.body.rooms;
//       const roomType = req.body.roomType;
//       const reviews = req.body.reviews;

//       const result = await hotelFuncs.updateHotel(
//         hotel_id,
//         hotel_name,
//         hotel_street,
//         hotel_city,
//         hotel_state,
//         hotel_zip,
//         hotel_phone,
//         hotel_email,
//         hotel_picture,
//         rooms,
//         facilities,
//         manager,
//         roomType,
//         reviews
//       );
//       req.flash(result);
//       return res.redirect(200).redirect("/hotel_management");
//     } catch (e) {
//       e.code = e.code ? e.code : 500;
//       req.session.errorMessage = e.message;
//       res.redirect("/hotel_management");
//     }
//   }
// );
// //add room type for the hotel, hotel mnr or admin only
// router.route("/dashboard/:username/hotel_management/:hotel_id/room_type")
// .get((req, res, next) => {
//   if (!req.isAuthenticated()) {
//     return res.redirect("/user/login");
//   }
//   if (req.user && req.user.identity === "user") {
//     req.flash("You are not allow to access this page");
//     return res.redirect("/user/dashboard");
//   }
//   next();
// },
// async (req, res) => {
//   try {
//     const hotel_id = helper.checkId(req.params.hotel_id);
//     const roomTypes = await hotelFuncs.getHotelRoomType(hotel_id);
//     return res.status(200).render("roomsTypes", roomTypes);
//   } catch (e) {
//     //customized error are thrown. if e.code exist its a customized error. Otherwise, its a server error.
//     if (!e.code) {
//       req.session.status = 500;
//     } else {
//       req.session.status = e.code;
//     }
//     req.session.errorMessage = e.message;
//     res.redirect(`/user/dashboard/${req.user.username}/hotel_management`);
//   }

// }
// )
// .post(
//   (req, res, next) => {
//     if (!req.isAuthenticated()) {
//       return res.redirect("/user/login");
//     }
//     if (req.user && req.user.identity === "user") {
//       req.session.status = 403;
//       req.session.errorMessage = "You are not allow to access this page";
//       return res.redirect("/user/dashboard");
//     }
//     next();
//   },
//   async (req, res) => {
//     try {
//       const hotel_name = req.body.hotel_name;
//       const room_type = req.body.room_type;
//       const room_price = req.body.room_price;
//       const room_picture = req.body.room_picture
//         ? req.body.room_picture
//         :[];
//       const rooms = req.body.rooms ? req.body.rooms : [];
//       const result = await userFuncs.addRoomType(
//         hotel_name,
//         room_type,
//         room_price,
//         room_picture,
//         rooms
//       );
//       req.flash({ successMessage: "Room type added successfully" });
//       return res.redirect(200).redirect("/user/dashboard/:username/hotel_management/room_type");
//     } catch (e) {
//       e.code = e.code ? e.code : 500;
//       req.session.errorMessage = e.message;
//       res.redirect("/hotel_management");
//     }
//   }
// )
// router.route("/dashboard/:username/hotel_management/:hotel_id/room_type/:type_id")
// .patch( (req, res, next) => {
//     if (!req.isAuthenticated()) {
//       return res.redirect("/user/login");
//     }
//     if (req.user && req.user.identity === "user") {
//       req.session.status = 403;
//       req.session.errorMessage = "You are not allow to access this page";
//       return res.redirect("/user/dashboard");
//     }
//     next();
//   },
// async (req, res) => {
//   try {
//     const hotel_id = req.params.hotel_id;
//     const type_id = req.params.room_type;
//     const room_type = req.params.room_type;
//     const room_price = req.body.room_price;
//     const room_picture = req.body.room_picture;

//     const result = await hotelFuncs.updateRoomType(type_id, hotel_id, room_type, room_price, room_picture);
//     req.flash({ successMessage: "Room type updated successfully" });
//     return res.redirect(200).redirect(`/user/dashboard/${username}/hotel_management/${hotel_id}/room_type`);
//   }
//   catch (e) {
//     e.code = e.code ? e.code : 500;
//     req.session.errorMessage = e.message;
//     res.redirect("/hotel_management");
//   }
// }
// )
// //TODO: delete room type
// .delete((req, res, next) => {
//   if (!req.isAuthenticated()) {
//     return res.redirect("/user/login");
//   }
//   if (req.user && req.user.identity === "user") {
//     req.session.status = 403;
//     req.session.errorMessage = "You are not allow to access this page";
//     return res.redirect("/user/dashboard");
//   }
//   next();
// },
// async (req, res) => {
//   try {
//     const hotel_id = req.params.hotel_id;
//     const type_id = req.params.room_type;
//     const result = await hotelFuncs.deleteRoomType(type_id, hotel_id);
//     req.flash({ successMessage: "Room type deleted successfully" });
//     return res.redirect(200).redirect(`/user/dashboard/${username}/hotel_management/${hotel_id}/room_type`);
//   }
//   catch (e) {
//     e.code = e.code ? e.code : 500;
//     req.session.errorMessage = e.message;
//     return res.redirect(`/user/dashboard/${username}/hotel_management/${hotel_id}/room_type`);
//   }
// }
// );




// //add room for the hotel, hotel mnr or admin only
// router
//   .route("/hotel_management/:hotel_id/room")
//   .get(
//     (req, res, next) => {
//       if (!req.isAuthenticated()) {
//         return res.redirect("/user/login");
//       }
//       if (req.user && req.user.identity === "user") {
//         res.session.status = 403;
//         res.session.errorMessage = "You are not allow to access this page";
//         return res.redirect(`/user/dashboard/${req.user.username}`);
//       }
//       next();
//     },
//     async (req, res) => {
//       try {
//         const hotel_id = helper.checkId(req.params.hotel_id)
//         const rooms = await hotelFuncs.getHotelRoom(hotel_id);
//         return res.status(200).render("rooms", rooms);
//       } catch (e) {
//         if (!e.code) {
//           req.session.status = 500;
//         } else {
//           req.session.status = e.code;
//         }
//         req.session.errorMessage = e.message;
//         res.redirect(`/user/dashboard/${req.user.username}/hotel_management`);
//       }
//     }
//   )
//   .post(
//     (req, res, next) => {
//       if (!req.isAuthenticated()) {
//         return res.redirect("/user/login");
//       }
//       if (req.user && req.user.identity === "user") {
//         req.session.status = 403;
//         req.session.errorMessage = "You are not allow to access this page";
//         return res.redirect(`/user/dashboard/${req.user.username}/hotel_management`);
//       }
//       next();
//     },
//     async (req, res) => {
//       try {
//         const hotel_name = req.body.hotel_id;
//         const room_type = req.body.room_type;
//         const room_id = req.body.room_id;
//         const result = await userFuncs.addRoom(hotel_name, room_type, room_id);
//         req.flash(result);
//         return res.redirect(200).redirect("/hotel_management");
//       } catch (e) {
//         e.code = e.code ? e.code : 500;
//         req.session.errorMessage = e.message;
//         res.redirect("/hotel_management");
//       }
//     }
//   )
//   //TODO: delete room
// router.route("/user/dashboard/:username/hotel_management/:hotel_id/room/:room_id")
//   .delete((req, res, next) => {
//     if (!req.isAuthenticated()) {
//       return res.redirect("/user/login");
//     }
//     if (req.user && req.user.identity === "user") {
//       req.session.status = 403;
//       req.session.errorMessage = "You are not allow to access this page";
//       return res.redirect(`/user/dashboard/${req.user.username}/hotel_management/${hotel_id}/room`);
//     }
//     next();
//   },
//   async (req, res) => {
//     try {
//       const hotel_id = req.params.hotel_id;
//       const room_id = req.params.room_id;
//       const result = await hotelFuncs.deleteRoom(room_id, hotel_id);
//       req.flash({ successMessage: "Room deleted successfully" });
//       return res.redirect(200).redirect(`/user/dashboard/${username}/hotel_management/${hotel_id}/room`);
//     }
//     catch (e) {
//       e.code = e.code ? e.code : 500;
//       req.session.errorMessage = e.message;
//       return res.redirect(`/user/dashboard/${username}/hotel_management/${hotel_id}/room`);
//     }
//   }
//   )
//   .patch((req, res, next) => {
//     if (!req.isAuthenticated()) {
//       return res.redirect("/user/login");
//     }
//     if (req.user && req.user.identity === "user") {
//       req.session.status = 403;
//       req.session.errorMessage = "You are not allow to access this page";
//       return res.redirect(`/user/dashboard/${req.user.username}/hotel_management/${hotel_id}/room`);
//     }
//     next();
//   },
//   async (req, res) => {
//     try {
//       const hotel_id = req.params.hotel_id;
//       const room_id = req.params.room_id;
//       const result = await hotelFuncs.updateRoom(room_id, hotel_id);
//       req.flash({ successMessage: "Room updated successfully" });
//       return res.redirect(200).redirect(`/user/dashboard/${username}/hotel_management/${hotel_id}/room`);
//     }
//     catch (e) {
//       e.code = e.code ? e.code : 500;
//       req.session.errorMessage = e.message;
//       return res.redirect(`/user/dashboard/${username}/hotel_management/${hotel_id}/room`);
//     }
//   }
//   )
export default router;
