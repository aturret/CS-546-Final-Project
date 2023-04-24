import { Strategy as auth } from "passport-local";
import express from "express";
import passport from "passport";
import bcrypt from "bcryptjs";
import { userFuncs } from "/data_model/User_Account.js";
import helper from "../helper.js";

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
    await passport.authenticate("login", {
      failureRedirect: "/user/login",
      failureFlash: true
    })
    ,(req, res) => {
      const user = req.body.username;
      const role = req.user.identity;
      req.session.username = user;
      req.session.identity = role;
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
      user.username = helper.checkString(user.username, "username");
      user.identity = helper
        .checkString(user.identity, "identity")
        .toLowerCase();
      if (["manager", "user", "admin"].every((obj) => obj !== user.identity))
        throw CustomException("Invalid identity.");
      user.avatar = helper.checkWebsite(user.avatar);
      user.firstName = helper.checkString(user.firstName, "first name");
      user.lastName = helper.checkString(user.lastName, "last name");
      user.phone = helper.checkPhone(user.phone);
      user.password = helper.checkPassword(user.password);
      user.email = helper.checkEmail(user.email);
    } catch (e) {
      res.status(400).render("/user/register", { errorMessage: e.message });
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
          res.status(404).render("/user/register", { errorMessage: e.message });
        } else {
          console.error(e);
          res.status(500).json({ Error: "Internal server error" });
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
        req.user.username = helper.checkString(req.user.username);
        const user = await userFuncs.getUser(req.user.username);
        return res.render("dashboard", user);
      } catch (e) {
        if (!e.code) {
          res.status(404).render("/user/register", { errorMessage: e.message });
        } else {
          console.error(e);
          res.status(500).json({ Error: "Internal server error" });
        }
      }
    }
  )
  .delete(
    isAuth,
    async (req, res) => {
    try {
      req.params.order_id = helper.checkId(req.params.order_id);
      const user = await userFuncs.deleteOrder(req.params.order_id);
      res.status(200).json(user);
    } catch (e) {
      if (!e.code) {
        res.status(404).render("/user/register", { errorMessage: e.message });
      } else {
        console.error(e);
        res.status(500).json({ Error: "Internal server error" });
      }
    }
  });
