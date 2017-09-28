'use strict';

const mongoose = require('mongoose');
const async = require('async');
const request = require('request');
const numeral = require('../numeral');
const i18nLib = require('../i18n');

module.exports.fulfillment = function(req, res, body, session, i18n) {

  async.waterfall([

    function(done) {
      var Wallet = mongoose.model('Wallet');
      Wallet.findOne({ senderid: session.parameters.senderid, source: session.parameters.source }).exec(function(err, wallet) {
        if (err) done(err);
        else done(null, wallet);
      });
    },

    function(wallet, done) {
      module.exports.getBalance(wallet, done);
    },

  ],
  function (err, balanceEUR, balanceBTC) {
    if (err) {
      console.error('fehler in checkbalance action: ' + err);
      return res.status(400).json({
          status: 'error',
          error: err
      });

    } else {
      console.log('checkbalance handling ready');

      var message = i18n.format(i18n.Balance, numeral(balanceBTC).format('0.0000'), numeral(balanceEUR).format('0.00'));

      return res.json({
        speech: message,
        displayText: message,
        source: 'bitbot',
        contextOut: body.result.contexts
      });
    }
  });
};

module.exports.getBalance = function(wallet, cb) {

  async.waterfall([

    function(done) {

      request({
          url: 'https://blockchain.info/de/ticker',
          method: 'GET',
          json: true
      }, (err, response, body) => {
          if (err) done(err);
          if (!body.EUR || !body.EUR.last) done('Blockchain-Ticker: EUR Rate nicht gefunden');
          done(null, body.EUR.last);
      });
    },

    function(rateEUR, done) {
      request({
          url: 'https://blockchain.info/de/address/' + wallet.address,
          qs: {format: 'json'},
          method: 'GET',
          json: true
      }, (err, response, body) => {
          if (err) done(err);

          var balanceBTC = body.final_balance / numeral.SATOSHI_RATE;
          var balanceEUR = rateEUR * balanceBTC;

          done(null, balanceEUR, balanceBTC);
      });

    },

  ],
  cb);
};