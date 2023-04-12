import {Strategy as auth} from 'passport-local'
import express from 'express'
import passport from 'passport'
import bcrypt from 'bcryptjs'
import {userFuncs} from '../data_model/User_Account.js'
import helper from ".././helper.js";


const router = express.Router()


export function checkIdentity(role){
    return (req, res, next) => {
        if(req.isAuthenticated() && req.identity === role){ return next()}
        else{
            if (!req.isAuthenticated)
            {
                req.render('/user/login')
            }
            if(req.user.identity === 'admin')
            {
                req.render('/admin')
            }
            else if(req.user.identity === 'manager')
            {
                req.render('/m')
            }
            else{
                res.status(401).render('/', {errorMessage: "You not authorized."})
            }
        }
    }
}

router
    .route('/user/login') 
    .get((req, res) => {
        const error = req.flash('error')[0];

        return res.render("login", { errorMessage: error })
    })
    .post(await passport.authenticate('login', {
        successRedirect: '/',
        failureRedirect: '/user/login',
        failureFlash: true
    }));

router
    .route('/user/register')
    .get((req, res) => {
        const error = req.body.errorMessage
        return res.render("register", { errorMessage: error })
    })
    .post(async (req, res) => {
        const user = req.body
        try{
            user.username = helper.checkString(user.username , 'username');
            user.identity = helper.checkString(user.identity, 'identity').toLowerCase();
            if (['manager', 'user', 'admin'].every(obj => obj !== user.identity)) throw CustomException("Invalid identity.")
            user.avatar = helper.checkWebsite(user.avatar);
            user.first_name = helper.checkString(user.first_name, 'first name');
            user.last_name = helper.checkString(user.last_name, 'last name');
            user.phone = helper.checkPhone(user.phone)
            user.password = helper.checkPassword(user.password)
        }
        catch(e){
            res.status(400).render('/user/register', { errorMessage: e.message });
        }

        try{
            const args = [user.identity, user.username, user.avatar, user.first_name, user.last_name, user.phone, user.password]
            const user = await userFuncs.create(args)
            res.status(200).render('/user/login')
        }
        catch(e){
            {
                if (!e.code){ 
                  res.status(404).render('/user/register', { errorMessage: e.message });
                }
                else
                {
                  console.error(e);
                  res.status(500).json({Error: "Internal server error"});
                }
              }
        }
    })

router
    .route('/user/dashboard')
    .get(checkIdentity('user'), async (req, res) => {
        try{
            req.user.username = helper.checkString(req.user.username)
            const user = await userFuncs.getUser(req.user.username)
            return res.render('dashboard', user)
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