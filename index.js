'use strict';

const express = require('express');
const interceptor = require('express-interceptor');
const app = express();

const apiai = require('apiai');
const bodyParser = require('body-parser');
const uuid = require('node-uuid');
const request = require('request');
const JSONbig = require('json-bigint');
const async = require('async');
const mongoose = require('mongoose');
const numeral = require('./lib/numeral');

const i18nLib = require('./lib/i18n');
const db = require('./lib/db');
const sendmoney = require('./lib/facebook/sendmoney');
const createwallet = require('./lib/facebook/createwallet');
const withdrawal = require('./lib/facebook/withdrawal');
const checkbalance = require('./lib/facebook/checkbalance');
const topup = require('./lib/facebook/topup');
const qr = require('./lib/qr');
const utils = require('./lib/utils');
const fb = require('./lib/facebooklib');

const BASE_URL = process.env.BASE_URL;
const FB_VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN;
const FB_PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
const IMAGE_BASE_URL = process.env.IMAGE_BASE_URL || '';

const apiAiService_de = apiai(process.env.APIAI_ACCESS_TOKEN_DE, {language: i18nLib.LANG_DE, requestSource: 'fb'});
const apiAiService_en = apiai(process.env.APIAI_ACCESS_TOKEN_EN, {language: i18nLib.LANG_EN, requestSource: 'fb'});

const sessionIds = new Map();
const sessionLanguages = new Map();

function processEvent(event) {
  var eventsenderid = event.sender.id.toString();
  var eventsource = 'facebook';
  
  if (!sessionIds.has(eventsenderid)) {
    sessionIds.set(eventsenderid, uuid.v4());
  }

  async.waterfall([

    function(done) {
      var Wallet = mongoose.model('Wallet');
      Wallet.findOne({ senderid: eventsenderid, source: eventsource }).exec(function(err, wallet) {
        if (err) done(err);
        else done(null, wallet);
      });
    },

    function(wallet, done) {

      request({
          method: 'GET',
          uri: 'https://graph.facebook.com/v2.6/' + eventsenderid,
          qs: {
            access_token: FB_PAGE_ACCESS_TOKEN
          },
          json: true
        },
        (error, response, body) => {
          if (error) {
            console.error('Error while looking up facebook profile: ', error);
            
            if (!sessionLanguages.has(eventsenderid)) {
              sessionLanguages.set(eventsenderid, i18nLib.LANG_EN);
            }            
            
            done(null, wallet);
          } else {
            
            if (!sessionLanguages.has(eventsenderid)) {
              sessionLanguages.set(eventsenderid, i18nLib.getLangFromLocale(body.locale));
            }
            
            if (wallet) {            
              wallet.facebook_profile = body;
              wallet.save(function(err) {
                if (err) {
                  console.error('Error while saving facebook profile: ', error);
                }
                done(null, wallet);
              });
            } else {
              done(null, wallet);
            }
          }
        });
    },

    function(wallet, done) {

      var walletContext =  { lifespan: 1 };
      if (wallet) {
        walletContext.name = 'wallet';
        walletContext.parameters = {
          address: wallet.address,
          privatekey: wallet.privatekey
        };
      } else {
        walletContext.name = 'nowallet';
      }

      var apiRequestOptions = {
        sessionId: sessionIds.get(eventsenderid),
        originalRequest: {
          data: event,
          source: 'facebook'
        },
        contexts: [
          {
            name: 'session',
            parameters: {
              source: eventsource,
              senderid: eventsenderid
            },
            lifespan: 1
          },
          walletContext
        ]
      };
      
      var apiAiService = apiAiService_en;
      if (sessionLanguages.get(eventsenderid) === i18nLib.LANG_DE)
        apiAiService = apiAiService_de;

      var i18n = i18nLib.get(sessionLanguages.get(eventsenderid));
      
      if (event.message && event.message.quick_reply && event.message.quick_reply.payload) {
         done(null, apiAiService.textRequest(event.message.quick_reply.payload, apiRequestOptions));

      } else if (event.message && event.message.text) {
        done(null, apiAiService.textRequest(event.message.text, apiRequestOptions));

      } else if (event.postback && event.postback.payload) {
        if (event.postback.payload === 'WELCOME' && wallet) {
          done(null, apiAiService.eventRequest({ name: 'WELCOME_WALLET' }, apiRequestOptions));
        } else {
          done(null, apiAiService.eventRequest({ name: event.postback.payload }, apiRequestOptions));
        }

      } else if (event.message && event.message.attachments && event.message.attachments[0].type === 'image' && event.message.attachments[0].payload.url) {
        console.log('bild: ' + event.message.attachments[0].payload.url);

        qr.decodeqr(event.message.attachments[0].payload.url, function(err, qrcode) {
          if (err) {
            done(err);
          } else if (qrcode) {
            done(null, apiAiService.textRequest(qrcode, apiRequestOptions));
          } else {
            fb.sendFBMessage(eventsenderid, {text: i18n.Speech_NoQRDetected});
            done('kein qrcode erkannt');
          }
        });

      } else {
        done('event nicht erkannt: ' + JSON.stringify(event));
      }
    },

    function (apiaiRequest, done) {
      var i18n = i18nLib.get(sessionLanguages.get(eventsenderid));

      apiaiRequest.on('response', (response) => {
       if (utils.isDefined(response.result) && utils.isDefined(response.result.fulfillment)) {
          console.log(JSON.stringify(response.result));
         
          let responseText = response.result.fulfillment.speech;
          let responseData = response.result.fulfillment.data;
          let responseMessages = response.result.fulfillment.messages;

          let action = response.result.action;

          if (responseData && responseData.prespeech) {
            responseData.prespeech.forEach(function(dataSpeech) {
              fb.sendFBMessage(eventsenderid, {text: dataSpeech});
            });
          }
          
          if (utils.isDefined(responseData) && utils.isDefined(responseData.facebook)) {
              let facebookResponseData = responseData.facebook;
              fb.doDataResponse(eventsenderid, facebookResponseData, i18n);
          } else if (utils.isDefined(responseMessages) && responseMessages.length > 0) {
              fb.doRichContentResponse(eventsenderid, responseMessages, i18n);
          }
          else if (utils.isDefined(responseText)) {
              fb.doTextResponse(eventsenderid, responseText, i18n);
          }

          if (responseData && responseData.postspeech) {
            responseData.postspeech.forEach(function(dataSpeech) {
              fb.sendFBMessage(eventsenderid, {text: dataSpeech});
            });
          }
        }
      });

      apiaiRequest.on('error', done);
      apiaiRequest.end();
    }

  ],
  function (err) {
    if (err) {
      console.error('fehler in processEvent: ' + err);
    } else {
      console.log('event handling ready');
    }
  });
}

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.text({type: 'application/json'}));

app.use(interceptor(function(req, res) {
  return {
    isInterceptable: function() {
      return res.statusCode >= 400;
    },
    intercept: function(body, send) {
      if (req.query) console.error('FEHLER req.query: ' + JSON.stringify(req.query));
      if (req.body) console.error('FEHLER req.body: ' + JSON.stringify(req.body));
      if (body) console.error('FEHLER res.body: ' + body);
      send(body);
    }
  };
}));



// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/', function(req, res) {
  res.render('pages/index');
});
app.get('/agb', function(req, res) {
  res.render('pages/agb');
});
app.get('/impressum', function(req, res) {
  res.render('pages/impressum');
});

app.get('/topup', topup.req_topup);

app.get('/sendmoney', sendmoney.req_sendmoney);
app.get('/moneysent', sendmoney.req_moneysent);

app.get('/withdrawal', withdrawal.req_withdrawal);
app.get('/withdrawn', withdrawal.req_withdrawn);

app.get('/createwallet', createwallet.req_createwallet);
app.post('/createwallet', createwallet.post_createwallet.bind(null, processEvent));

app.get('/fbauth', fb.req_fbauth);

app.get('/webhook/', (req, res) => {
    if (req.query['hub.verify_token'] == FB_VERIFY_TOKEN) {
        res.send(req.query['hub.challenge']);

        setTimeout(() => {
            fb.doSubscribeRequest();
        }, 3000);
    } else {
        res.send('Error, wrong validation token');
    }
});

var textBuffer = new Map();

app.post('/webhook/', (req, res) => {

  console.log('webhook called: ' + req.body);
  try {
    var data = JSONbig.parse(req.body);

    if (data.entry) {
      let entries = data.entry;
      entries.forEach((entry) => {
        let messaging_events = entry.messaging;
        if (messaging_events) {
          messaging_events.forEach((event) => {
            if (event.message && !event.message.is_echo || event.postback && event.postback.payload) {
              var eventsenderid = event.sender.id.toString();
              
              if (event.message && event.message.text) {
                
                fb.sendFBTyping(eventsenderid);
                
                if (textBuffer.has(eventsenderid)) {
                  textBuffer.get(eventsenderid).event.message.text += ' ' + event.message.text;
                  clearTimeout(textBuffer.get(eventsenderid).timeoutId);
                } else {
                  textBuffer.set(eventsenderid, { event: event });
                }
                  
                textBuffer.get(eventsenderid).timeoutId = setTimeout(() => {
                  var sendEvent = textBuffer.get(eventsenderid).event;
                  textBuffer.delete(eventsenderid);
                  
                  processEvent(sendEvent);
                  
                }, 2500);

              
              } else {
                fb.sendFBTyping(eventsenderid);
                processEvent(event);
              }
            }
          });
        }
      });
    }

    return res.status(200).json({
        status: 'ok'
    });
  } catch (err) {
    return res.status(400).json({
      status: 'error',
      error: err
    });
  }
});


app.post('/fulfillment', function (req, res) {

  var body = JSONbig.parse(req.body);
  console.log('fulfillment: ' + req.body);

  var session = body.result.contexts.find(c => c.name === 'session');

  if (session) {
  
    var i18n = i18nLib.get(sessionLanguages.get(session.parameters.senderid));
  
    try {

      if (body.result.action === 'createwallet') {

        createwallet.fulfillment(req, res, body, session, i18n);

      } else if (body.result.action === 'checkbalance') {

        checkbalance.fulfillment(req, res, body, session, i18n);

      } else if (body.result.action === 'sendmoney') {

        sendmoney.fulfillment(req, res, body, session, i18n);

      } else if (body.result.action === 'withdrawal') {

        withdrawal.fulfillment(req, res, body, session, i18n);

      } else if (body.result.action === 'invite') {

        fb.sendFBInvite(session.parameters.senderid, i18n);

      } else if (body.result.action === 'switchlanguage') {
        
        sessionLanguages.set(session.parameters.senderid, body.result.parameters.lang);

        i18n = i18nLib.get(body.result.parameters.lang);
        
        return res.json({
          speech: i18n.Speech_SwitchedLanguage,
          displayText: i18n.Speech_SwitchedLanguage,
          source: 'bitbot',
          contextOut: body.result.contexts
        });        
      }

    } catch (err) {

      console.error(err);
      return res.status(400).json({
          status: 'error',
          error: err
      });
    }


  } else {
    
    var i18n = i18nLib.get();
    
    return res.json({
      speech: i18n.Speech_Session_Expired,
      displayText: i18n.Speech_Session_Expired,
      source: 'bitbot',
      contextOut: body.result.contexts
    });
  }
});

process.on('uncaughtException', function(err){
  console.error(err);
})

db.loadModels();
db.connect(function (db) {
  app.listen(app.get('port'), function() {
    console.log('Node app is running on port', app.get('port'));
  });

  fb.doSubscribeRequest();
});

