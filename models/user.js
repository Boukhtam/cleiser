const mongoose = require("mongoose");
const jwt = require('jsonwebtoken');
const bcrypt = require("bcryptjs");
const { createTransport } = require('nodemailer');
const paginate = require('mongoose-paginate');

const ENV_VARS = require('../env_vars');
const config = require("../config/database");

const Schema = mongoose.Schema
const Types = Schema.Types

// User Schema
const UserSchema = new Schema({
  email: { type: String, required: true },
  password: { type: String, required: true },
  receivedMessages: {type: [Types.ObjectId], ref: 'Message', childPath: 'recepient'},
  sentMessages: {type: [Types.ObjectId], ref: 'Message', childPath: 'author'},
  token: String
}, {timestamps: true});

UserSchema.pre('save', function (next) {
  let user = this;

  // only hash the password if it has been modified (or is new)
  if (!user.isModified('password') || !user.isNew) return next();
    
  bcrypt.genSalt(10, (err, salt) => {
    if (err) throw err;
    bcrypt.hash(user.password, salt, (error, hash) => {
      if (error) throw error;
      user.password = hash
      next();
    })
  })
});

UserSchema.methods.comparePassword = function(candidatePassword, callback) {
  bcrypt.compare(candidatePassword, this.password, (err, isMatch) => {
    if (err) throw err;
    callback(isMatch)
  });
};

UserSchema.methods.getJWT = function() {

    return this.token;
}

UserSchema.methods.generateJWToken = function() {
  let user = this;
  user.token = jwt.sign({
    user_id: user._id
  }, config.secret, {
    expiresIn: '7d'
  });
}

UserSchema.methods.toWeb = function() {
    let json = this.toJSON();
    let userData = {};

    if (json.email) userData.email = json.email;
    //if (json.token) userData.token = json.token;
    //if (json.phone) userData.phone = json.phone;
    //if (json.first_name) userData.first_name = json.first_name;
    //if (json.last_name) userData.last_name = json.last_name;

    return userData;
}

UserSchema.methods.requestPasswordUpdate = async function(res) {
  createTransport({
    auth: {
      user: '----',
      pass: '----'
    },
    service: 'Gmail'
  })
  .sendMail({
    from: '---',
    to: this.email
  }, (err, info) => {
    if (err) Promise.reject({
      message: err
    })
    else res.json(info);
  })
}

UserSchema.methods.updatePassword = async function(password, callback) {
  bcrypt.genSalt(10, (err, salt) => {
    bcrypt.hash(password, salt, (err, hash) => {
      if (err) callback(err, null, null);
      else callback(false, this, hash);
    })
  });
}

UserSchema.plugin(paginate);

module.exports = mongoose.model('User', UserSchema)
