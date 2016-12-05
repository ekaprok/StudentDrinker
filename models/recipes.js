var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var RecipesSchema = new Schema({
  owner: { type: Schema.Types.ObjectId, ref: 'User'},
  items: [{
    item: { type: Schema.Types.ObjectId, ref: 'Recipe'}
  }]
});


module.exports = mongoose.model('recipeCollection', RecipesSchema);
