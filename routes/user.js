import { Strategy as auth } from "passport-local";
import express from "express";
import passport from "passport";
import bcrypt from "bcryptjs";
import * as userFuncs from "../data_model/User_Account.js";
import * as helper from "../helper.js";
import { CustomException } from "../helper.js";

const router = express.Router();

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
        return res.redirect("/dashboard");
      }
      next();
    },
    (req, res) => {
      const error = req.flash("error");
      console.log(error)
      return res.render("login");
    }
  )
  .post(
    //auth
    await passport.authenticate("login", {
      failureRedirect: "/user/login",
      failureFlash: true
    })
    ,(req, res) => {
      return res.redirect("/")
    }
  );

router
  .route("/register")
  .get(
    (req, res) => {
      const code = req.session && req.session.status? req.session.status : 200;
      const error = req.session && req.session.errorMessage? req.session.errorMessage : undefined;
      if (req.session) req.session.errorMessage = undefined;
      if (req.session) req.session.status = undefined;
      return res.status(code).render("register", { errorMessage: error });
    }
  )
  .post(
    async (req, res) => {
    const user = req.body;
    console.log(user)
    try {
      user.username = helper.checkString(user.username, "username", true);
      user.roleInput = helper
        .checkString(user.roleInput, "identity", true)
        .toLowerCase();
      if (["manager", "user", "admin"].every((obj) => obj !== user.roleInput))
        throw CustomException("Invalid identity.", true);
      user.avatar = user.avatar? helper.checkWebsite(user.avatar, true): undefined;
      user.firstNameInput = helper.checkString(user.firstNameInput, "first name", true);
      user.lastNameInput = helper.checkString(user.lastNameInput, "last name", true);
      user.phone = user.phone? helper.checkPhone(user.phone, true): undefined;
      user.passwordInput = helper.checkPassword(user.passwordInput, true);
      user.emailAddressInput = helper.checkEmail(user.emailAddressInput, true);

      const newUser = await userFuncs.create(     user.roleInput,
        user.username,
        user.avatar,
        user.firstNameInput,
        user.lastNameInput,
        user.phone,
        user.passwordInput,
        user.emailAddressInput);

      return res.redirect("/user/login");
    } catch (e) {
      if (!e.code) {
        req.session.status = 500;
      } 
      else {
          req.session.status = e.code;
      }
      req.session.errorMessage = e.message;
      return res.redirect("/user/register")
    }
  });

router
  .route("/dashboard")
  .get(
    isAuth,
    async (req, res) => {
      try {
        req.user.username = helper.checkString(req.user.username, true);
        const user = await userFuncs.getUser(req.user.username);
        if (req.session && req.session.errorMessage) {
            user.errorMessage = req.session.errorMessage;
            req.session.errorMessage = null;
            const status = req.session.status
            req.session.status = null;
            return res.status(status).render("dashboard", user);
        }
        return res.render("dashboard", user);
      } catch (e) {
        if (!e.code) {
          res.redirect("/user/register");
        } else {
          console.error(e);
          res.status(e.code).json({ errorMessage: e.message});
        }
      }
    }
  )

// require authentication for editing personal info
router
  .route("/dashboard/:username/check_password")
  .post(
    isAuth,
    async (req, res) => {
        try{
            req.user.username = helper.checkString(req.user.username, true);
            const user = await userFuncs.getUser(req.user.username);
            req.body.password = helper.checkPassword(req.body.password, true);
            let match = false;
            match = await bcrypt.compare(req.body.password, user.password);
            if (match)
            {
                return res.render("update_info", {username: req.user.username});
            }
            else{
                res.session.status = 403;
                res.session.errorMessage = "Wrong password";
                return res.redirect("/user/dashboard/:username")
            }
        }
        catch(e)
        {
          if (!e.code) {
            req.session.status = 500;
          } 
          else {
              req.session.status = e.code;
          }
          req.session.errorMessage = e.message;
          res.redirect("/user/dashboard/:username")
        }
    }
)

//TODO: ask which implementation is better
router
    .route("/dashboard/:username/edit_info")
    .patch(
        isAuth,
        async (req, res) => {
            try{
                req.user.username = helper.checkString(req.user.username, true);
                req.body.username = helper.checkString(req.body.username, "username", true);
                req.body.avatar = helper.checkWebsite(req.body.avatar, true);
                req.body.firstName = helper.checkString(req.body.firstName, "first name", true);
                req.body.lastName = helper.checkString(req.body.lastName, "last name", true);
                req.body.phone = helper.checkPhone(req.body.phone, true);
                req.body.email = helper.checkEmail(req.body.email, true);
                const args = [
                    req.body.username,
                    req.body.avatar,
                    req.body.firstName,
                    req.body.lastName,
                    req.body.phone,
                    req.body.email,
                    req.user.username
                ];
                const user = await userFuncs.updateUser(req.user.username, args);
                return res.redirect("/user/dashboard");
            }
            catch(e)
            {
                if (!e.code) {
                    req.session.status = 500;
                } 
                else {
                    req.session.status = e.code;
                }
                req.session.errorMessage = e.message;
                res.redirect("/user/dashboard");
            }
        }
    )

//TODO: this function suppose to create a new request to admin. You need to define a funciton in user_model to create a new collection for requests schema.
router.route("/dashboard/:username/upgrade").post(isAuth, async (req, res) => {

});

router
  .route("/dashboard/:username/logout").get(
    (req, res, next) => {
        if(!req.isAuthenticated()){
            return res.redirect('/user/login')
        }
        next();
    }
    , (req, res) => {
        req.logout();
        req.session.destroy();
        res.redirect('/user/login')
    }
  );

//get orders and delete orders. By delete orders, means changing orders state to cancelled.
router
  .route("/dashboard/:username/bookings")
  .get(
    isAuth,
    async (req, res) => {
        try{
            const orders = await userFuncs.getOrders(req.user.username);
            return res.status(200).render('bookings', {orders: orders});
        }
        catch(e)
        {
            if (!e.code) {
                req.session.status = 500;
            } 
            else {
                req.session.status = e.code;
            }
            req.session.errorMessage = e.message;
            res.redirect("/user/dashboard/:username");
        }
    }
  )
  .delete(
    isAuth,
    async (req, res) => {
    try {
      req.params.order_id = helper.checkId(req.params.order_id, true);
      const order = await userFuncs.deleteOrder(req.params.order_id);
      if (!order) throw new CustomException("Order not found", false);
      req.flash("success", "Order deleted")
      return res.status(200).redirect("/dashboard/:username");
    } catch (e) {
        if (!e.code) {
            req.session.status = 500;
        } 
        else {
            req.session.status = e.code;
        }
        req.session.errorMessage = e.message;
        res.redirect("/user/dashboard/:username");
    }
  });

export default router;