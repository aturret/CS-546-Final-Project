import {Strategy as auth} from 'passport-local'
import express, { Router } from 'express'
import passport from 'passport'
import bcrypt from 'bcryptjs'
import {userFuncs} from '/data_model/User_Account.js'
import helper from "../helper.js";

const router = express.Router()

router
    .route('/')
    .get(
        (req, res, next) => {
            if (!req.isAuthenticated()) {
                return res.redirect("/user/login");
            }
            if (req.user && req.user.identity === 'user') {
                req.flash("You are not allow to access this page")
                return res.redirect("/user/dashboard");
            }
            next();
        }
        ,async (req, res) => {
        try{
            req.user.username = helper.checkString(req.user.username)
            const user = await userFuncs.getUser(req.user.username)
            if (req.session && req.session.status) {
                user.status = req.session.status;
                user.errorMessage = req.session.errorMessage;
                req.session.status = null;
                req.session.errorMessage = null;
            }
            return res.render('manager', user)
        }
        catch(e){
            //customized error are thrown. if e.code exist its a customized error. Otherwise, its a server error.
            if (!e.code) {
                req.session.status = 500;
            } 
            else {
                req.session.status = e.code;
            }
            req.session.errorMessage = e.message;
            res.redirect("/user/dashboard/:username");
        }
    })
