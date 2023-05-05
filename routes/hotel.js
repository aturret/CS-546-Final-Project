import { Strategy as auth } from "passport-local";
import express, { Router } from "express";
import passport from "passport";
import bcrypt from "bcryptjs";
import * as userFuncs from "../data_model/User_Account.js";
import * as hotelFuncs from "../data_model/Hotel_Data.js";
import * as helper from "../helper.js";
import isAuth from "./user.js";

const router = express.Router();

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

//TODO: load hotel information for the manager
router.route("/hotel_management").get(
  (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.redirect("/user/login");
    }
    if (req.user && req.user.identity === "user") {
      req.flash("You are not allow to access this page");
      return res.redirect("/user/dashboard");
    }
    next();
  },
  async (req, res) => {
    try {
      req.user.username = helper.checkString(req.user.username);
      const user = await userFuncs.getUser(req.user.username);
      if (req.session && req.session.status) {
        user.status = req.session.status;
        user.errorMessage = req.session.errorMessage;
        req.session.status = null;
        req.session.errorMessage = null;
      }
      return res.status(200).render("hotel_management", user);
    } catch (e) {
      //customized error are thrown. if e.code exist its a customized error. Otherwise, its a server error.
      if (!e.code) {
        req.session.status = 500;
      } else {
        req.session.status = e.code;
      }
      req.session.errorMessage = e.message;
      res.redirect("/user/dashboard/:username");
    }
  }
);
//add room type for the hotel, hotel mnr or admin only
router.route("/hotel_management/add_room_type").post(
  (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.redirect("/user/login");
    }
    if (req.user && req.user.identity === "user") {
      req.flash("You are not allow to access this page");
      return res.redirect("/user/dashboard");
    }
    next();
  },
  async (req, res) => {
    try {
      const hotel_name = req.body.hotel_name;
      const room_type = req.body.room_type;
      const room_price = req.body.room_price;
      const room_picture = req.body.room_picture
        ? req.body.room_picture
        : undefined;
      const rooms = req.body.rooms ? req.body.rooms : [];
      const result = await userFuncs.addRoomType(
        hotel_name,
        room_type,
        room_price,
        room_picture,
        rooms
      );
      req.flash({ successMessage: "Room type added successfully" });
      return res.redirect(200).redirect("/hotel_management");
    } catch (e) {
      e.code = e.code ? e.code : 500;
      req.session.errorMessage = e.message;
      res.redirect("/hotel_management");
    }
  }
);
//add room for the hotel, hotel mnr or admin only
router
  .route("/hotel_management/add_room")
  .post(
    (req, res, next) => {
      if (!req.isAuthenticated()) {
        return res.redirect("/user/login");
      }
      if (req.user && req.user.identity === "user") {
        req.flash("You are not allow to access this page");
        return res.redirect("/user/dashboard");
      }
      next();
    },
    async (req, res) => {
      try {
        const hotel_name = req.body.hotel_id;
        const room_type = req.body.room_type;
        const room_id = req.body.room_id;
        const result = await userFuncs.addRoom(hotel_name, room_type, room_id);
        req.flash(result);
        return res.redirect(200).redirect("/hotel_management");
      } catch (e) {
        e.code = e.code ? e.code : 500;
        req.session.errorMessage = e.message;
        res.redirect("/hotel_management");
      }
    }
  )
  //TODO: edit hotel information
  .put(
    (req, res, next) => {
      if (!req.isAuthenticated()) {
        return res.redirect("/user/login");
      }
      if (req.user && req.user.identity === "user") {
        req.flash("You are not allow to access this page");
        return res.redirect("/user/dashboard");
      }
      next();
    },
    async (req, res) => {
      try {
        const hotel_id = req.body.hotel_id;
        const hotel_name = req.body.hotel_name;
        const hotel_street = req.body.hotel_street;
        const hotel_city = req.body.hotel_city;
        const hotel_state = req.body.hotel_state;
        const hotel_zip = req.body.hotel_zip;
        const hotel_phone = req.body.hotel_phone;
        const hotel_email = req.body.hotel_email;
        const hotel_picture = req.body.hotel_picture;
        const facilities = req.body.facilities;
        const manager = req.body.manager;
        const rooms = req.body.rooms;
        const roomType = req.body.roomType;
        const review = req.body.review;

        const result = await hotelFuncs.updateHotel(
          hotel_id,
          hotel_name,
          hotel_street,
          hotel_city,
          hotel_state,
          hotel_zip,
          hotel_phone,
          hotel_email,
          hotel_picture,
          rooms,
          facilities,
          manager,
          roomType,
          review
        );
        req.flash(result);
        return res.redirect(200).redirect("/hotel_management");
      } catch (e) {
        e.code = e.code ? e.code : 500;
        req.session.errorMessage = e.message;
        res.redirect("/hotel_management");
      }
    }
  );
export default router;
