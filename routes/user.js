import { Strategy as auth } from "passport-local";
import express from "express";
import passport from "passport";
import formidable from "formidable";
import bcrypt from "bcryptjs";
import * as userFuncs from "../data_model/User_Account.js";
import * as helper from "../helper.js";
import { CustomException } from "../helper.js";
import { upload } from "../helper.js";
import {Order, hotelReg, Room, RoomType}from "../Mongo_Connections/mongoCollections.js";
const router = express.Router();
import * as hotelFuncs from "../data_model/Hotel_Data.js";
import path from "path";
import moment from "moment";
import {fileURLToPath} from 'url';
import {dirname} from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
  if (req.user && req.user.identity === 'user') {
    req.flash("errorMessage", "You are not allow to access this page")
    return res.redirect(`/user/dashboard/${req.user.username}`);
  }
  if (req.user.identity === 'manager' && req.user.hotel !== req.params.hotelId) {
    req.flash("errorMessage", "You are not allow to access this page")
    return res.redirect(`/user/dashboard/${req.user.username}`);
  }
  next();
};

export const isAdmin = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.redirect("/user/login");
  }
  if (req.user && req.user.identity !== 'admin') {
    req.flash("errorMessage", "You are not allow to access this page")
    return res.redirect(`/user/dashboard/${req.user.username}`);
  }
  next();
};

router
  .route("/login")
  .get(
    //check if user is already logged in
    (req, res, next) => {
      if (req.isAuthenticated()) {
        return res.redirect(`/dashboard/${req.user.username}`);
      }
      next();
    },
    (req, res) => {
      const error = req.flash("error");
      console.log(error);
      return res.render("login",{title: "Login", errorMessage: error});
    }
  )
  .post(
    //auth
    await passport.authenticate("login", {
      failureRedirect: "/user/login",
      failureFlash: true,
    }),
    (req, res) => {
      return res.redirect("/");
    }
  );

router
  .route("/register")
  .get((req, res) => {
    const code = req.session && req.session.status ? req.session.status : 200;
    const error =
      req.session && req.session.errorMessage
        ? req.session.errorMessage
        : undefined;
    if (req.session) req.session.errorMessage = undefined;
    if (req.session) req.session.status = undefined;
    return res.status(code).render("register", { errorMessage: error , title: "Register"});
  })
  .post(async (req, res) => {
    const user = req.body;
    console.log(user);
    try {
      user.username = helper.checkString(user.username, "username", true);
      
      user.avatar = user.avatar
        ? helper.checkWebsite(user.avatar, true)
        : undefined;
      user.firstNameInput = helper.checkNameString(
        user.firstNameInput,
        "first name",
        true
      );
      user.lastNameInput = helper.checkNameString(
        user.lastNameInput,
        "last name",
        true
      );
      user.phone = user.phone ? helper.checkPhone(user.phone, true) : undefined;
      user.passwordInput = helper.checkPassword(user.passwordInput, true);
      user.emailAddressInput = helper.checkEmail(user.emailAddressInput, true);

      const newUser = await userFuncs.create(
        'user',
        user.username,
        user.avatar,
        user.firstNameInput,
        user.lastNameInput,
        user.phone,
        user.passwordInput,
        user.emailAddressInput
      );

      return res.redirect("/user/login");
    } catch (e) {
      if (!e.code) {
        req.session.status = 500;
      } else {
        req.session.status = e.code;
      }
      req.session.errorMessage = e.message;
      return res.redirect("/user/register");
    }
  });

router.route("/dashboard/:username").get(isAuth, async (req, res) => {
  try {
    req.user.username = helper.checkString(req.user.username, "username", true);
    const user = await userFuncs.getUser(req.user.username);
    if (req.session && req.session.errorMessage) {
      user.errorMessage = req.session.errorMessage;
      req.session.errorMessage = null;
      const status = req.session.status;
      req.session.status = null;
      return res.status(status).render("dashboard", {user, title: "Dashboard"});
    }
    return res.status(200).render("dashboard", user);
  } catch (e) {
    if (!e.code) {
      req.session.status = 500;
    } else {
      req.session.status = e.code;
    }
    req.session.errorMessage = e.message;
    return res.redirect("/user/register");
  }
});

//TODO: get route for dashboard/:username/order_history
router.route("/dashboard/:username/order_history").get(isAuth, async (req, res) => {
  try {
    const username = helper.checkString(req.params.username, "username", true);
    const user = await userFuncs.getUser(req.user.username);
    const orders = await userFuncs.getOrder(username);
    return res.status(200).render("orders", { user: user, orders: orders, title: "Order History" });
  } catch (e) {
    if (!e.code) {
      req.session.status = 500;
    } else {
      req.session.status = e.code;
    }
    req.session.errorMessage = e.message;
    return res.redirect("/user/register");
  }
});

//TODO: ask which implementation is better   TODO: edit password as well
router
  .route("/dashboard/:username/edit_info")
  .put(isAuth, 
    upload.single("avatar"), 
    async (req, res, next) => {
    if (req.file) {
      req.body.avatar = `http://localhost:3000/public/uploads/${req.file.filename}`;
    }
    next();
  }, 
  async (req, res) => {
    try {
      req.body.username = helper.checkString(
        req.body.username,
        "username",
        true
      );
      req.body.userFirstNameInput = helper.checkNameString(
        req.body.userFirstNameInput,
        "first name",
        true
      );
      req.body.userLastNameInput = helper.checkNameString(
        req.body.userLastNameInput,
        "last name",
        true
      );      
      req.body.userPhoneInput = helper.checkPhone(req.body.userPhoneInput, true);
      req.body.userEmailInput = helper.checkEmail(req.body.userEmailInput, true);
      let set = {
        username: req.body.username,
        avatar: req.body.avatar,
        firstName: req.body.userFirstNameInput,
        lastName: req.body.userLastNameInput,
        phone: req.body.userPhoneInput,
        email: req.body.userEmailInput,
      };
      // if (req.body.avatar === undefined || req.body.avatar === "") { delete set.avatar; }
      const user = await userFuncs.updateUser(req.user.username, set);
      return res.redirect(`/user/dashboard/${req.user.username}`);
    } catch (e) {
      console.log(e);
      if (!e.code) {
        req.session.status = 500;
      } else {
        req.session.status = e.code;
      }
      req.session.errorMessage = e.message;
      res.redirect(`/user/dashboard/${req.user.username}`);
    }
  });

router
  .route("/dashboard/:username/change_password")
  .put(isAuth, async (req, res) => {
    try {
      req.body.userPasswordInput = helper.checkPassword( req.body.userPasswordInput, true);
      req.body.userNewPasswordInput = helper.checkPassword( req.body.userNewPasswordInput, true);
      req.body.userConfirmNewPasswordInput = helper.checkPassword( req.body.userConfirmNewPasswordInput, true);
      if (req.body.userNewPasswordInput !== req.body.userConfirmNewPasswordInput) {
        throw new CustomException("New password and confirm password do not match", true);
      }
      if (req.body.userPasswordInput === req.body.userNewPasswordInput) {
        throw new CustomException("New password and old password are the same", true);
      }
      const password = await bcrypt.hash(req.body.userNewPasswordInput, 12);
      let set = {
        password: password
      };
      const user = await userFuncs.updateUser(req.user.username, set);
      return res.redirect(`/user/dashboard/${req.user.username}`);
    } catch (e) {
      console.log(e);
      if (!e.code) {
        req.session.status = 500;
      } else {
        req.session.status = e.code;
      }
      req.session.errorMessage = e.message;
      res.redirect(`/user/dashboard/${req.user.username}`);
    }
  });
//TODO: this function suppose to create a new request to admin. You need to define a funciton in user_model to create a new collection for requests schema.
router
  .route("/dashboard/:username/upgrade")
  .post(
    async (req, res, next) =>
    {
      if(!req.isAuthenticated()) return res.redirect("/user/login");
      if(req.user.identity !== "user"){
        req.session.status = 403;
        req.session.errorMessage = "You are not allowed to register a hotel.";
        return res.redirect("/user/dashboard/:username")
      }
      next();
    },
  upload.array("hotelPhotoInput", 10), async(req, res, next) => {
    if (req.files.length > 0) {
      req.body.hotelPhotoInput = req.files.map((file) => {
        return `http://localhost:3000/public/uploads/${file.filename}`;
      });
    }
    next();
  },
  async (req, res) => {
    try {
      req.user.username = helper.checkString(req.user.username, "username", true);      
      //check if already have request
      let permission = false
      permission = await userFuncs.getRequest(req.user.username);
      if(!permission)
      {
        req.session.status = 403;
        req.session.errorMessage = "You already have a request.";
        return res.redirect("/user/dashboard/:username");
      }
      const hotelName = helper.checkString(req.user.hotelNameInput, "name", true);
      const email = helper.checkEmail(req.user.hotelEmailInput, true);
      const phone = helper.checkPhone(req.user.hotelPhoneInput, true);
      const street = helper.checkString(req.user.hotelStreetInput, "street", true);
      const city = helper.checkString(req.user.hotelCityInput, "city", true);
      const state = helper.checkString(req.user.hotelStateInput, "state", true);
      const zip_code = helper.checkZip(req.user.hotelZipcodeInput, true);
      // const userId = await userFuncs.getUser(req.user.username)
      // const managers = [req.user.username];
      const pictures = req.user.hotelPhotoInput
        ? req.user.hotelPhotoInput.map((url) => helper.checkImageURL(url, true))
        : [];
      const requestMessage = await userFuncs.createRequest(req.user.username, hotelName, street, city, state, zip_code, phone, email, pictures, []);
      req.flash(requestMessage);
      return res.redirect(`/user/dashboard/${req.user.username}`);
    } catch (e) {
      console.log(e);
      if (!e.code) {
        req.session.status = 500;
      } else {
        req.session.status = e.code;
      }
      req.session.errorMessage = e.message;
      res.redirect(`/user/dashboard/${req.user.username}`);
    }
  });

router.route("/dashboard/:username/logout").get(
  (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.redirect("/user/login");
    }
    else{
      req.logout(function (err) {
        if (err) {
          return next(err);
        }
        req.session.destroy();
        res.redirect("/user/login");
      }
      )
    }
  },
  (req, res) => {
    res.redirect("/user/login");
  }
);

//get orders and delete orders. By delete orders, means changing orders state to cancelled.
router
  .route("/dashboard/:username/bookings")
  .get(isAuth, async (req, res) => {
    try {
      const orders = await userFuncs.getOrders(req.user.username);
      return res.status(200).render("bookings", { orders: orders, title: "Bookings" });
    } catch (e) {
      if (!e.code) {
        req.session.status = 500;
      } else {
        req.session.status = e.code;
      }
      req.session.errorMessage = e.message;
      res.redirect(`/user/dashboard/${req.user.username}`);
    }
  })
  .delete(isAuth, async (req, res) => {
    try {
      req.params.order_id = helper.checkId(req.params.order_id, true);
      const order = await userFuncs.deleteOrder(req.params.order_id);
      if (!order) throw new CustomException("Order not found", false);
      req.flash("success", "Order deleted");
      return res.status(200).redirect("/dashboard/:username/bookings");
    } catch (e) {
      if (!e.code) {
        req.session.status = 500;
      } else {
        req.session.status = e.code;
      }
      req.session.errorMessage = e.message;
      res.redirect(`/user/dashboard/${req.user.username}`);
    }
  });


//manager or admin only
router.route("/dashboard/:username/hotel_orders")
.get(
  (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.redirect("/user/login");
    }
    if (req.user.identity === "user") {
      req.session.status = 403;
      req.session.errorMessage = "You are not allowed to access this page";
      return res.redirect(`/user/dashboard/${req.user.username}`);
    }
    next();
  },
  async (req, res) => {
    try {
      //get manager's hotels
      const tempOrder = await Order();
      const user = await getUser(req.user.username);
      const hotels = user.hotels;

      //get order of the hotels
      const orders = await tempOrder
        .find({ hotel_name: { $in: hotels } })
        .toArray();
      if (!orders) throw new CustomException("Order not found", true);

      //get enum for room type for each order if manager want to edit that dont know if you need this or not
      /*
        const tempHotel = await Hotel();
        const ref = {}
        let hotelName = ""
        let roomType = []
        for (let i of orders) {
          hotelName = i.hotel_name
          if (ref[hotelName]) continue
          roomType = await Hotel.findOne({name: hotelName}).room_type.toArray()
          ref[hotelName] = roomType
          i.room_type = roomType
        }
      */

      return res.status(200).render("order", { order: orders, title: "Hotel Orders" });
    } catch {
      if (!e.code) {
        req.session.status = 500;
      } else {
        req.session.status = e.code;
      }
      req.session.errorMessage = e.message;
      res.redirect(`/user/dashboard/${req.user.username}`);
    }
  }
)

.patch((req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.redirect("/user/login");
  }
  if (req.user.identity === "user") {
    req.session.status = 403;
    req.session.errorMessage = "You are not allowed to access this page";
    return res.redirect(`/user/dashboard/${req.user.username}`);
  }
  next();
},
async (req, res) => {
  try {
    const order_id = helper.checkId(req.body.order_id, true);
    const hotel_id = helper.checkId(req.body.hotel_id, true);
    const checkin_date= helper.checkDate(req.body.check_in, true);
    const checkout_date= helper.checkDate(req.body.check_out, true);
    const guest = helper.checkArray(req.body.guest, "guest", true);
    const room_id = helper.checkId(req.body.room_id, true)
    const status = helper.checkStatus(req.body.status, "status", true);

    const tempRoom = await Room();

    const room_type = await tempRoom.findOne({_id: room_id}, {_id : 0, room_type: 1});
    if (!room_type) throw new CustomException("Room not found", true);

    //calculate new order_price
    const tempRoomType = await RoomType();
    const price = helper.checkPrice(tempRoomType.findOne({hotel_id: hotel_id, room_type: room_type}).price);
    const order_price = price * (moment(checkout_date, "YYYY/MM/DD").diff(moment(checkin_date, "YYYY/MM/DD"), 'days'))


    if (!await hotelFuncs.checkRoomAvailability(room_id, checkin_date, checkout_date, order_id, status)) throw new CustomException("Room not available", true);
    if(!room_id) throw new CustomException(`No available ${room_type}`, true);

    const message = await userFuncs.updateOrder(order_id, checkin_date, checkout_date, guest, order_price);
  
    req.flash("success", message);
    return res.status(200).redirect(`/user/dashboard/${req.user.username}/hotel_orders`);
  }
  catch (e) {
    if (!e.code) {
      req.session.status = 500;
    } else {
      req.session.status = e.code;
    }
    req.session.errorMessage = e.message;
    res.redirect(`/user/dashboard/${req.user.username}/bookings`);
  }
});

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
//       return res.status(200).render("hotel_management", {hotel, title: "Hotel Management"});
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
//     return res.status(200).render("roomsTypes", { roomTypes, title: "Room Types Control Panel" });
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
//         return res.status(200).render("rooms", {rooms, title: "Rooms Control Panel"});
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


  //TODO: update room
/*-----------------------------------------Review------------------------------------------------------*/
//dont know if needed. Get all review for a user
router.route("/dashboard/:username/reviews")
.get(isAuth, async (req, res) => {
  try{
    const username = helper.checkUserName(req.params.username, true)
    const reviews = await userFuncs.getReview(username)
    if (!reviews) throw new CustomException("Review not found", true);
    return res.status(200).render("review", {review: reviews, title: "Your Reviews"});
  }
  catch (e) {
    if (!e.code) {
      req.session.status = 500;
    } else {
      req.session.status = e.code;
    }
    req.session.errorMessage = e.message;
    res.redirect(`/user/dashboard/${req.user.username}/bookings`);
}});
//add review
router.route("/dashboard/:username/order_history/:order_id/add_review")
.post(isAuth, async (req, res) => {
  try { 
    const rating = req.body.rating
    const comment = req.body.comment
    const order_id = helper.checkId(req.params.order_id, true)
    const result = await userFuncs.addReview(order_id, rating, comment)
    if (!result) throw new CustomException("Review not found", true);
    req.flash(result);
    return res.status(200).redirect(`/user/dashboard/${req.user.username}/bookings`);
  } catch (e) {
    req.session.status = e.code ? e.code : 500;
    req.session.errorMessage = e.message;
    const previousUrl = req.headers.referer || `/user/dashboard/${req.user.username}/bookings`;
    res.redirect(previousUrl);
  }});

//TODO: edit review
router.route("/dashboard/:username/order_history/:order_id/edit_review")
.patch(isAuth, async (req, res) => {
  try {
  const review_id = helper.checkId(req.params.review_id, true);
  const rating = req.body.rating;
  const comment = req.body.comment;
  const result = await userFuncs.updateReview(review_id, rating, comment);
  if (!result) throw new CustomException("Review not found", true);
  req.flash(result);
  return res.status(200).redirect(`/user/dashboard/${req.user.username}/bookings`);
  } catch (e) {
    req.session.status = e.code ? e.code : 500;
    req.session.errorMessage = e.message;
    const previousUrl = req.headers.referer || `/user/dashboard/${req.user.username}/bookings`;
    res.redirect(previousUrl);
  }
})
//TODO: delete review
.delete(isAuth, async (req, res) => {
  try {
    const review_id = helper.checkId(req.body.review_id, true);
    const result = await userFuncs.deleteReview(review_id);
    if (!result) throw new CustomException("Review not found", true);
    req.flash(result);
    return res.status(200).redirect(`/user/dashboard/${req.user.username}/bookings`);
  } catch (e) {
    req.session.status = e.code ? e.code : 500;
    req.session.errorMessage = e.message;
    const previousUrl = req.headers.referer || `/user/dashboard/${req.user.username}/bookings`;
    res.redirect(previousUrl);
  }
});




// require authentication for editing personal info
/*router
  .route("/dashboard/:username/check_password")
  .post(isAuth, async (req, res) => {
    try {
      req.user.username = helper.checkString(req.user.username, "username", true);
      const user = await userFuncs.getUser(req.user.username);
      req.body.password = helper.checkPassword(req.body.password, true);
      let match = false;
      match = await bcrypt.compare(req.body.password, user.password);
      if (match) {
        return res.render("update_info", { username: req.user.username });
      } else {
        res.session.status = 403;
        res.session.errorMessage = "Wrong password";
        return res.redirect(`/user/dashboard/${req.user.username}`);
      }
    } catch (e) {
      if (!e.code) {
        req.session.status = 500;
      } else {
        req.session.status = e.code;
      }
      req.session.errorMessage = e.message;
      res.redirect(`/user/dashboard/${req.user.username}`);
    }
  });
  */




export default router;
