import { Strategy as auth } from "passport-local";
import express, { Router } from "express";
import passport from "passport";
import bcrypt from "bcryptjs";
import * as userFuncs from "../data_model/User_Account.js";
import * as helper from "../helper.js";
import isAuth from "./user.js";

const router = express.Router();

//TODO: Hotel searching main page
router
  .route("/")
  .get((req, res) => {})
  .post((req, res) => {
    //error handling, rendering for error page as well
  });

//TODO: Hotel detail page
router
  .route("/:hotel_name")
  .get((req, res) => {})
  .post(isAuth, (req, res) => {});

//TODO: Room detail page
router.route("/:hotel_name/:room_id").get((req, res) => {});

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
        const manager = req.body.manager;
        const roomType = req.body.roomType;
        const review = req.body.review;

        const result = await userFuncs.editHotel(
          hotel_id,
          hotel_name,
          hotel_street,
          hotel_city,
          hotel_state,
          hotel_zip,
          hotel_phone,
          hotel_email,
          hotel_picture,
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
