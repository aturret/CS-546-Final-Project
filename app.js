import {Strategy as auth} from 'passport-local'
import express from 'express'
import bcrypt from 'bcryptjs'
import {userFuncs} from '../data_Model/User_Account.js'
import session from 'express-session'
import uuid from 'uuid'
import configRoutes from './routes/index.js';
import {fileURLToPath} from 'url';
import {dirname} from 'path';


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
const staticDir = express.static(__dirname + '/public');


app.use('/public', staticDir);
app.use(express.json());
app.use(express.urlencoded({extended: true}));

app.use(express.json());
app.user(session({
    genid: (req) => {
        return uuid.v4();
    },
    secret: "property of group47",
    resave: false,
    saveUninitialized: false,
    cookie: {}
}))
//authentication
passport.use(new auth(async(username, password, next) => {
    //get username and user password
    const userInfo = await userFuncs.getUser(username);
    const name = userInfo.username
    const refPassword = userInfo.password
    //check if user exist
    if (!name || name === undefined)
    {
        return next(null, false, {message: `${username} does not exist`})
    }
    try{
        const auth_result = await bcrypt.compare(password, refPassword)
        if(!auth_result){ return next(null, false, 'Wrong password')}
        return next(null, userInfo)
    }
    catch{
        next(err);
    }
}))

passport.serializeUser((user, next) => {
    next(null, {username: user.username, identity: user.identity});
}
);

passport.deserializeUser(async (user, next) => {
    next(null, user)
});

app.use(passport.initialize())
app.use(passport.session())

app.listen(3000, () => {
    console.log("We've now got a server!");
    console.log('Your routes will be running on http://localhost:3000');
});