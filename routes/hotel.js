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


const router = express.Router();

// functions for checking session authentication
export const isMgr = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.redirect("/user/login");
  }
  if (req.user && req.user.identity === 'user') {
    req.flash("You are not allow to access this page")
    return res.redirect("/user/dashboard");
  }
  if (req.user.identity === 'manager' && req.user.hotel !== req.params.hotelId) {
    req.flash("You are not allow to access this page")
    return res.redirect("/user/dashboard");
  }
  next();
};

export const isAdmin = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.redirect("/user/login");
  }
  if (req.user && req.user.identity !== 'admin') {
    req.flash("You are not allow to access this page")
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
        hotelInfo.hotelPicture = result[i].pictures;
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
  .get(async (req, res) =>
  {
    const reviewId = req.params.reviewId;
    try{
      let review = undefined;
      if (!req.session)
      {
        req.session = {};
        review = await userFuncs.getReviewById(reviewId);
        console.log(review);
      }
      else{
        const tempReview = await Review();
        review = await tempReview.findOne({_id: new ObjectId(reviewId)});
        review.reviewRating = review.rating;
        review.rating = null;
        review.reviewComment = review.comment;
        review.comment = null;
        review.reviewUpvotes = review.upvote;
        review.upvote = null;
        review.reviewDownvotes = review.downvote;
        review.hotelId = review.hotel_id;
        review.reviewId = review._id;
        if (req.session.hotelInfo && req.session.hotelInfo.reviewList && req.session.hotelInfo.reviewList.includes(reviewId)) {
          review = Object.assign(review, req.session.hotelInfo);
        }
        else{
          req.session.hotelInfo = {};
          //get hotel info
          const hotelInfo = await hotelFuncs.getHotel(review.hotel_id);
          review.hotelName = hotelInfo.name;
          review.hotelPhoto = hotelInfo.pictures;
          review.hotelRating = hotelInfo.overall_rating;
          review.hotelAddress = hotelInfo.street + ", " + hotelInfo.city + ", " + hotelInfo.state + ", " + hotelInfo.zip_code;
          review.hotelPhone = hotelInfo.phone;
          review.hotelEmail = hotelInfo.email;
        }
        if (req.session.userInfo && req.session.userInfo.reviewList && req.session.userInfo.reviewList.includes(reviewId)) {
          review = Object.assign(review, req.session.userInfo);
        }
        else{
          //get user info
          req.session.userInfo = {};
          const tempAccount = await Account();
          const userInfo = await tempAccount.findOne({_id: new ObjectId(review.user_id)});
          review.user_id = null;
          review.userAvatar= userInfo.avatar;
          review.reviewUserName = userInfo.username;
        }
        review.title = "Review";
      }
      const errorMessage = req.session && req.session.errorMessage || null;
      const status = req.session && req.session.status || 200;
      if (req.session) {
        req.session.status = null;
        req.session.errorMessage = null;
      }
      if (errorMessage)
      {
        review.status = status;
        review.errorMessage = errorMessage;
        return res.status(status).render("reviews", review);
      }
      review.reviewId = reviewId;
      review._id = null;
      console.log(review)
      return res.status(status).render("reviews", review);
  }
  catch(e){
    req.session.status = e.code ? e.code : 500;
    req.session.errorMessage = e.message;
    return res.redirect("/");
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
    console.log("patch vote fired") 
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
      hotelInfo.hotelPhoto = hotel.pictures;
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
      const hotel = await hotelFuncs.getHotel(hotel_id);
      const hotelInfo = {};
      hotelInfo.hotelId = hotel.hotel_id;
      hotelInfo.hotelName = hotel.hotel_name;
      hotelInfo.hotelPhoto = hotel.pictures;
      hotelInfo.hotelRating = hotel.rating;
      hotelInfo.hotelAddress = hotel.address + ", " + hotel.city + ", " + hotel.state + ", " + hotel.zip;
      hotelInfo.hotelPhone = hotel.phone;
      hotelInfo.hotelEmail = hotel.email;
      hotelInfo.roomType = hotel.room_type;
      //get hotel room
      const roomTypes = await hotelFuncs.getHotelRoomType(hotel_id);
      hotelInfo.roomType = roomTypes;

      //get hotel review
      const reviews = await hotelFuncs.getHotelReview(hotel_id);
      hotelInfo.reviews = reviews;
      return res.status(status).render("hotel", {hotelInfo, title: hotel.name});
    }
    catch(e){
      req.session.status = e.code ? e.code : 500;
      req.session.errorMessage = e.message;
      return res.redirect("/");
    }
  })

router
  .route("/hotel/:hotelId/searchResult")
  .get(async (req, res) => {
    try {
      const hotelId = helper.checkId(req.params.hotelId, true);
      const checkin = helper.checkDate(req.body.checkin, true);
      const checkout = helper.checkDate(req.body.checkout, true);

      const searchResult = await hotelFuncs.checkRoomAvailabilityOrder(hotelId, checkin, checkout);
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
  .post(isAuth, async (req, res) => {
    try {
      const roomTypeId = helper.checkId(req.body.roomTypeIdInput, true);

      const hotelId = helper.checkId(req.params.hotelId, true);
      const userId = helper.checkId(req.body.userIdInput, true);

      const hotel = await hotelFuncs.getHotel(hotelId);
      const hotelName = hotel.name;

      const checkin = helper.checkId(req.body.checkinInput, true);
      const checkout = helper.checkId(req.body.checkoutInput, true);
      const guest1FisrtName = helper.checkString(req.params.guest1FisrtNameInput, true);
      const guest1LastName = helper.checkString(req.params.guest1LastNameInput, true);
      const guest2FisrtName = helper.checkString(req.params.guest2FisrtNameInput, true);
      const guest2LastName = helper.checkString(req.params.guest2LastNameInput, true);

      const roomId = hotelFuncs.addOrderByRoomType(roomTypeId, checkin, checkout); 

      const guests = [
        {
          firstName: guest1FisrtName,
          lastName: guest1LastName
        },
        {
          firstName: guest2FisrtName,
          lastName: guest2LastName
        }
      ];

      const roomType = await hotelFuncs.getHotelRoomType(roomTypeId);
      const days = moment(checkout).diff(moment(checkin), 'days');
      const price = roomType.price * days;
      const status = 'pending';

      const args = [hotelId, userId, roomId, hotelName, checkin, checkout, guests, price, status];
      const addOrder = await userFuncs.addOrder(args);
      if (addOrder) req.flash('Add order successfullly');
      res.redirect('/hotel/:hotelId/searchResult');
    } catch (e) {
      if (!e.code) {
        req.session.status = 500;
      } else {
        req.session.status = e.code;
      }
      req.session.errorMessage = e.message;
      return res.redirect("/hotel/:hotelId/searchResult");
    }

  })

router
  .route("/hotel/:hotelId/hotelManagement")
  .get(isMgr, async (req, res) => {
    try {
      const hotelId = helper.checkId(req.params.hotelId, true);
      const hotel = await hotelFuncs.getHotel(hotelId);
      res.render('hotel_management', {hotel: hotel, title: `Hotel Control Panel`});
    } catch (e) {
      req.session.status = e.code ? e.code : 500;
      req.session.errorMessage = e.message;
      const previousUrl = req.headers.referer || '/hotel';
      res.redirect(previousUrl);
    }
  })
  .put(isMgr, async (req, res) => {
    try {
      const hotelId = req.params.hotelId;
      const hotelName = req.body.hotelName;
      const hotelStreet = req.body.hotelStreet;
      const hotelCity = req.body.hotelCity;
      const hotelState = req.body.hotelState;
      const hotelZipCode = req.body.hotelZipCode;
      const hotelPhone = req.body.hotelPhone;
      const hotelEmail = req.body.hotelEmail;
      const hotelPicture = req.body.hotelPicture;
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
      return res.redirect(200).redirect("/hotel/:hotelId/hotelManagement");
    } catch (e) {
      e.code = e.code ? e.code : 500;
      req.session.errorMessage = e.message;
      res.redirect("/hotel_management");
    }
  })
  .delete(isAdmin, async (req, res) => {
    try {
      const hotelId = helper.checkId(req.params.hotelId, true);
      const message = await hotelFuncs.deleteHotel(hotelId);
      req.flash(message);
      return res.redirect(200).redirect("/hotel");
    } catch (e) {
      req.session.status = e.code ? e.code : 500;
      req.session.errorMessage = e.message;
      const previousUrl = req.headers.referer || '/hotel';
      res.redirect(previousUrl);
    }
  })

router
  .route("/hotel/:hotelId/hotelManagement/room")
  .get(isMgr, async (req, res) => {
    const hotelId = helper.checkId(req.params.hotelId, true);
    const rooms = await hotelFuncs.getHotelRoom(hotelId);
    const roomTypes = await hotelFuncs.getHotelRoomType(hotelId);
    res.render('rooms', {rooms: rooms, roomTypes: roomTypes, title: `Room Control Panel`});
  })
  .post(isMgr, async (req, res) => {
    try {
      const hotelId = helper.checkId(req.params.hotelId, true);
      const roomId = helper.checkId(req.body.roomIdInput, true);
      const roomNumber = helper.checkString(req.body.roomNumberInput, "room number", true);
      if(!/^\[0-9]{0,5}$/.test(roomNumber)) throw CustomException(`Invalid room number.`, true);
      const roomType = helper.checkString(req.body.roomTypeInput, "room type", true);
      
      const args = [hotelId, roomId, roomNumber, roomType];

      const addRoomMessage = hotelFuncs.addRoom(args);
      req.flash(addRoomMessage);
      res.redirect('/hotel/:hotelId/hotelManagement/room');
    } catch (e) {
      req.session.status = e.code ? e.code : 500;
      req.session.errorMessage = e.message;
      const previousUrl = req.headers.referer || '/hotel';
      res.redirect(previousUrl);
    }
  })

router
  .route("/hotel/:hotelId/hotelManagement/room/:roomId")
  .get(isMgr, async (req, res) => {
    try {
      const roomId = helper.checkId(req.params.roomId, true);
      const room = await hotelFuncs.getRoom(roomId);
      res.render('singleRoom', {room: room, title: `Room Control Panel`});
    } catch (e) {
      req.session.status = e.code ? e.code : 500;
      req.session.errorMessage = e.message;
      const previousUrl = req.headers.referer || '/hotel';
      res.redirect(previousUrl);
    }
  })
  .put(isMgr, async (req, res) => {
    try {
      const hotelId = helper.checkId(req.params.hotelId, true);
      const roomId = helper.checkId(req.params.roomId, true);
      const typeNme = helper.checkString(req.body.roomTypeInput, "room type", true);
      const roomNum = helper.checkId(req.body.roomNum, 'room number', true);
      if(!/[0-9]{0,5}$/.test(roomNum)) throw CustomException(`Invalid room number.`, true);
      
      const updateRoomMessage = await hotelFuncs.updateRoom(hotelId, roomId, typeNme, roomNum);
      req.flash(updateRoomMessage);
      res.redirect('/hotel/:hotelId/hotelManagement/room/:roomId');
    } catch (e) {
      req.session.status = e.code ? e.code : 500;
      req.session.errorMessage = e.message;
      const previousUrl = req.headers.referer || '/hotel';
      res.redirect(previousUrl);
    }
  })
  .delete(isMgr, async (req, res) => {
    try {
      const hotelId = helper.checkId(req.params.hotelId, true);
      const roomId = helper.checkId(req.body.roomIdInput, true);
      
      const deleteRoomMessage = await hotelFuncs(hotelId, roomId);
      req.flash(deleteRoomMessage);
      res.redirect('/hotel/:hotelId/hotelManagement/room');
    } catch (e) {
      req.session.status = e.code ? e.code : 500;
      req.session.errorMessage = e.message;
      const previousUrl = req.headers.referer || '/hotel';
      res.redirect(previousUrl);
    }
  })

router
  .route("/hotel/:hotelId/hotelManagement/roomtype")
  .get(isMgr, async (req, res) => {
    try {
      const hotelId = helper.checkId(req.params.hotelId, true);
      const roomTypes = await hotelFuncs.getHotelRoomType(hotelId);
      res.render('roomtTypes', {roomTypes: roomTypes, title: `Room Type Control Panel`});
    } catch (e) {
      req.session.status = e.code ? e.code : 500;
      req.session.errorMessage = e.message;
      const previousUrl = req.headers.referer || '/hotel';
      res.redirect(previousUrl);
    }
  })
  .post(isMgr, async (req, res) => {
    try {
      let args = [];
      args[0] = helper.checkId(req.params.hotelId, true);
      args[1] = helper.checkString(req.body.roomTypeNameInput, "room type name", true);
      args[2] = helper.checkWebsite(req.body.roomTypePictureInput, true);
      args[3] = helper.checkPrice(req.body.price, true);
      args[4] = req.body.rooms ? helper.checkArray(req.body.rooms, true) : [];

      const addRoomTypeMessage = await hotelFuncs.addRoomType(args);
      req.flash(addRoomTypeMessage);
      res.redirect('/hotel/:hotelId/hotelManagement/room');
    } catch (e) {
      req.session.status = e.code ? e.code : 500;
      req.session.errorMessage = e.message;
      const previousUrl = req.headers.referer || '/hotel';
      res.redirect(previousUrl);
    }
  })
  .put(isMgr, async (req, res) => {
    try {
      const roomTypeId = helper.checkId(req.body.roomTypeIdInput, true);
      const hotelId = helper.checkId(req.params.hotelId, true);
      const roomTypeName = helper.checkString(req.body.roomTypeNameInput, "room type name", true);
      const price = helper.checkPrice(req.body.price, true);
      const picture = req.body.rooms ? helper.checkArray(req.body.rooms, true) : [];

      const updateRoomTypeMessage = await hotelFuncs.updateRoomType(roomTypeId, hotelId, roomTypeName, price, picture);
      req.flash(updateRoomTypeMessage);
      res.redirect('/hotel/:hotelId/hotelManagement/room');
    } catch (e) {
      req.session.status = e.code ? e.code : 500;
      req.session.errorMessage = e.message;
      const previousUrl = req.headers.referer || '/hotel';
      res.redirect(previousUrl);
    } 
  })
  .delete(isMgr, async (req, res) => {
    try {
      const roomTypeId = helper.checkId(req.body.roomTypeIdInput, true);
      const hotelId = helper.checkId(req.params.hotelId, true);
      const deleteRoomTypeMessage = await hotelFuncs.deleteRoomType(roomTypeId, hotelId);
      req.flash(deleteRoomTypeMessage);
      res.redirect('/hotel/:hotelId/hotelManagement/room');
    } catch (e) {
      req.session.status = e.code ? e.code : 500;
      req.session.errorMessage = e.message;
      const previousUrl = req.headers.referer || '/hotel';
      res.redirect(previousUrl);
    }
  })

router
  .route("/hotel/:hotelId/hotelManagement/order")
  .get(isMgr, async (req, res) => {
    try {
      const hotelId = helper.checkId(req.params.hotelId, true);
      const hotel = await hotelFuncs.getHotel(hotelId);
      res.render('orders', {orders: hotel.orders, title: `Order Control Panel`});
    } catch (e) {
      req.session.status = e.code ? e.code : 500;
      req.session.errorMessage = e.message;
      const previousUrl = req.headers.referer || '/hotel';
      res.redirect(previousUrl);
    }
  })
  .post(isMgr, async (req, res) => {
    try {
      const hotelId = helper.checkId(req.params.hotelId, true);
      const userId = helper.checkId(req.body.userIdInput, true);
      const roomId = helper.checkId(req.body.roomIdInput, true);

      const hotel = await hotelFuncs.getHotel(hotelId);
      const hotelName = hotel.name;

      const checkin = helper.checkId(req.body.checkinInput, true);
      const checkout = helper.checkId(req.body.checkoutInput, true);
      const guest1FisrtName = helper.checkString(req.body.guest1FisrtNameInput, true);
      const guest1LastName = helper.checkString(req.body.guest1LastNameInput, true);
      const guest2FisrtName = helper.checkString(req.body.guest2FisrtNameInput, true);
      const guest2LastName = helper.checkString(req.body.guest2LastNameInput, true);

      const guests = [
        {
          firstName: guest1FisrtName,
          lastName: guest1LastName
        },
        {
          firstName: guest2FisrtName,
          lastName: guest2LastName
        }
      ];

      const price = helper.checkPrice(req.body.priceInput, true);
      const status = 'pending';

      const args = [hotelId, userId, roomId, hotelName, checkin, checkout, guests, price, status];

      const addOrder = await userFuncs.addOrder(args);
      if (addOrder) req.flash('Add order successfullly');
      res.redirect('/hotel/:hotelId/hotelManagement/order');
    } catch (e) {
      req.session.status = e.code ? e.code : 500;
      req.session.errorMessage = e.message;
      const previousUrl = req.headers.referer || '/hotel';
      res.redirect(previousUrl);
    }
  })

router
  .route("/hotel/:hotelId/hotelManagement/order/:orderId")
  .get(isMgr, async (req, res) => {
    try {
      const orderId = helper.checkId(req.params.orderId, true);
      const order = await userFuncs.getOrderById(orderId);
      res.render('singleOrder', {orders: order, title: `Order Control Panel`});
    } catch (e) {
      req.session.status = e.code ? e.code : 500;
      req.session.errorMessage = e.message;
      const previousUrl = req.headers.referer || '/hotel';
      res.redirect(previousUrl);
    }
  })
  // .put(isMgr, async (req, res) => {
  //   try {
  //     const hotel_id = helper.checkId(req.params.hotelId, true);
  //     const orderId = helper.checkId(req.params.orderId, true);
  //     const checkinDate = helper.checkDate(req.body.checkinDateInput, true);
  //     const checkoutDate = helper.checkDate(req.body.checkoutDateInput, true);
  //     const guest = helper.checkArray(req.body.guestInput, "guest", true);
  //     const price = helper.checkPrice(req.body.priceInput, true);
  //     const status = helper.checkStatus(req.body.statusInput, true);

  //     const updateOrderMessage = await userFuncs.updateOrder(orderId, checkinDate, checkoutDate, guest, price, status);
      
  //     req.flash(updateOrderMessage);
  //     res.redirect('/hotel/:hotelId/hotelManagement/order/:orderId');
  //   } catch (e) {
  //     req.session.status = e.code ? e.code : 500;
  //     req.session.errorMessage = e.message;
  //     const previousUrl = req.headers.referer || '/hotel';
  //     res.redirect(previousUrl);
  //   }
  // })
  .delete(isMgr, async (req, res) => {
    try {
      const orderId = helper.checkId(req.params.orderId, true);
      const deleteOrderMessage = await userFuncs.deleteOrder(orderId);
      req.flash(deleteOrderMessage);
      res.redirect('/hotel/:hotelId/hotelManagement/order');
    } catch (e) {
      req.session.status = e.code ? e.code : 500;
      req.session.errorMessage = e.message;
      const previousUrl = req.headers.referer || '/hotel';
      res.redirect(previousUrl);
    }
  })

// route of rendering the single review page by Jichen.
//
// router
// .route("/reviews/:reviewId")
// .get(async (req, res) => {
//   try {
//     const theUser = req.user;
//     const reviewId = helper.checkId(req.params.reviewId, true);
    
//     const review = await userFuncs.getReviewById(reviewId);
//     const user = await userFuncs.getUserById(review.user_id);
//     const hotel = await hotelFuncs.getHotel(review.hotel_id);
//     let editable = false;
//     if(theUser){
//     const theUserId = await userFuncs.getUser(theUser.username);
//     if(theUser.identity==='admin' || review.user_id === theUserId._id){
//       editable = true;
//     }}
//     const reviewInfo = {
//       reviewId: review._id,
//       orderId: review.order_id,
//       reviewRating: review.rating,
//       reviewUpvotes: review.upvote,
//       reviewDownvotes: review.downvote,
//       hotelName: hotel.name,
//       hotelPhoto: hotel.pictures,
//       hotelRating: hotel.overall_rating,
//       hotelAddress: hotel.street + ", " + hotel.city + ", " + hotel.state + ", " + hotel.zip_code,
//       hotelPhone: hotel.phone,
//       hotelEmail: hotel.email,
//       reviewTitle: `${user.username}'s Review`,
//       hotelId: review.hotel_id,
//       reviewComment: review.comment,
//       username: user.username,
//       userAvatar: user.avatar,
//       reviewUserId: review.user_id,
//       title: 'Review Control Panel',
//       editable: editable
//     };
//     res.render('reviews', reviewInfo);
//   } catch (e) {
//     console.log(e.message);
//     req.session.status = e.code ? e.code : 500;
//     req.session.errorMessage = e.message;
//     const previousUrl = req.headers.referer || '/hotel';
//     res.redirect(previousUrl);
//   }
// })

router
  .route("/hotel/:hotelId/hotelManagement/review")
  .get(isMgr, async (req, res) => {
    try {
      const hotelId = helper.checkId(req.params.hotelId, true);
      const hotelReviews = await hotelFuncs.getHotelReview(hotelId);
      hotelReviews.title = `Review Control Panel`;
      res.render('hotelReviews', hotelReviews);
    } catch (e) {
      req.session.status = e.code ? e.code : 500;
      req.session.errorMessage = e.message;
      const previousUrl = req.headers.referer || '/hotel';
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
      if (hotelReviews) req.flash('Add review successfully');
      res.redirect('/hotel/:hotelId/hotelManagement/review');
    } catch (e) {
      req.session.status = e.code ? e.code : 500;
      req.session.errorMessage = e.message;
      const previousUrl = req.headers.referer || '/hotel';
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
      res.redirect('/hotel/:hotelId/hotelManagement/review');
    } catch (e) {
      req.session.status = e.code ? e.code : 500;
      req.session.errorMessage = e.message;
      const previousUrl = req.headers.referer || '/hotel';
      res.redirect(previousUrl);
    }
  })
  .delete(isAdmin, async (req, res) => {
    try {
      const reviewId = helper.checkId(req.body.reviewIdInput, true);
      const deleteReviewMessage = await userFuncs.deleteReview(reviewId);
      req.flash(deleteReviewMessage);
      res.redirect('/hotel/:hotelId/hotelManagement/review');
    } catch (e) {
      req.session.status = e.code ? e.code : 500;
      req.session.errorMessage = e.message;
      const previousUrl = req.headers.referer || '/hotel';
      res.redirect(previousUrl);
    }
  })

router
  .route("/hotel/:hotelId/hotelManagement/manager")
  .get(isMgr, async (req, res) => {
    try {
      const hotelId = helper.checkId(req.params.hotelId, true);

      const hotel = await hotelFuncs.getHotel(hotelId);
      res.render('hotelManagers', {managers: hotel.managers, title: `Manager Control Panel`});
    } catch (e) {
      req.session.status = e.code ? e.code : 500;
      req.session.errorMessage = e.message;
      const previousUrl = req.headers.referer || '/hotel';
      res.redirect(previousUrl);
    }
  })
  .post(isMgr, async (req, res) => {
    try {
      // const mgrName = helper.checkNameString(req.body.mgrNameInput, "manager username", true);
      const userName = helper.checkNameString(req.body.userNameInput, "user username", true);
      const hotelId = helper.checkId(req.params.hotelId, true);

      const addMgrMessage = await userFuncs.addMgr(req.user.username, userName, hotelId);
      req.flash(addMgrMessage);
      res.redirect('/hotel/:hotelId/hotelManagement/manager');
    } catch (e) {
      req.session.status = e.code ? e.code : 500;
      req.session.errorMessage = e.message;
      const previousUrl = req.headers.referer || '/hotel';
      res.redirect(previousUrl);
    }
  })
  .delete(isMgr, async (req, res) => {
    try {
      const respondentName = helper.checkNameString(req.body.respondentNameInput, "user username", true);
      const hotelId = helper.checkId(req.params.hotelId, true);

      const deleteReviewMessage = await userFuncs.deleteMgr(req.user.username, respondentName, hotelId);
      req.flash(deleteReviewMessage);
      res.redirect('/hotel/:hotelId/hotelManagement/review');
    } catch (e) {
      req.session.status = e.code ? e.code : 500;
      req.session.errorMessage = e.message;
      const previousUrl = req.headers.referer || '/hotel';
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
