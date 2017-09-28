'use strict';

const mongoose = require('mongoose');

const DATABASE_URL = process.env.DATABASE_URL;

module.exports.loadModels = function () {

  var Schema = mongoose.Schema;

  var WalletsSchema = new Schema({
    senderid: {
      type: String,
      required: 'senderid required',
      trim: true
    },
    source: {
      type: String,
      enum: ['facebook'],
      required: 'source required',
      trim: true
    },
    privatekey: {
      type: String,
      required: 'privatekey required'
    },
    address: {
      type: String,
      required: 'address required'
    },
    facebook_id: {
      type: String
    },
    facebook_accesstoken: {
      type: String
    },
    facebook_profile: {
      first_name: String,
      last_name: String,
      profile_pic: String,
      locale: String,
      timezone: String,
      gender: String
    }
  });

  WalletsSchema.index({ 'name': 'text' });

  mongoose.model('Wallet', WalletsSchema);




};

module.exports.connect = function (cb) {
  var db = mongoose.connect(DATABASE_URL, { }, function (err) {
    if (err) {
      console.error('Could not connect to MongoDB!');
      console.log(err);
    } else {
      console.log('Connected to MongoDB.');
      if (cb) cb(db);
    }
  });
};

module.exports.disconnect = function (cb) {
  mongoose.disconnect(function (err) {
    console.info('Disconnected from MongoDB.');
    cb(err);
  });
};




