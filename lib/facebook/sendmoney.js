'use strict';

const mongoose = require('mongoose');
const async = require('async');
const request = require('request');

const fb = require('../facebooklib');
const i18nLib = require('../i18n');
const checkbalance = require('./checkbalance');
const numeral = require('../numeral');

const BASE_URL = process.env.BASE_URL;
const IMAGE_BASE_URL = process.env.IMAGE_BASE_URL || '';
const TXFEESATOSHIS = Number(process.env.TXFEESATOSHIS);
const ERROR_HANDELED = 'ERROR_HANDELED';

module.exports.fulfillment = function(req, res, body, session, i18n) {
  var parameters = body.result.parameters;
  
  async.waterfall([
    
    function(done) {

      if (!parameters.unitcurrency.amount || !parameters.unitcurrency.currency) {

        body.result.contexts.forEach((context) => context.lifespan = 1);

        return res.json({
          source: 'bitbot',
          followupEvent: { name: 'SEND_UNITCURRENCYINVALID', data:{ friend: parameters.friend } },
          contextOut: body.result.contexts
        });
        done(ERROR_HANDELED);
      } else {
        done();
      }
    },

    function(done) {
      request({
          url: 'https://blockchain.info/de/ticker',
          method: 'GET',
          json: true
      }, (err, response, bcbody) => {
        if (err) {
          done(err);
        } else {

          if (parameters.unitcurrency.currency !== 'bitcoin' && (!bcbody[parameters.unitcurrency.currency] || (bcbody[parameters.unitcurrency.currency] && !bcbody[parameters.unitcurrency.currency].last))) {

            body.result.contexts.forEach((context) => context.lifespan = 1);

            return res.json({
              source: 'bitbot',
              followupEvent: { name: 'SEND_CURRENCYINVALID', data:{ friend: parameters.friend } },
              contextOut: body.result.contexts
            });
            done(ERROR_HANDELED);
          } else {
            done(null, bcbody);
          }
        }
      });

    },

    function(bcticker, done) {
      var Wallet = mongoose.model('Wallet');
      Wallet.findOne({ senderid: session.parameters.senderid, source: session.parameters.source }).exec(function(err, wallet) {
        if (err) done(err);
        else done(null, bcticker, wallet);
      });
    },

    function(bcticker, wallet, done) {
      fb.assertAuth(wallet, i18n, function(err) {
        if (err) done(ERROR_HANDELED);
        else done(null, bcticker, wallet);
      });
    },
    
    function(bcticker, wallet, done) {
      var Wallet = mongoose.model('Wallet');
      var friendNames = [''];
      if (parameters.friend)
        friendNames = parameters.friend.split(' ');

      fb.getFriendsList(wallet.facebook_accesstoken, function(err, friends) {
        if (err) {
          done(err);
          return;
        }
        var walletQuery = {
          $and: [
            { senderid: { $ne: session.parameters.senderid } },
            { facebook_id: { $in: friends } },
            {
              $and: friendNames.map(function(name) {
                return {
                  $or: [
                    {'facebook_profile.first_name': new RegExp(name,'i')},
                    {'facebook_profile.last_name': new RegExp(name,'i')}
                  ]
                };
              })
            }
          ]
        };
        
        Wallet.find(walletQuery).exec(function(err, wallets) {
          if (err) {
            done(err);
          } else if (!wallets || wallets.length === 0) {

            var message = i18n.format(i18n.Send_FriendNotFound, parameters.friend);
            
            res.json({
              speech: message,
              displayText: message,
              source: 'bitbot',
              contextOut: body.result.contexts
            });
            done(ERROR_HANDELED);
          } else {
            done(null, bcticker, wallet, wallets);
          }
        });
      });
    }

  ],
  function (err, bcticker, wallet, receiverwallets) {
    if (err) {
      if (err !== ERROR_HANDELED) {
        console.error('fehler in sendmoney action: ' + err);
        return res.status(400).json({
            status: 'error',
            error: err
        });
      }

    } else {
      console.log('sendmoney handling ready');

      var satoshis = null;
      var symbol = null;

      if (parameters.unitcurrency.currency === 'bitcoin') {
        satoshis = parameters.unitcurrency.amount * numeral.SATOSHI_RATE;
        symbol = 'BTC';
      } else {
        satoshis = Math.round((parameters.unitcurrency.amount / bcticker[parameters.unitcurrency.currency].last) * numeral.SATOSHI_RATE);
        symbol = bcticker[parameters.unitcurrency.currency].symbol;
      }

      var amountText = null;
      if (parameters.unitcurrency.currency === 'EUR') {
        amountText = '€' + numeral(parameters.unitcurrency.amount).format('0.00');
      } else {
        var euro = (satoshis / numeral.SATOSHI_RATE) * bcticker.EUR.last;
        amountText = symbol + ' ' + numeral(parameters.unitcurrency.amount).format('0.00[0000]') + ' (~€' + numeral(euro).format('0.00') + ')';
      }

      var result = {
        data: { },
        source: 'bitbot'
      };

      if (receiverwallets.length > 1) {
        result.data.prespeech = [ i18n.Send_FoundMultipleFriends ];
      }

      result.data.facebook = {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'generic',
            elements: receiverwallets.map(function (receiverwallet) {
              return {
                title: receiverwallet.facebook_profile.first_name + ' ' + receiverwallet.facebook_profile.last_name,
                subtitle: amountText,
                image_url: IMAGE_BASE_URL + receiverwallet.facebook_profile.profile_pic,
                buttons: [
                  {
                    type: 'web_url',
                    url: BASE_URL + 'sendmoney?lang=' + i18n.lang + '&senderid=' + wallet.senderid + '&source=' + wallet.source + '&receiverid=' + receiverwallet.senderid + '&receiversource=' + receiverwallet.source + '&satoshis=' + satoshis,
                    title: i18n.Send_SendButton,
                    webview_height_ratio: 'compact'
                  }
                ]
              };
            })
          }
        }
      };

      return res.json(result);
    }

  });
};

module.exports.req_sendmoney = function(req, res) {
  console.log('sendmoney: ' + JSON.stringify(req.query));

  var i18n = i18nLib.get(req.query.lang);
    
  var Wallet = mongoose.model('Wallet');

  async.waterfall([
    function(done) {
      Wallet.findOne({ senderid: req.query.senderid, source: req.query.source }).exec(function(err, wallet) {
        if (err) done(err);
        else if (!wallet) done('sender wallet not found');
        else done(null, wallet);
      });
    },

    function (senderwallet, done) {
      Wallet.findOne({ senderid: req.query.receiverid, source: req.query.receiversource }).exec(function(err, wallet) {
        if (err) done(err);
        else if (!wallet) done('receiver wallet not found');
        else done(null, senderwallet, wallet);
      });
    }

  ],
  function (err, senderwallet, receiverwallet) {
    if (err) {
      console.error(err);
      return res.status(400).send({
        message: err
      });
    } else {    
      res.render('pages/sendmoney', { config:
        {
          sender: senderwallet,
          receiver: receiverwallet,
          satoshis: parseInt(req.query.satoshis),
          txfee: TXFEESATOSHIS
        }, i18n: i18n
      });
    }
  });
};

module.exports.req_moneysent = function(req, res) {
  console.log('moneysent: ' + JSON.stringify(req.query));

  var Wallet = mongoose.model('Wallet');

  async.waterfall([
    function(done) {
      Wallet.findOne({ senderid: req.query.senderid, source: req.query.source }).exec(function(err, wallet) {
        if (err) done(err);
        else if (!wallet) done('sender wallet not found');
        else done(null, wallet);
      });
    },

    function (senderwallet, done) {
      Wallet.findOne({ senderid: req.query.receiverid, source: req.query.receiversource }).exec(function(err, wallet) {
        if (err) done(err);
        else if (!wallet) done('receiver wallet not found');
        else done(null, senderwallet, wallet);
      });
    },

    function (senderwallet, receiverwallet, done) {

      request({
          url: 'https://blockchain.info/de/ticker',
          method: 'GET',
          json: true
      }, (err, response, bcbody) => {
        if (err) done(err);
        else done(null, senderwallet, receiverwallet, bcbody);
      });
    }

  ],
  function (err, senderwallet, receiverwallet, bcticker) {
    if (err) {
      console.error(err);
      return res.status(400).send({
        message: 'error'
      });
    }

    var euro = (req.query.satoshis / numeral.SATOSHI_RATE) * bcticker.EUR.last;
    var amountText = '€' + numeral(euro).format('0.00');

    checkbalance.getBalance(senderwallet, function (err, balanceEUR, balanceBTC) {
      var i18n = i18nLib.get(req.query.lang);
      
      var msg = i18n.format(i18n.Send_MoneySent_Sender, amountText, receiverwallet.facebook_profile.first_name + ' ' + receiverwallet.facebook_profile.last_name);
      if (err) {
        console.log('fehler beim guthaben abfragen: ' + err);
      } else {
        msg += ' ' + i18n.format(i18n.Balance, numeral(balanceBTC).format('0.0000'), numeral(balanceEUR).format('0.00'));
      }
      fb.sendFBMessage(senderwallet.senderid, {text: msg });
      fb.sendFBInvite(senderwallet.senderid, i18n);
    });

    checkbalance.getBalance(receiverwallet, function (err, balanceEUR, balanceBTC) {
      var i18n = i18nLib.get(i18nLib.getLangFromWallet(receiverwallet));

      var msg = i18n.format(i18n.Send_MoneySent_Receiver, amountText, senderwallet.facebook_profile.first_name + ' ' + senderwallet.facebook_profile.last_name);
      if (err) {
        console.log('fehler beim guthaben abfragen: ' + err);
      } else {
        msg += ' ' + i18n.format(i18n.Balance, numeral(balanceBTC).format('0.0000'), numeral(balanceEUR).format('0.00'));
      }
      fb.sendFBMessage(receiverwallet.senderid, {text: msg });
      fb.sendFBInvite(receiverwallet.senderid, i18n);
    });

    return res.status(200).send({
      status: 'ok'
    });
  });
};

