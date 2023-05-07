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
  .route('/requests')
  .get(isAdmin, async (req, res) => {
    const reqList = await adminFuncs.getAllReq();
    res.render('requests', { reqList: reqList });
  })

router
  .route('/requests/:requestId')
  .get(isAdmin, async (req, res) => {
    try {
      const requestId = helper.checkId(req.params.requestId, true);
      const request = await adminFuncs.getReq(requestId);
      res.render('requestById', { request: request });
    } catch (e) {
      if (!e.code) {
        req.session.status = 500;
      } else {
        req.session.status = e.code;
      }
      req.session.errorMessage = e.message;
      return res.redirect("/admin/requests");
    }
  })
  .post(isAdmin, async (req, res) => {
    try {
      const requestId = helper.checkId(req.params.requestId, true);
      const response = req.body.response;
      const message = await adminFuncs.reqApprove(requestId, response);
      
      req.flash(message);
      return res.redirect("/admin/requests");
    } catch (e) {
      if (!e.code) {
        req.session.status = 500;
      } else {
        req.session.status = e.code;
      }
      req.session.errorMessage = e.message;
      return res.redirect("/admin/requests/:requestId");
    }
  })

router
  .route('/accounts')
  .get(isAdmin, async (req, res) => {
    try {
      const username = helper.checkString(req.body.usernameInput, "username", true);
      const user = await userFuncs.getUser(username)
      res.render('adminAccounts', { user: user });
    } catch (e) {
      if (!e.code) {
        req.session.status = 500;
      } else {
        req.session.status = e.code;
      }
      req.session.errorMessage = e.message;
      return res.redirect("/account");
    }
  })
  .post(isAdmin, async (req, res) => {
    // let identity = req.body.identityInput;
    let username = req.body.usernameInput;
    let avatar = req.body.avatarInput;
    let firstName = req.body.firstNameInput;
    let lastName = req.body.lastNameInput;
    let phone = req.body.phoneInput;
    let password = req.body.passwordInput;
    let email = req.body.emailInput;
    try {
      username = helper.checkString(username, "username", true);
      role = helper
        .checkRole(role, "identity", true)
        .toLowerCase();
      if (["manager", "user", "admin"].every((obj) => obj !== role))
        throw CustomException("Invalid identity.", true);
        avatar = avatar
        ? helper.checkWebsite(avatar, true)
        : undefined;
      firstName = helper.checkNameString(
        firstName,
        "first name",
        true
      );
      lastName = helper.checkNameString(
        lastName,
        "last name",
        true
      );
      phone = phone ? helper.checkPhone(phone, true) : undefined;
      password = helper.checkPassword(password, true);
      email = helper.checkEmail(email, true);
      
      const args = [
        'user',
        username,
        avatar,
        firstName,
        lastName,
        phone,
        password,
        email,
        []
      ]

      const newUserMessage = await userFuncs.create(args);

      // if (identity === 'manager') {
      //   const hotel = {};
      //   hotel.name = helper.checkString(req.body.nameInput, "hotel name", true);
      //   hotel.street = helper.checkString(req.body.streetInput, "street", true);
      //   hotel.city = helper.checkString(req.body.cityInput, "city", true);
      //   hotel.state = helper.checkString(req.body.stateInput, "state", true);
      //   hotel.zip_code = helper.checkZip(req.body.zip_codeInput, true);

      //   const addMgrMessage = await adminFuncs.addMgr(req.user.username, username, hotel);
      //   req.flash(addMgrMessage);
      //   return res.redirect("/admin/account");
      // }

      req.flash(newUserMessage);
      return res.redirect("/admin/account");
    } catch (e) {
      if (!e.code) {
        req.session.status = 500;
      } else {
        req.session.status = e.code;
      }
      req.session.errorMessage = e.message;
      return res.redirect("/admin/account");
    }
  })
  .put(isAdmin, async (req, res) => {
    // let identity = req.body.identityInput;
    let username = req.body.usernameInput;
    let avatar = req.body.avatarInput;
    let firstName = req.body.firstNameInput;
    let lastName = req.body.lastNameInput;
    let phone = req.body.phoneInput;
    let email = req.body.emailInput;
    try {
      if (["manager", "user", "admin"].every((obj) => obj !== identity))
        throw CustomException("Invalid identity.", true);

      username = helper.checkString(
        username,
        "username",
        true
      );
      avatar = helper.checkWebsite(avatar, true);
      firstName = helper.checkNameString(
        firstName,
        "first name",
        true
      );
      lastName = helper.checkNameString(
        lastName,
        "last name",
        true
      );
      phone = helper.checkPhone(phone, true);
      email = helper.checkEmail(email, true);
      const set = {
        username: username,
        avatar: avatar,
        firstName: firstName,
        lastName: lastName,
        phone: phone,
        password: password,
        email: email
      };
      const updatedUser = await userFuncs.updateUser(req.user.username, set);

      // if (identity === 'manager') {
      //   const hotel = {};
      //   hotel.name = helper.checkString(req.body.nameInput, "hotel name", true);
      //   hotel.street = helper.checkString(req.body.streetInput, "street", true);
      //   hotel.city = helper.checkString(req.body.cityInput, "city", true);
      //   hotel.state = helper.checkString(req.body.stateInput, "state", true);
      //   hotel.zip_code = helper.checkZip(req.body.zip_codeInput, true);

      //   const addMgrMessage = await adminFuncs.addMgr(req.user.username, username, hotel);
      //   req.flash(addMgrMessage);
      //   return res.redirect("/admin/account");
      // }
      req.flash('Update sucessfully');
      return res.redirect(`/admin/accounts`);
    } catch (e) {
      if (!e.code) {
        req.session.status = 500;
      } else {
        req.session.status = e.code;
      }
      req.session.errorMessage = e.message;
      return res.redirect("/admin/accounts");
    }
  })
  .delete(isAdmin, async (req, res) => {
    try {
      const username = helper.checkString(req.params.username, "username", true);
      const deleteMessage = await userFuncs.deleteAccount(username);
      req.flash(deleteMessage)
      res.redirect("/admin/accounts");
    } catch (e) {
      if (!e.code) {
        req.session.status = 500;
      } else {
        req.session.status = e.code;
      }
      req.session.errorMessage = e.message;
      return res.redirect("/admin/accounts");
    }
  })

router
  .route('/createHotel')
  .get(isAdmin, async (req, res) => {
    res.render('adminHotel', {});
  })
  .post(isAdmin, async (req, res) => {
    try {
      let hotelInput = req.body;
      let args = [];
      args[0] = helper.checkString(hotelInput.nameInput, "hotel name", true);
      args[1] = helper.checkString(hotelInput.streetInput, "street", true);
      args[2] = helper.checkString(hotelInput.cityInput, "city", true);
      args[3] = helper.checkString(hotelInput.stateInput, "state", true);
      args[4] = helper.checkZip(hotelInput.zipCodeInput, true);
      args[5] = helper.checkPhone(hotelInput.phoneInput, true);
      args[6] = helper.checkEmail(hotelInput.emailInput, true);
      args[7] = hotelInput.picturesInput
        ? hotelInput.picturesInput.map((web) => helper.checkWebsite(web, true))
        : [];
      if (hotelInput.facilitiesInput && Array.isArray(hotelInput.facilitiesInput)) {
        args[8] = hotelInput.facilitiesInput.map((facility) =>
          helper.checkString(facility, "facility", true)
        );
      } else if (!hotelInput.facilitiesInput) {
        args[8] = [];
      } else {
        throw CustomException("Invalid facilities.", true);
      }
      args[9] = [];
      const addHotelId = await hotelFuncs.addHotel(args);
      req.flash('Create hotel successfully');
      res.redirect("/admin/createHotel");
    } catch (e) {
      if (!e.code) {
        req.session.status = 500;
      } else {
        req.session.status = e.code;
      }
      req.session.errorMessage = e.message;
      return res.redirect("/admin/createHotel");
    }
  })
export default router;