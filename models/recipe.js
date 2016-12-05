var mongoose = require('mongoose');
// var mongoosastic = require('mongoosastic'); // elastic search library
var Schema = mongoose.Schema;

var RecipeSchema = new Schema({
  title: String,
  href: String,
  ingredients: Object,
  thumbnail: String,
  likes: [{
              owner: { type: String, ref: 'User'}
          }],
  numLikes: { type: Number, default: 0},
});

module.exports = mongoose.model('Recipe', RecipeSchema);
