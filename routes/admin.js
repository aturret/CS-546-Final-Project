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
  .route('/request/:requestId')
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
      return res.redirect("/request");
    }
  })
  .post(isAdmin, async (req, res) => {
    try {
      const requestId = helper.checkId(req.params.requestId, true);
      const response = req.body.response;
      const message = await adminFuncs.reqApprove(requestId, response);
      req.flash(message);
      return res.redirect("/request");
    } catch (e) {
      if (!e.code) {
        req.session.status = 500;
      } else {
        req.session.status = e.code;
      }
      req.session.errorMessage = e.message;
      return res.redirect("/request/:requestId");
    }
  })

router
  .route('/account')
  .get(isAdmin, async (req, res) => {
    res.render('searchUser', {});
  })
  .post(isAdmin, async (req, res) => {
    try {
      const username = helper.checkString(req.body.username, "username", true);
      const user = await userFuncs.getUser(username)
      res.render('searchUserResult', { user: user });
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

router
  .route('/account')
  .get(isAdmin, async (req, res) => {
    res.render('user_management', {});
  })
  .post(isAdmin, async (req, res) => {
    const input = req.body;
    try {
      input.username = helper.checkString(input.username, "username", true);
      input.roleInput = helper
        .checkRole(input.roleInput, "identity", true)
        .toLowerCase();
      if (["manager", "user", "admin"].every((obj) => obj !== input.roleInput))
        throw CustomException("Invalid identity.", true);
      input.avatar = input.avatar
        ? helper.checkWebsite(input.avatar, true)
        : undefined;
      input.firstNameInput = helper.checkNameString(
        input.firstNameInput,
        "first name",
        true
      );
      input.lastNameInput = helper.checkNameString(
        input.lastNameInput,
        "last name",
        true
      );
      input.phone = input.phone ? helper.checkPhone(input.phone, true) : undefined;
      input.passwordInput = helper.checkPassword(input.passwordInput, true);
      input.emailAddressInput = helper.checkEmail(input.emailAddressInput, true);
      
      const args = [
        'user',
        input.username,
        input.avatar,
        input.firstNameInput,
        input.lastNameInput,
        input.phone,
        input.passwordInput,
        input.emailAddressInput
      ]

      const newUserMessage = await userFuncs.create(args);

      if (input.roleInput === 'manager') {
        const hotel = {};
        hotel.name = helper.checkString(input.name, "hotel name", true);
        hotel.street = helper.checkString(input.street, "street", true);
        hotel.city = helper.checkString(input.city, "city", true);
        hotel.state = helper.checkString(input.state, "state", true);
        hotel.zip_code = helper.checkZip(input.zip_code, true);

        const addMgrMessage = await adminFuncs.addMgr(mgrName, input.username, hotel);
        req.flash(addMgrMessage);
        return res.redirect("/admin/account");
      }

      req.flash(newUserMessage);
      return res.redirect("/admin/account");
    } catch (e) {
      if (!e.code) {
        req.session.status = 500;
      } else {
        req.session.status = e.code;
      }
      req.session.errorMessage = e.message;
      return res.redirect("/dashboard/users");
    }
  })
  .put(isAdmin, async (req, res) => {
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

      if (req.body.roleInput === 'manager') {
        const hotel = {};
        hotel.name = helper.checkString(req.body.name, "hotel name", true);
        hotel.street = helper.checkString(req.body.street, "street", true);
        hotel.city = helper.checkString(req.body.city, "city", true);
        hotel.state = helper.checkString(req.body.state, "state", true);
        hotel.zip_code = helper.checkZip(req.body.zip_code, true);

        const addMgrMessage = await adminFuncs.addMgr(req.user.username, req.body.username, hotel);
        req.flash(addMgrMessage);
        return res.redirect("/admin/account");
      }
      req.flash('Update sucessfully');
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
  .delete(isAdmin, async (req, res) => {
    try {
      const username = helper.checkString(req.params.username, "username", true);
      const deleteMessage = await userFuncs.deleteAccount(username);
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