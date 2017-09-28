'use strict';

const mongoose = require('mongoose');
const async = require('async');
const bitcoin = require('bitcoinjs-lib');

const fb = require('../facebooklib');
const i18nLib = require('../i18n');

const BASE_URL = process.env.BASE_URL;
const TXFEESATOSHIS = Number(process.env.TXFEESATOSHIS);

module.exports.fulfillment = function (req, res, body, session, i18n) {
  var address = body.result.parameters.address;

  try {
    bitcoin.address.fromBase58Check(address);

    return res.json({
      data: { facebook: {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'button',
            text: i18n.format(i18n.Withdraw_Link, address),
            buttons: [
              {
                type: 'web_url',
                url: BASE_URL + 'withdrawal?lang=' + i18n.lang + '&senderid=' + session.parameters.senderid + '&source=' + session.parameters.source + '&address=' + body.result.parameters.address,
                title: i18n.Withdraw_LinkButton,
                webview_height_ratio: 'compact'
              }
            ]
          }
        }
      }},
      source: 'bitbot'
    });
  } catch (err) {
    console.error(err);
    
    body.result.contexts.forEach((context) => context.lifespan = 1);
    
    return res.json({
      source: 'bitbot',
      followupEvent: { name: 'WITHDRAW_ADDRESSINVALID', data:{ address: address} },
      contextOut: body.result.contexts
    });
  }
};

module.exports.req_withdrawal = function (req, res) {
  console.log('withdrawal: ' + JSON.stringify(req.query));

  var i18n = i18nLib.get(req.query.lang);
  
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
      res.render('pages/withdrawal', {
        config: {
          sender: senderwallet,
          address: req.query.address,
          txfee: TXFEESATOSHIS
        }, i18n: i18n
      });
    }
  });
};

module.exports.req_withdrawn = function (req, res) {
  console.log('req_withdrawn: ' + JSON.stringify(req.query));

  var i18n = i18nLib.get(req.query.lang);
  
  fb.sendFBMessage(req.query.senderid, { text: i18n.format(i18n.Withdraw_Withdrawn, req.query.address) });

  return res.status(200).send({
    status: 'ok'
  });
};

