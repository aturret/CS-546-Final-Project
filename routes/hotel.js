import {Strategy as auth} from 'passport-local'
import express, { Router } from 'express'
import passport from 'passport'
import bcrypt from 'bcryptjs'
import * as userFuncs from '../data_model/User_Account.js'
import * as helper from "../helper.js";
import isAuth from './user.js'


const router = express.Router()


//TODO: Hotel searching main page
router
    .route('/')
    .get((req, res) => {
        
    })
    .post((req, res) => {
        //error handling, rendering for error page as well
    })

//TODO: Hotel detail page
router
    .route('/:hotel_name')
    .get((req, res) => {

    })
    .post(isAuth, (req, res) => {

    })

//TODO: Room detail page
router
    .route('/:hotel_name/:room_type') // I think this should be room type id, since customers won't select room by single rooms -- Jichen
    .get((req, res) => {

    })
    
    
//TODO: load hotel information for the manager
router
    .route('/hotel_management')
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
            return res.status(200).render('hotel_management', user)
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
    //TODO: edit hotel information
    .post(
        (req, res, next) => {
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
            

            });
export default router;
    