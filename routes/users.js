/*
I created errors object, it can be passed to the template with flash:
router.get('/login', function(req, res) {
  res.render('accounts/login', { message: req.flash('loginMessage')});
});
  pass {errors} via something in the template
*/
var express = require('express');
var router = express.Router();
var User = require('../models/user');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var bcrypt = require('bcrypt-nodejs');

/****
ROUTS
****/
router.get('/signup', (req, res, next) => {
  var html = '<form method="post">' +
                '<input type="text" name="firstName" placeholder="First Name">' +
                '<input type="text" name="lastName" placeholder="Last Name">' +
                '<input type="text" name="email" placeholder="email">' +
                '<input type="text" name="password" placeholder="password">' +
                '<input type="submit" name="" value="submit">' +
             '</form>';
  res.send(html);
});

router.get('/login', (req, res) => {
  if (req.user) {
      console.log(req.user);
      console.log("already logged in")
      return res.redirect('/');
  }
  var html = '<form method="post" action="/login">' +
                '<input type="email" name="email" placeholder="email">' +
                '<input type="text" name="password" placeholder="password">' +
                '<input type="submit" name="" value="submit">' +
             '</form>';
  res.send(html);
});

router.get('/profile', (req, res) => {
  User.findOne({ _id: req.user._id }, function(err, user) {
    if (err) return next(err);
    /*
    !!! CAN GET USER'S CREDENTIALS FROM HERE (user)
    res.render('index', { user: user });
    */
    console.log(user);
    res.json(user.firstName);
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
    var user = new User();

    // use body parser to retrieve the data
    user.firstName = req.body.firstName;
    user.lastName = req.body.lastName;
    user.email = req.body.email;
    user.password = req.body.password;

    // Validation: check if the email is unique; if it is, add a user into the database
    User.findOne({ email: req.body.email }, function(err, existingUser) {

        if (existingUser) {
            console.log(req.body.email, 'already exists');
            req.flash('errors', 'Account with that email address already exists!');
            return res.redirect('/signup');
        } else {
            user.save(function(err, user) {
                if (err) return next(err);
                console.log("New user has been created");
                return res.redirect('/');
            });
        }
    });
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

module.exports = router;