const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

//Lib to help you hash passwords;
//a safe way to store user passwords in your Node.js application
var bcrypt = require('bcrypt-nodejs');

/*
User Schema Attributes
*/
var UserSchema = new mongoose.Schema({
  email: {type: String, unique: true, lowercase: true},
  password: String,
  firstName: {type: String, default: ''},
  lastName: {type: String, default: ''},
  facebook: {
		id: String,
		token: String,
		email: String,
		name: String
	}
});

/*
Hash the password before saving it to the database
*/
// before submitting the password to the databse, save it first
UserSchema.pre('save', function(next) {
  var user = this; // when create an object and assign to var, reffer to that object
  if(!user.isModified('password')) return next();
  bcrypt.genSalt(10, function(err, salt) {
    if (err) return next(err);
    bcrypt.hash(user.password, salt, null, (err, hash) => {
      if (err) return next(err);
      user.password = hash;
      next();
    });
  });
});

var User = mongoose.model('User', UserSchema);
module.exports = User;
