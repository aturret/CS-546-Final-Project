import {Strategy as auth} from 'passport-local'
import express, { response } from 'express'
import passport from 'passport'
import bcrypt from 'bcryptjs'
import * as userFuncs from '../data_model/User_Account.js'
import * as hotelFuncs from '../data_model/Hotel_Data.js'
import * as adminFuncs from "../data_model/admin.js";
import * as helper from "../helper.js";

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

const router = express.Router() 
router
  .route('/')
  .get(isAdmin, async (req, res) => {
    try{
      req.user.username = helper.checkString(req.user.username)
      const user = await userFuncs.getUser(req.user.username)
      return res.render('admin', user)
    }
    catch(e){
      if (!e.code){ 
        res.status(404).render('/user/register', { errorMessage: e.message });
      }
      else
      {
        console.error(e);
        res.status(500).json({Error: "Internal server error"});
      }
    }
  })

router
  .route('/account')
  .get()

router
  .route('/dashboard/request')
  .get(isAdmin, async (req, res) => {
    const reqList = adminFuncs.getAllMgrReq();
    res.render('request', { reqList: reqList });
  });
    
router
  .route('/dashboard/request/:id')
  .get(isAdmin, async (req, res) => {
    try {
      const id = helper.checkId(req.params.id, "id", true);
      const request = adminFuncs.getMgrReq(id);
      res.render('requestById', { request: request });
    } catch (e) {
      if (!e.code) {
        req.session.status = 500;
      } else {
        req.session.status = e.code;
      }
      req.session.errorMessage = e.message;
      return res.redirect("/dashboard/request/:id");
    }
  })
  .put(isAdmin, async (req, res) => {
    try {
      const id = helper.checkId(req.params.id, "id", true);
      const response = req.body.response;
      const message = adminFuncs.mgrReqApprove(id, response);
      res.render('requestById', { message: message });
    } catch (e) {
      if (!e.code) {
        req.session.status = 500;
      } else {
        req.session.status = e.code;
      }
      req.session.errorMessage = e.message;
      return res.redirect("/dashboard/request/:id");
    }
  })

router
  .route('/dashboard/hotels')
  .get(isAdmin, async (req, res) => {
    res.render('adminHotelSearch', {});
  })
  .post(isAdmin, async (req, res) => {
    const hotel_name = req.body.name;
    const hotel_city = req.body.city;
    const hotel_state = req.body.state;
    const hotel_zip = req.body.zip;
    try{
      const result = await hotelFuncs.searchHotel(hotel_name, hotel_city, hotel_state, hotel_zip);
      return res.render("searchHotelResult", { hotels: result });
    }
    catch(e){
      req.session.status = e.code ? e.code : 500;
      req.session.errorMessage = e.message;
      return res.redirect("/dashboard/hotels");
    }
  });

router
  .route('/dashboard/users')
  .get(isAdmin, async (req, res) => {
    res.render('searchUser', {});
  })

router
  .route('/dashboard/user/user_management')
  .get(isAdmin, async (req, res) => {
    res.render('user_management', {});
  })
  .post(isAdmin, async (req, res) => {
    const user = req.body;
    console.log(user);
    try {
      user.username = helper.checkString(user.username, "username", true);
      user.roleInput = helper
        .checkRole(user.roleInput, "identity", true)
        .toLowerCase();
      if (["manager", "user", "admin"].every((obj) => obj !== user.roleInput))
        throw CustomException("Invalid identity.", true);
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
        user.roleInput,
        user.username,
        user.avatar,
        user.firstNameInput,
        user.lastNameInput,
        user.phone,
        user.passwordInput,
        user.emailAddressInput
      );

      return res.redirect("/dashboard/user/user_management");
    } catch (e) {
      if (!e.code) {
        req.session.status = 500;
      } else {
        req.session.status = e.code;
      }
      req.session.errorMessage = e.message;
      return res.redirect("/dashboard/users");
    }
  });

router
  .route('/dashboard/users/:username')
  .get(isAdmin, async (req, res) => {
    try {
      const username = helper.checkString(req.params.username, "username", true);
      const user = userFuncs.getUser(username);
      res.render('rearchUserResult', { user: user });
    } catch (e) {
      if (!e.code) {
        req.session.status = 500;
      } else {
        req.session.status = e.code;
      }
      req.session.errorMessage = e.message;
      return res.redirect("/admin/dashboard/users");
    }
  })

router
  .route('/dashboard/users/:username/update')
  .get(isAdmin, async (req, res) => {
    try {
      const username = helper.checkString(req.params.username, "username", true);
      const user = userFuncs.getUser(username);
      res.render('updateUser', { user: user });
    } catch (e) {
      if (!e.code) {
        req.session.status = 500;
      } else {
        req.session.status = e.code;
      }
      req.session.errorMessage = e.message;
      return res.redirect("/admin/dashboard/users");
    }
  })
  .patch(isAdmin, async (req, res) => {
    try {
      if (["manager", "user", "admin"].every((obj) => obj !== req.body.identity))
        throw CustomException("Invalid identity.", true);

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
      const set = {
        identity: req.user.identity,
        username: req.body.username,
        avatar: req.body.avatar,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        phone: req.body.phone,
        password: req.body.password,
        email: req.body.email
      };

      const updatedUser = await userFuncs.updateUser(req.user.username, set);
      return res.redirect(`/user/dashboard/${req.user.username}`);
    } catch (e) {
      if (!e.code) {
        req.session.status = 500;
      } else {
        req.session.status = e.code;
      }
      req.session.errorMessage = e.message;
      return res.redirect("/admin/dashboard/users");
    }
  })

router
  .route('/dashboard/users/:username/delete')
  .get(isAdmin, async (req, res) => {
    try {
      const username = helper.checkString(req.params.username, "username", true);
      const user = userFuncs.getUser(username);
      res.render('deleteAccount', { user: user });
    } catch (e) {
      if (!e.code) {
        req.session.status = 500;
      } else {
        req.session.status = e.code;
      }
      req.session.errorMessage = e.message;
      return res.redirect("/admin/dashboard/users");
    }
  })
  .delete(isAdmin, async (req, res) => {
    try {
      const username = helper.checkString(req.params.username, "username", true);
      const deleteMessage = userFuncs.deleteAccount(username);
      req.flash(deleteMessage)
      res.redirect("/admin/dashboard/users");
    } catch (e) {
      if (!e.code) {
        req.session.status = 500;
      } else {
        req.session.status = e.code;
      }
      req.session.errorMessage = e.message;
      return res.redirect("/admin/dashboard/users");
    }
  })
  
export default router;