import { Strategy as auth } from "passport-local";
import express from "express";
import passport from "passport";
import bcrypt from "bcryptjs";
import * as userFuncs from "../data_model/User_Account.js";
import * as helper from "../helper.js";
import { CustomException } from "../helper.js";
import {Order, hotelReg, Room, RoomType}from "../Mongo_Connections/mongoCollections.js";
const router = express.Router();
import * as hotelFuncs from "../data_model/Hotel_Data.js";

export const isAuth = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.redirect("/user/login");
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
      return res.render("login");
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
    return res.status(code).render("register", { errorMessage: error });
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
      return res.status(status).render("dashboard", user);
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
    return res.status(200).render("order_history", { user: user, orders: orders });
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

//TODO: ask which implementation is better
router
  .route("/dashboard/:username/edit_info")
  .put(isAuth, async (req, res) => {
    try {
      req.body.username = helper.checkString(
        req.body.username,
        "username",
        true
      );
      req.body.avatar = helper.checkWebsite(req.body.avatar, true);
      req.body.firstName = helper.checkNameString(
        req.body.firstName,
        "first name",
        true
      );
      req.body.lastName = helper.checkNameString(
        req.body.lastName,
        "last name",
        true
      );
      req.body.phone = helper.checkPhone(req.body.phone, true);
      req.body.email = helper.checkEmail(req.body.email, true);
      const args = [
        req.body.username,
        req.body.avatar,
        req.body.firstName,
        req.body.lastName,
        req.body.phone,
        req.body.email,
        req.user.username,
      ];
      const user = await userFuncs.updateUser(req.user.username, args);
      return res.redirect(`/user/dashboard/${req.user.username}`);
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

//TODO: this function suppose to create a new request to admin. You need to define a funciton in user_model to create a new collection for requests schema.
router
  .route("/dashboard/:username/upgrade")
  .post(
    (req, res, next) =>
    {
      if(!req.isAuthenticated()) return res.redirect("/user/login");
      if(req.user.identity !== "user"){
        req.session.status = 403;
        req.session.errorMessage = "You are not allowed to register a hotel.";
        return res.redirect("/user/dashboard/:username")
      }
      next();
    }
  , async (req, res) => {
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

      const hotelName = helper.checkString(req.user.name, "name", true);
      const email = helper.checkEmail(req.user.email, true);
      const phone = helper.checkPhone(req.user.phone, true);

      const street = helper.checkString(req.user.hotelStreet, "street", true);
      const city = helper.checkString(req.user.hotelCity, "city", true);
      const state = helper.checkString(req.user.hotelState, "state", true);
      const zip_code = helper.checkZip(req.user.hotelZipcode, true);
      const userId = helper.checkId(req.body.userId, true);
      const manager = [userId];
      const photo = helper.checkWebsite(req.body.hotelPhoto, true);

      const requestMessage = await userFuncs.createRequest(hotelName, street, city, state, zip_code, phone, email, photo, [], manager);
      req.flash(requestMessage);
      return res.redirect(`/user/dashboard/${req.user.username}`);
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



router.route("/dashboard/:username/logout").get(
  (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.redirect("/user/login");
    }
    next();
  },
  (req, res) => {
    req.logout();
    req.session.destroy();
    res.redirect("/user/login");
  }
);

//get orders and delete orders. By delete orders, means changing orders state to cancelled.
router
  .route("/dashboard/:username/bookings")
  .get(isAuth, async (req, res) => {
    try {
      const orders = await userFuncs.getOrders(req.user.username);
      return res.status(200).render("bookings", { orders: orders });
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

/*-----------------------------------------Review------------------------------------------------------*/
//dont know if needed. Get all review for a user
router.route("/dashboard/:username/reviews")
.get(isAuth, async (req, res) => {
  try{
    const username = helper.checkUserName(req.params.username, true)
    const reviews = await userFuncs.getReview(username)
    if (!reviews) throw new CustomException("Review not found", true);
    return res.status(200).render("review", {review: reviews})
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
  const result = await userFuncs.editReview(review_id, rating, comment);
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
