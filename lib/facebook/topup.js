'use strict';

const mongoose = require('mongoose');
const async = require('async');
const bitcoin = require('bitcoinjs-lib');

const fb = require('../facebooklib');

const BASE_URL = process.env.BASE_URL;

module.exports.req_topup = function (req, res) {
  console.log('topup: ' + JSON.stringify(req.query));

  var Wallet = mongoose.model('Wallet');

  async.waterfall([
    function (done) {
      Wallet.findOne({ senderid: req.query.senderid, source: req.query.source }).exec(function (err, wallet) {
        if (err) done(err);
        else if (!wallet) done('sender wallet not found');
        else done(null, wallet);
      });
    }
  ],
  function (err, senderwallet) {
    if (err) {
      console.error(err);
      return res.status(400).send({
        message: err
      });
    } else {
      res.render('pages/topup', {
        config: {
          sender: senderwallet
        }
      });
    }
  });
};
