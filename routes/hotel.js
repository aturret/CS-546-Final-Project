import { Strategy as auth } from "passport-local";
import express, { Router } from "express";
import passport, { use } from "passport";
import bcrypt from "bcryptjs";
import * as userFuncs from "../data_model/User_Account.js";
import * as hotelFuncs from "../data_model/Hotel_Data.js";
import * as helper from "../helper.js";
import isAuth from "./user.js";

const router = express.Router();

export const isAuth = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.redirect("/user/login");
  }
  next();
};

export const isMgr = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.redirect("/user/login");
  }
  if (req.user && req.user.identity !== 'mgr') {
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


    if (errorMessage) return res.status(status).render("landpage", { errorMessage: errorMessage });
    return res.status(status).render("landpage");
  })
  //search hotel
  .post(async (req, res) => {
    const hotel_name = req.body.name;
    const hotel_city = req.body.city;
    const hotel_state = req.body.state;
    const hotel_zip = req.body.zip;
    try{
      const result = await hotelFuncs.searchHotel(hotel_name, hotel_city, hotel_state, hotel_zip);
      return res.status(200).render("searchHotelResult", { hotels: result });
    }
    catch(e){
      req.session.status = e.code ? e.code : 500;
      req.session.errorMessage = e.message;
      return res.redirect("/");
    }
  });

//TODO: Hotel detail page
router
  .route("/hotel/:hotel_id")
  .get(async (req, res) => {
    const hotel_id = req.params.hotel_id;
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
      return res.status(status).render("hotel", hotelInfo);
    }
    catch(e){
      req.session.status = e.code ? e.code : 500;
      req.session.errorMessage = e.message;
      return res.redirect("/");
    }
  })
  .post(isAuth, (req, res) => {});

//TODO: Room detail page
router.route("/hotel/:hotel_name/:room_id").get((req, res) => {});

router
  .route("/hotel/:hotelId/hotelManagement")
  .get(isAdmin, async (req, res) => {
    try {
      const hotelId = helper.checkId(req.params.hotelId, true);
      const hotel = await hotelFuncs.getHotel(hotelId);
      res.render('hotel_management', {hotel: hotel});
    } catch (e) {
      req.session.status = e.code ? e.code : 500;
      req.session.errorMessage = e.message;
      const previousUrl = req.headers.referer || '/hotel';
      res.redirect(previousUrl);
    }
  })
  .put(isAdmin, async (req, res) => {
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
  .get(isAdmin, async (req, res) => {
    const hotelId = helper.checkId(req.params.hotelId, true);
    const rooms = await hotelFuncs.getHotelRoom(hotelId);
    res.render('rooms', {rooms: rooms});
  })
  .post(isAdmin, async (req, res) => {
    try {
      const hotelId = helper.checkId(req.params.hotelId, true);
      const roomId = helper.checkId(req.body.roomIdInput, true);
      const roomNumber = helper.checkString(req.body.roomNumberInput, "room number", true);
      if(!/^\[0-9]{0,5}$/.test(roomNumber)) throw CustomException(`Invalid room number.`, true);
      const roomType = helper.checkString(req.body.roomTypeInput, "room type", true);
      
      const args = [hotelId, roomId, roomNumber];

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
  .get(isAdmin, async (req, res) => {
    try {
      const roomId = helper.checkId(req.params.roomId, true);
      const room = await hotelFuncs.getRoom(roomId);
      res.render('singleRoom', {room: room});
    } catch (e) {
      req.session.status = e.code ? e.code : 500;
      req.session.errorMessage = e.message;
      const previousUrl = req.headers.referer || '/hotel';
      res.redirect(previousUrl);
    }
  })
  .put(isAdmin, async (req, res) => {
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
  .delete(isAdmin, async (req, res) => {
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
  .get(isAdmin, async (req, res) => {
    try {
      const hotelId = helper.checkId(req.params.hotelId, true);
      const roomTypes = await hotelFuncs.getHotelRoomType(hotelId);
      res.render('roomtTypes', {roomTypes: roomTypes});
    } catch (e) {
      req.session.status = e.code ? e.code : 500;
      req.session.errorMessage = e.message;
      const previousUrl = req.headers.referer || '/hotel';
      res.redirect(previousUrl);
    }
  })
  .post(isAdmin, async (req, res) => {
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
  .put(isAdmin, async (req, res) => {
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
  .delete(isAdmin, async (req, res) => {
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
  .get(isAdmin, async (req, res) => {
    try {
      const hotelId = helper.checkId(req.params.hotelId, true);
      const hotel = await hotelFuncs.getHotel(hotelId);
      res.render('orders', {orders: hotel.orders});
    } catch (e) {
      req.session.status = e.code ? e.code : 500;
      req.session.errorMessage = e.message;
      const previousUrl = req.headers.referer || '/hotel/:hotelId/';
      res.redirect(previousUrl);
    }
  })

router
  .route("/hotel/:hotelId/hotelManagement/order/:orderId")
  .get(isAdmin, async (req, res) => {
    try {
      const orderId = helper.checkId(req.params.orderId, true);
      const hotel = await userFuncs.getOrderById(orderId);
      res.render('orderById', {orders: hotel.orders});
    } catch (e) {
      req.session.status = e.code ? e.code : 500;
      req.session.errorMessage = e.message;
      const previousUrl = req.headers.referer || '/hotel/:hotelId/';
      res.redirect(previousUrl);
    }
  })
  .put(isAdmin, async (req, res) => {
    try {
      const orderId = helper.checkId(req.params.orderId, true);
      const checkinDate = helper.checkDate(req.body.checkinDateInput, true);
      const checkoutDate = helper.checkDate(req.body.checkoutDateInput, true);
      const guest = helper.checkArray(req.body.guestInput, "guest", true);
      const price = helper.checkPrice(req.body.priceInput, true);
      const status = helper.checkStatus(req.body.statusInput, true);

      const updateOrderMessage = await userFuncs.updateOrder(orderId, checkinDate, checkoutDate, guest, price, status);
      req.flash(updateOrderMessage);
      res.redirect('/hotel/:hotelId/hotelManagement/order/:orderId');
    } catch (e) {
      req.session.status = e.code ? e.code : 500;
      req.session.errorMessage = e.message;
      const previousUrl = req.headers.referer || '/hotel/:hotelId/';
      res.redirect(previousUrl);
    }
  })
  .delete(isAdmin, async (req, res) => {
    try {
      const orderId = helper.checkId(req.params.orderId, true);
      const deleteOrderMessage = await userFuncs.deleteOrder(orderId);
      req.flash(deleteOrderMessage);
      res.redirect('/hotel/:hotelId/hotelManagement/order');
    } catch (e) {
      req.session.status = e.code ? e.code : 500;
      req.session.errorMessage = e.message;
      const previousUrl = req.headers.referer || '/hotel/:hotelId/';
      res.redirect(previousUrl);
    }
  })

router
  .route("/hotel/:hotelId/hotelManagement/review")
  .get(isAdmin, async (req, res) => {
    try {
      const hotelId = helper.checkId(req.params.hotelId, true);
      const hotel = await hotelFuncs.getHotel(hotelId);
      res.render('hotel_management', {hotel: hotel});
    } catch (e) {
      req.session.status = e.code ? e.code : 500;
      req.session.errorMessage = e.message;
      const previousUrl = req.headers.referer || '/hotel/:hotelId/';
      res.redirect(previousUrl);
    }
  })
export default router;
