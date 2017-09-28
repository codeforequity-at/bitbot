'use strict';

const mongoose = require('mongoose');
const JSONbig = require('json-bigint');
const async = require('async');

const i18nLib = require('../i18n');
const fb = require('../facebooklib');

const BASE_URL = process.env.BASE_URL;

module.exports.fulfillment = function(req, res, body, session, i18n) {
  
  var redirectUri = BASE_URL + 'createwallet?lang=' + i18n.lang + '&senderid=' + session.parameters.senderid + '&source=' + session.parameters.source;
  
  return res.json({
    data: { facebook: {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'button',
          text: i18n.Create_SetPINLink,
          buttons: [
            {
              type: 'web_url',
              url: fb.getFBAuthUrl(redirectUri),
              title: i18n.Create_SetPINButton,
              webview_height_ratio: 'compact'
            },
          ]
        }
      }
    }},
    source: 'bitbot'
  });
};

module.exports.req_createwallet =  function(req, res) {
  console.log('createwallet: ' + JSON.stringify(req.query));
  var i18n = i18nLib.get(req.query.lang);
  var redirectUri = BASE_URL + 'createwallet?lang=' + i18n.lang + '&senderid=' + req.query.senderid + '&source=' + req.query.source;
  
  if (req.query.error) {
    res.render('pages/error', { message: i18n.Create_FacebookNotGranted, i18n: i18n });

  } else {
    
    fb.getFBAccessToken(redirectUri, req.query.code, function(err, fbLogin) {
      if (err) {
        console.log('createwallet facebook error: ' + err);
        res.render('pages/error', { message: i18n.Create_FacebookLoginFailed, i18n: i18n });
      } else if (!fbLogin.granted) {
        console.log('createwallet facebook not granted: ' + fbLogin);
        res.render('pages/error', { message: i18n.Create_FacebookNotGranted, i18n: i18n });
      } else {
        res.render('pages/createwallet', { config: { senderid: req.query.senderid, source: req.query.source }, fbLogin: fbLogin, i18n: i18n });
      }
    });
  }
};
module.exports.post_createwallet =   function(processEvent, req, res) {

  console.log('createwallet for: ' + req.body);
  var data = JSONbig.parse(req.body);

  var Wallet = mongoose.model('Wallet');
  Wallet.findOne({ senderid: data.senderid, source: data.source }).exec(function(err, wallet) {
    if (err) {
      console.error(err);
      return res.status(400).send({
        message: 'dberror'
      });
    } else {
      if (wallet) {
        return res.status(400).send({
          message: 'walletexisting'
        });
      } else {

        var wallet = new Wallet({ senderid: data.senderid, source: data.source, privatekey: data.privatekey, address: data.address, facebook_id: data.facebook_id, facebook_accesstoken: data.facebook_accesstoken });
        wallet.save(function(err) {
          if (err) {
            console.error(err);
            return res.status(400).send({
              message: 'dberror'
            });
          } else {

            var event = {
              sender: {
                id: data.senderid
              },
              postback: {
                payload: 'WALLET_CREATED'
              }
            };

            processEvent(event);
            return res.status(200).send({
              status: 'ok'
            });
          }
        });
      }
    }
  });
};