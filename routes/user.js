import { Strategy as auth } from "passport-local";
import express from "express";
import passport from "passport";
import bcrypt from "bcryptjs";
import { userFuncs } from "/data_model/User_Account.js";
import helper, { CustomException } from "../helper.js";

const router = express.Router();

const isAuth = (req, res, next) => {
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
        return res.redirect("/dashboard/:username", {
          username: req.user.username,
        });
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
      req.session = {}
      return res.redirect("/")
    }
  );

router
  .route("/register")
  .get(
    (req, res) => {
      const error = req.body.errorMessage;
      return res.render("register", { errorMessage: error });
    }
  )
  .post(
    async (req, res) => {
    const user = req.body;
    try {
      user.username = helper.checkString(user.username, "username", true);
      user.identity = helper
        .checkString(user.identity, "identity", true)
        .toLowerCase();
      if (["manager", "user", "admin"].every((obj) => obj !== user.identity))
        throw CustomException("Invalid identity.", true);
      user.avatar = helper.checkWebsite(user.avatar, true);
      user.firstName = helper.checkString(user.firstName, "first name", true);
      user.lastName = helper.checkString(user.lastName, "last name", true);
      user.phone = helper.checkPhone(user.phone, true);
      user.password = helper.checkPassword(user.password, true);
      user.email = helper.checkEmail(user.email, true);
    } catch (e) {
      res.status(e.code).render("/user/register", { errorMessage: e.message });
    }

    try {
      const args = [
        user.identity,
        user.username,
        user.avatar,
        user.firstName,
        user.lastName,
        user.phone,
        user.password,
        user.email,
      ];
      const user = await userFuncs.create(args);
      res.status(200).render("/user/login");
    } catch (e) {
      {
        if (!e.code) {
          res.status(500).render("/user/register", { errorMessage: e.message });
        } else {
          console.error(e);
          res.status(e.code).json({ Error: e.message });
        }
      }
    }
  });

router
  .route("/dashboard/:username")
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
          res.status(404).render("/user/register", { errorMessage: e.message });
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
                req.session.errorMessage = "Internal server error";
                res.redirect("/user/dashboard/:username");
            } else {
                console.error(e);
                res.status(e.code).json({ errorMessage: e.message});
            }
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
                return res.redirect("/dashboard/:username");
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
