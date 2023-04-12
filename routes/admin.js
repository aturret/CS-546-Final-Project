import {Strategy as auth} from 'passport-local'
import express from 'express'
import passport from 'passport'
import bcrypt from 'bcryptjs'
import {userFuncs} from '../data_model/User_Account.js'
import helper from "../helper.js";
import checkIdentity from './user.js'

router
    .route('/admin')
    .get(checkIdentity('admin'), async (req, res) => {
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
    .route('/admin/account')
    .get()