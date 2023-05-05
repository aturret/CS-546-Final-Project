import {Strategy as auth} from 'passport-local'
import express, { response } from 'express'
import passport from 'passport'
import bcrypt from 'bcryptjs'
import * as userFuncs from '../data_model/User_Account.js'
import * as hotelFuncs from '../data_model/Hotel_Data.js'
import * as adminFuncs from "../data_model/admin.js";
import * as helper from "../helper.js";

export const isAuth = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.redirect("/user/login");
  }
  next();
};

const router = express.Router() 
router
  .route('/')
  .get((req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.redirect("/user/login");
    }
    if (req.user && req.user.identity === 'user') {
      req.flash("You are not allow to access this page")
      return res.redirect("/user/dashboard");
    }
    next();
  },
  async (req, res) => {
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
.get(isAuth, async (req, res) => {
  const reqList = adminFuncs.getAllMgrReq();
  res.render('request', { reqList: reqList });
});

router
  .route('/dashboard/hotels')
  .get(isAuth, async (req, res) => {
    res.render('searchHotel', {});
  })
  .post(isAuth, async (req, res) => {
    try {
      req.body.id = helper.checkString(req.body.id, "id", true);
      req.body.city = helper.checkString(req.body.city, "city", true);
      req.body.state = helper.checkString(req.body.state, "state", true);
      req.body.zipCode = helper.checkZip(req.body.zipCode, "zipCode", true);

      const args = [
        req.body.id,
        req.body.city,
        req.body.state,
        req.body.zipCode,
      ];

      const hotelList = hotelFuncs.hotelSearch(args);
      res.render('rearchHotelResult', { hotelList: hotelList });
    } catch (e) {
      if (!e.code) {
        req.session.status = 500;
      } else {
        req.session.status = e.code;
      }
      req.session.errorMessage = e.message;
      return res.redirect("/dashboard/hotels");
    }
  });

router
.route('/dashboard/hotels/:id')
.get(isAuth, async (req, res) => {
  try {
    const id = req.params.id;
    const hotel = hotelFuncs.getHotel(id);
    res.render('');
  } catch (e) {
    if (!e.code) {
      req.session.status = 500;
    } else {
      req.session.status = e.code;
    }
    req.session.errorMessage = e.message;
    return res.redirect("/dashboard/hotels");
  }
})
.post(isAuth, async (req, res) => {
  try {
    req.body.id = helper.checkString(req.body.id, "id", true);
    req.body.city = helper.checkString(req.body.city, "city", true);
    req.body.state = helper.checkString(req.body.state, "state", true);
    req.body.zipCode = helper.checkZip(req.body.zipCode, "zipCode", true);

    const args = [
      req.body.id,
      req.body.city,
      req.body.state,
      req.body.zipCode,
    ];

    const hotelList = hotelFuncs.hotelSearch(args);
    res.render('rearchHotelResult', { hotelList: hotelList });
  } catch (e) {
    if (!e.code) {
      req.session.status = 500;
    } else {
      req.session.status = e.code;
    }
    req.session.errorMessage = e.message;
    return res.redirect("/dashboard/hotels");
  }
});

router
  .route('/dashboard/users')
  .get(isAuth, async (req, res) => {
    res.render('searchUser', {});
  })
  .post(isAuth, async (req, res) => {
    try {
      const username = helper.checkString(req.body.username, "username", true);
      const user = userFuncs.getUser(username);
      res.render('rearchUserResult', { user: user });
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
  .route('/dashboard/request/:id')
  .get(isAuth, async (req, res) => {
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
  .post(isAuth, async (req, res) => {
    //code here for POST
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
export default router;