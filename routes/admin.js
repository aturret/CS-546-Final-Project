import {Strategy as auth} from 'passport-local'
import express from 'express'
import passport from 'passport'
import bcrypt from 'bcryptjs'
import * as userFuncs from '../data_model/User_Account.js'
import * as helper from "../helper.js";

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

export default router;