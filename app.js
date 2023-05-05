import {Strategy as auth} from 'passport-local'
import express from 'express'
import bcrypt from 'bcryptjs'
import * as userFuncs from './data_model/User_Account.js'
import session from 'express-session'
import passport from 'passport'
import exphbs from 'express-handlebars'
import flash from 'connect-flash'
import configRoutes from './routes/index.js';
import {fileURLToPath} from 'url';
import {dirname} from 'path';
import { Account } from "./Mongo_Connections/mongoCollections.js";
import * as helper from "./helper.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
const staticDir = express.static(__dirname + '/public');



app.use('/public', staticDir);
app.use(express.json());
app.use(express.urlencoded({extended: true}));

const handlebarsInstance = exphbs.create({
    defaultLayout: 'main',
    helpers: {
      asJSON: (obj, spacing) => {
        if (typeof spacing === 'number')
          return new Handlebars.SafeString(JSON.stringify(obj, null, spacing));
  
        return new Handlebars.SafeString(JSON.stringify(obj));
      },
      eq: function (value1, value2) {
        return value1 === value2;
      },
      and: function (condition1, condition2) {
        return condition1 && condition2;
      },
      or: function (condition1, condition2) {
        return condition1 || condition2;
      },
      ne: function (value1, value2) {
        return value1 !== value2;
      }
    }
  });

app.engine('handlebars', handlebarsInstance.engine);
app.set('view engine', 'handlebars');

app.use(express.json());
app.use(session({
    name: "Cookie",
    secret: "property of group47",
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 6000000
    }
}))

app.use(flash())
app.use(passport.initialize())
app.use(passport.session())
//authentication
passport.use('login', new auth({
        usernameField: 'username',
        passwordField: 'passwordInput'
    },
    async (username, passwordInput, next) => {
        //get username and user password
        console.log("passport authentication fired")
        console.log(username)
        try{
            username = helper.checkString(username, 'username');
            const password = helper.checkPassword(passwordInput);
    
            const userInfo = await userFuncs.getUser(username);
            if (!userInfo) return next(null, false, {message: "Invalid username."});
            const userPassword = userInfo.password;
            let result = false;
            result = await bcrypt.compare(password, userPassword);
            if (!result) {

                return next(null, false, {message: "Invalid password."});
            }
            return next(null, userInfo);
        }
        catch(e){
            return next(null, false, {status: e.code, message: e.message});
        }
}
))


passport.serializeUser((user, next) => {
    process.nextTick(() => {
        return next(null, {username: user.username, identity: user.identity});
    }
    )
}
);

passport.deserializeUser(async (user, next) => {
    //verifying no errors in serialization process
    const tempAccount = await Account()
    const userInfo = await tempAccount.findOne({username: user.username});
    if (userInfo === null) return next(null, false, {message: "Internal server error."});
    process.nextTick(() => {
        return next(null, user)
    })
});

app.use((req, res, next) => {
    console.log("set user middleware fired")
    res.locals.user = req.user || "guest";
    next();
})


//for debugging purposes
app.use((req, res, next) => {
    const now = new Date().toUTCString();
    console.log(`${now} ${req.method} ${req.originalUrl} ${req.user && req.user.username? req.user.username: "Guest"}`);
    next();
})

configRoutes(app);

app.listen(3000, () => {
    console.log("We've now got a server!");
    console.log('Your routes will be running on http://localhost:3000');
});