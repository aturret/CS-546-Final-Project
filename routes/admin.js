import {Strategy as auth} from 'passport-local'
import express, { response } from 'express'
import passport from 'passport'
import bcrypt from 'bcryptjs'
import * as userFuncs from '../data_model/User_Account.js'
import * as hotelFuncs from '../data_model/Hotel_Data.js'
import * as adminFuncs from "../data_model/admin.js";
import * as helper from "../helper.js";
import {upload} from '../helper.js'

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
    const code = req.session && req.session.status ? req.session.status : 200;
    const error =
      req.session && req.session.errorMessage
        ? req.session.errorMessage
        : undefined;
    if (req.session) req.session.errorMessage = undefined;
    if (req.session) req.session.status = undefined;
    try{
      req.user.username = helper.checkString(req.user.username);
      const user = await userFuncs.getUser(req.user.username);
      return res.status(code).render('admin', {errorMessage: error, title: "Admin Control Panel" })
    }
    catch(e){
      if (!e.code){ 
        res.status(404).render('/user/register', { errorMessage: e.message,title: "404 Not Found" });
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
    const code = req.session && req.session.status ? req.session.status : 200;
    const error =
      req.session && req.session.errorMessage
        ? req.session.errorMessage
        : undefined;
    if (req.session) req.session.errorMessage = undefined;
    if (req.session) req.session.status = undefined;
    const reqList = await adminFuncs.getAllReq();
    return res.status(code).render('requests', { errorMessage: error, reqList: reqList,title: "Hotel Application Processing Panel" });
  })

router
  .route('/requests/:requestId')
  .get(isAdmin, async (req, res) => {
    const code = req.session && req.session.status ? req.session.status : 200;
    const error =
      req.session && req.session.errorMessage
        ? req.session.errorMessage
        : undefined;
    if (req.session) req.session.errorMessage = undefined;
    if (req.session) req.session.status = undefined;
    try {
      const requestId = helper.checkId(req.params.requestId, true);
      const request = await adminFuncs.getReqById(requestId);
      return res.status(code).render('requestById', { errorMessage: error, request: request,title:"Hotel Application Processing Panel" });
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
    const code = req.session && req.session.status ? req.session.status : 200;
    const error =
      req.session && req.session.errorMessage
        ? req.session.errorMessage
        : undefined;
    if (req.session) req.session.errorMessage = undefined;
    if (req.session) req.session.status = undefined;
    return res.status(code).render('adminAccounts', { errorMessage: error, title:"User Management Panel" });
  })
  .post(isAdmin, async (req, res) => {
    try {
      const searchedUsername = helper.checkString(req.body.usernameInput, "username", true);
      const searchedUser = await userFuncs.getUser(searchedUsername)
      res.render('adminAccounts', { searchedUsername: searchedUsername, searchedUser: searchedUser ,title:"User Management Panel"});
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
  .patch(isAdmin, upload.single("avatar"), async (req, res, next) => {
    if (req.file) {
      req.body.avatarInput = `http://localhost:3000/public/uploads/${req.file.filename}`;
    }
    next();
  }, async (req, res) => {
    let searchedUsername = req.body.searchedUsername;
    let username = req.body.usernameInput;
    let avatar = req.body.avatarInput;
    let firstName = req.body.firstNameInput;
    let lastName = req.body.lastNameInput;
    let phone = req.body.phoneInput;
    let email = req.body.emailInput;
    let password = req.body.passwordInput;
    let confirmPassword = req.body.confirmPasswordInput;
    try {
      if (password !== confirmPassword) {
        throw CustomException("Password and confirm password do not match.", true);
      }
      searchedUsername = helper.checkString(
        searchedUsername, 
        "searched username", 
        true
      );
      username = helper.checkString(
        username,
        "username",
        true
      );

      avatar = avatarInput
        ? helper.checkImageURL(avatarInput, true)
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
      const updatedUser = await userFuncs.updateUser(searchedUsername, set);

      const researchedUser = await userFuncs.getUser(username);
      req.flash('Update User sucessfully');
      return res.render('adminAccounts', { searchedUsername: username, searchedUser: researchedUser ,title:"User Management Panel"});
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
      const searchedUsername = helper.checkString(req.body.searchedUsername, "searched username", true);
      const deleteMessage = await userFuncs.deleteAccount(searchedUsername);
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
  .route('/accounts/createNewAccount')
  .get(isAdmin, (req, res) => {
    const code = req.session && req.session.status ? req.session.status : 200;
    const error =
      req.session && req.session.errorMessage
        ? req.session.errorMessage
        : undefined;
    if (req.session) req.session.errorMessage = undefined;
    if (req.session) req.session.status = undefined;
    return res.status(code).render("createNewAccount", { errorMessage: error , title: "Create new user"});
  })
  .post(isAdmin, upload.single("avatarInput"), async (req, res, next) => {
    if (req.file) {
      req.body.avatarInput = `http://localhost:3000/public/uploads/${req.file.filename}`;
    }
    next();
  }, async (req, res) => {
    const user = req.body;
    try {
      user.username = helper.checkString(user.username, "username", true);
      
      user.avatarInput = user.avatarInput
        ? helper.checkImageURL(user.avatarInput, true)
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

      const createNewAccountMessage = await userFuncs.create(
        'user',
        user.username,
        user.avatarInput,
        user.firstNameInput,
        user.lastNameInput,
        user.phone,
        user.passwordInput,
        user.emailAddressInput
      );
      req.flash(createNewAccountMessage);
      return res.redirect("/admin/accounts");
    } catch (e) {
      if (!e.code) {
        req.session.status = 500;
      } else {
        req.session.status = e.code;
      }
      req.session.errorMessage = e.message;
      return res.redirect("/admin/accounts/createNewAccount");
    }
  });
export default router;