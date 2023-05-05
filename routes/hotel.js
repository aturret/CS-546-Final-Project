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


export default router;
