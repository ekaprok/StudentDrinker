/*
I created errors object, it can be passed to the template with flash:
router.get('/login', function(req, res) {
  res.render('accounts/login', { message: req.flash('loginMessage')});
});
  pass {errors} via something in the template
*/
const express = require('express');
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const router = express.Router();
const User = require('../models/user');
const Recipe = require('../models/recipe');
const recipeCollection = require('../models/recipes');
const passport = require('passport');
const async = require('async');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt-nodejs');
const configAuth = require('./auth');
const FacebookStrategy = require('passport-facebook').Strategy;

/****
ROUTS
****/
router.get('/signup', (req, res, next) => {
  res.render("signup.jade");
});

router.get('/login', (req, res) => {
  if (req.user) {
      console.log(req.user);
      console.log("already logged in")
      return res.redirect('/');
  }
  res.render("login.jade")
});

router.get('/auth/facebook/callback',
  passport.authenticate('facebook', { successRedirect: '/profile',
                                      failureRedirect: '/login' }));


router.get('/profile', (req, res) => {
  recipeCollection
    .findOne({ owner: req.user._id })
    .populate('items.item')
    .exec(function(err, foundRecipes) {
      if (err) return next(err);
      console.log(foundRecipes)
      res.render('profile', {
        data: foundRecipes
      });
    });
});

router.get('/logout', function(req, res, next) {
  console.log("logged out");
  req.logout();
  res.redirect('/');
});

/***********
REGISTRATION
************/
router.post('/signup', function(req, res, next) {

  async.waterfall([
    function(callback) {
      var user = new User();

      user.firstName = req.body.firstName;
      user.lastName = req.body.lastName;
      user.email = req.body.email;
      user.password = req.body.password;

      User.findOne({email: req.body.email}).then((existingUser) => {
        if (existingUser) {
          req.flash('errors', 'Account with that email address already exists');
          return res.redirect('/signup');
        }
        else {
          user.save().then( (user) => {
            callback(null, user);
          }).catch( (e) => {
            return next(e);
          });
        }
      }).catch((e) => {
          console.log(e);
      });
    },

    function(user) {
      var collection = new recipeCollection();
      collection.owner = user._id;
      collection.save(function(err) {
        if (err) return next(err);
        req.logIn(user, function(err) {
          if (err) return next(err);
          res.redirect('/');
        });
      });
    }
  ]);
});


/****
LOGIN
*****/
router.post('/login', passport.authenticate('local-login', {
  successRedirect: '/profile',
  failureRedirect: '/login',
  failureFlash: true
}));

passport.use('local-login', new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password',
  passReqToCallback: true
},
  function(req, email, password, done) {
  User.findOne({ email: email}, function(err, user) {
    if (err) return done(err);
    if (!user) {
      console.log("Not a User");
      return done(null, false, req.flash('loginMessage', 'No user has been found'));
    }
    // compare the typed password to the one in the database using bcrypt
    if (!bcrypt.compareSync(password, user.password)) {
      console.log("wrong password");
      return done(null, false, req.flash('loginMessage', 'Oops! Wrong Password'));
    }

    return done(null, user);
  });
}));

// store the id in the session
// access the user who just logged in by req.user
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

// the key from serialuzeUser() us matched
passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});
// might not need
var isAuthenticated = function(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}

/***********
EDIT-PROFILE
************/
router.post('/edit-profile', function(req, res, next) {
  User.findOne({ _id: req.user._id }, function(err, user) {
    if (err) return next(err);
    if (req.body.firstName) user.firstName = req.body.firstName;
    if (req.body.lastName) user.lastName = req.body.lastName;

    user.save(function(err) {
      if (err) return next(err);
      req.flash('success', 'Successfully Edited your profile');
      return res.json(user);
    });
  });
});


/*******
FACEBOOK
********/
router.get('/auth/facebook', passport.authenticate('facebook', {scope: ['email']}));

passport.use(new FacebookStrategy({
    clientID: configAuth.facebookAuth.clientID,
    clientSecret: configAuth.facebookAuth.clientSecret,
    callbackURL: configAuth.facebookAuth.callbackURL
  },
  function(accessToken, refreshToken, profile, done) {
    	process.nextTick(function(){
    		User.findOne({'facebook.id': profile.id}, function(err, user){
    			if(err)
    				return done(err);
    			if(user)
    				return done(null, user);
    			else {
    				var newUser = new User();
    				newUser.facebook.id = profile.id;
    				newUser.facebook.token = accessToken;
    				newUser.facebook.name = profile.name.givenName + ' ' + profile.name.familyName;
    				newUser.facebook.email = profile.emails[0].value;

    				newUser.save(function(err){
    					if(err)
    						throw err;
    					return done(null, newUser);
    				})
    				console.log(profile);
    			}
    		});
    	});
    }
));









module.exports = router;
