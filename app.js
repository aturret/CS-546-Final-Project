import {Strategy as auth} from 'passport-local'
import express from 'express'
import bcrypt from 'bcryptjs'
import {userFuncs} from '../data_Model/User_Account.js'
import session from 'express-session'
import passport from 'passport'
import exphbs from 'express-handlebars'
import flash from 'connect-flash'
import configRoutes from './routes/index.js';
import {fileURLToPath} from 'url';
import {dirname} from 'path';
import { Account } from "./Mongo_Connections/mongoCollections.js";


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
      }
    }
  });

app.engine('handlebars', handlebarsInstance.engine);
app.set('views engine', 'handlebars');

app.use(express.json());
app.user(session({
    name: "Cookie",
    secret: "property of group47",
    resave: false,
    saveUninitialized: true,
}))

app.use(flash())

//authentication
passport.use(new auth(
    async (req, res, next) => {
        //get username and user password
        console.log("passport authentication fired")
        const { username, password } = req.body;
        username = helper.checkString(username, 'username');
        password = helper.checkPassword(password);

        const userInfo = await userFuncs.getUser(username);
        if (!userInfo) return next(null, false, {message: "Invalid username."});
        const userPassword = userInfo.password;
        let result = false;
        try{
            result = await bcrypt.compare(password, userPassword);
            if (!result) {

                return next(null, false, {message: "Invalid password."});
            }
            return next(null, userInfo);
        }
        catch(e){
            return next(null, false, {message: e.message});
        }
}
))

app.use(passport.authenticate('session'))

passport.serializeUser((user, next) => {
    process.nextTick(() => {
        return next(null, {username: user.username, identity: user.identity});
    }
    )
}
);

passport.deserializeUser(async (user, next) => {
    //verifying no errors in serialization process
    const userInfo = await Account.findOne({username: user.username});
    if (userInfo === null) return next(null, false, {message: "Internal server error."});
    process.nextTick(() => {
        return next(null, user)
    })
});

app.use(passport.initialize())
app.use(passport.session())


//for debugging purposes
app.use((req, res, next) => {
    const now = new Date().toUTCString();
    console.log(`${now} ${req.method} ${req.originalUrl} ${req.user.username}`);
    next();
})

configRoutes(app);

app.listen(3000, () => {
    console.log("We've now got a server!");
    console.log('Your routes will be running on http://localhost:3000');
});