import {Strategy as auth} from 'passport-local'
import express from 'express'
import passport from 'passport'
import bcrypt from 'bcryptjs'
import {userFuncs} from '/data_model/User_Account.js'
import helper from "../helper.js";
import {checkIdentity, checkLogin} from './user.js'
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
    .post(checkLogin, (req, res) => {

    })

//TODO: Room detail page
router
    .router('/:hotel_name/:room_id') // I think this should be room type id, since customers won't select room by single rooms -- Jichen
    .get((req, res) => {

    })