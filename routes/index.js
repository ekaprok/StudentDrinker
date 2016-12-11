var express = require('express');
var http = require('http');
var router = express();

const User = require('../models/user');
const Recipe = require('../models/recipe');
const recipeCollection = require('../models/recipes');
var mongoose = require('mongoose');
//fb
var api = require('./facebook');
var oauth = require('./oauth');

var forEach = require('async-foreach').forEach;

router.post('/post', function(req, res) {
console.log(req.body)
  // facebook groups
  var urls = [
    'https://graph.facebook.com/me/feed'
  ];

  forEach(urls, function(item, index, arr) {
    // Check to ensure user has a valid access_token
    if (oauth.access_token) {
      api.postMessage(index, item, oauth.access_token, req.body.title, res);
      res.render('index');
    } else {
      console.log("Couldn't confirm that user was authenticated. Redirecting to /");
    }

  });
});

router.get('/loginfb', oauth.login);
router.get('/callback', oauth.callback);

router.get('/', function(req, res){
  // console.log(req.user.firstName);
  if (req.user) {
    res.render('index', {
      userName: req.user.firstName,
      user: req.user
      });
    }
  else {
    res.render('index')
  }
});

router.get('/faq', function(req, res){
  res.render('faq.jade');
})

/******************
DATABASE MANAGEMENT
*******************/

/* ADD ALL RECIPES FROM THE API TO LOCAL DATABASE */
router.post('/addall', function(req, res){
  var ingredients = 'water';
  var url = 'http://www.recipepuppy.com/api/?i=' + ingredients;
  http.get(url, function(res2){
    var body = '';
    res2.on('data', function(chunk){
        body += chunk;
        // console.log(JSON.parse(chunk));
    }).on('end', function(req, res2){
        var parsed = JSON.parse(body);

        res.send(parsed.results);
        parsed.results.forEach((item) => {
            var recipe = new Recipe();
            recipe.title = item.title;

            // check if the recipe is unique
            Recipe.findOne({title: item.title}).then((existingTitle) => {
              if (existingTitle) {
                console.log('This recipe already exists');
              }
              else {
                recipe.href = item.href;
                recipe.ingredients = item.ingredients.split(',').map(Function.prototype.call, String.prototype.trim);
                recipe.thumbnail = item.thumbnail;
                recipe.save();
              }}).catch((e) => {
                console.log(e);
            });
        }); // end of forEach loop

    }); // end of 'end'
  }); // end of http.get()
}); // end of '/add'
// console.log(item.ingredients.split(','));

/* SEARCH FOR A SPECIFIC RECIPE */
router.post('/search', function(req, res){
  Recipe.find({ingredients: req.body.ingredients}).then( (recipes) => {
    console.log(recipes)
    res.render("../views/results.jade", {
      data: recipes,
      user: req.user
    });
  }).catch( (e) => {
    console.log(e);
  });
});


/* GET ALL THE RECIPES IN THE USER'S COLLECTION */
router.get('/recipes', function(req, res, next) {
  recipeCollection
    .findOne({ owner: req.user._id })
    .populate('items.item')
    .exec(function(err, foundRecipes) {
      if (err) return next(err);
      res.render('../views/recipes.jade', {
        data: foundRecipes
      });
    });
});

/* ADD A RECIPE TO THE USER'S COLLECTION */
router.post('/recipe/:recipe_id', function(req, res, next) {
  console.log(req.user);
  recipeCollection.findOne({ owner: req.user._id }, (err, collection = []) => {
    if (collection.length == 0) {
      collection.items = []
    }

    collection.items.push({
      item: req.params.recipe_id
    });

    collection.save().then( () => {
      //res.send(collection.items);

      res.render('index')
    }).catch( (e) => {
      return next(e);
    });
  });
});

/* REMOVE A RECIPE FROM THE USER'S COLLECTION */
router.post('/remove', function(req, res, next) {
  recipeCollection.findOne({ owner: req.user._id }, function(err, collection) {
    collection.items.pull(req.body.item);
    collection.save(function(err, found) {
      if (err) return next(err);
      res.render(collection.items);
    });
  });
});

/* LIKE FUNCTIONALITY */
router.post('/add_like/:recipe_id', (req, res, next) => {
  var recipe_id = req.params.recipe_id;
  var owner = String(req.user._id);
  console.log(owner);
  var isEl = false;
  Recipe.findOne({ _id: recipe_id}).then( (obj) => {
    for (i=0; i < obj.likes.length; i++) {
      if (obj.likes[i].owner === owner) {
        isEl = true;
        break;
      }
    }
    if (isEl) {
      var index = obj.likes.indexOf(owner);
      obj.likes.splice(index, 1);
      obj.numLikes = obj.numLikes - 1;
    }
    else {
      obj.likes.push({
        owner: owner
      });
      obj.numLikes = obj.numLikes + 1;
    }
    obj.save(function(err) {
      if (err) return next(err);
      return res.render('index');
    });
    console.log('num of likes: ' + obj.likes.length);
  });
});

/* 5 MOST POPULAR RECIPES */
router.get('/mostpopular', function(req, res, next) {
  var promise = Recipe.find().sort({ numLikes: 'desc' }).limit(2).exec();
  promise.then( (recipes) => {
    console.log(recipes);
    res.render('mostpopular.jade', {data: recipes});
  }).catch( (e) => {
    console.log(e);
  });
});


/* RECOMMENDATIONS TO THE USER BY INGREDIENTS */
router.get('/recommended',  (req, res, next) => {
  var owner = req.user._id;
  var favorite_recipe = Recipe.find().sort({ numLikes: 'desc' }).limit(1).exec();
  favorite_recipe.then( (recipe) => {
    var ingredient = recipe[0].ingredients[0];
    Recipe.find({ingredients: ingredient}).then( (results) => {
      results_length = results.length;
      random = Math.floor(Math.random() * results_length) + 1;
      if (results[random]._id === recipe[0]._id) {
        random = Math.floor(Math.random() * results_length) + 1;
      }
      recommended = results[random];
      console.log(recommended)
      res.render('recommended.jade', {data: recommended});
    }).catch( (e) => {
      console.log(e);
    });
  }).catch( (e) => {
    console.log(e);
  });
});


/* ADD A RECIPE INTO THE DATABASE
router.post('/add', function(req, res){
  recipe.title = req.body.title;
  recipe.ingredients = req.body.ingredients;
  recipe.instruction = req.body.instructions;
  recipe.href = req.body.instructions;
  recipe.thumbnail = req.body.thumbnail;

  // check if the recipe is unique
  Recipe.findOne({title: item.title}).then((existingTitle) => {
    if (existingTitle) {
      console.log('This recipe already exists');
    }
    else {
      recipe.href = item.href;
      recipe.ingredients = item.ingredients.split(',').map(Function.prototype.call, String.prototype.trim);
      recipe.thumbnail = item.thumbnail;
      recipe.save();
    }}).catch((e) => {
      console.log(e);
  });

*/
module.exports = router;
