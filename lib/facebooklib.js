const request = require('request');
const async = require('async');
const mongoose = require('mongoose');
const utils = require('./utils');
const i18nLib = require('./i18n');

const BASE_URL = process.env.BASE_URL;
const FB_VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN;
const FB_PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
const FB_PAGE_URL = process.env.FB_PAGE_URL;

const FB_APP_CLIENT_ID = process.env.FB_APP_CLIENT_ID;
const FB_APP_CLIENT_SECRET = process.env.FB_APP_CLIENT_SECRET;

const MESSAGESDELAY = 200;

var conf = {
  client_id: FB_APP_CLIENT_ID,
  client_secret: FB_APP_CLIENT_SECRET,
  scope: 'user_friends'
};

module.exports.assertAuth = function(wallet, i18n, callback) {
  var graph = require('fbgraph');
  graph.setAccessToken(wallet.facebook_accesstoken);
  
  var redirectUri = BASE_URL + 'fbauth?lang=' + i18n.lang + '&senderid=' + wallet.senderid + '&source=' + wallet.source;
  
  var sendRequest = function() {
    module.exports.sendFBMessage(wallet.senderid, {
      attachment: {
        type: 'template',
        payload: {
          template_type: 'button',
          text: i18n.Facebook_Login,
          buttons: [
            {
              type: 'web_url',
              url: module.exports.getFBAuthUrl(redirectUri, 'rerequest'),
              title: i18n.Facebook_LoginButton,
              webview_height_ratio: 'compact'
            },
          ]
        }
      }
    });
  };
  
  
  graph.get('me/permissions', function(err, permissionsRes) {
    if (err) {
      console.log(err);
      sendRequest();
      callback(err);
    } else {
      var userFriendsPermission = permissionsRes.data.find((p) => p.permission === 'user_friends' && p.status === 'granted');
      if (!userFriendsPermission) {
        sendRequest();
        callback('user_friends permission not granted');        
      } else {
        callback();
      }
    }
  });
};


module.exports.req_fbauth = function(req, res) {
  var i18n = i18nLib.get(req.query.lang);

  var redirectUri = BASE_URL + 'fbauth?lang=' + i18n.lang + '&senderid=' + req.query.senderid + '&source=' + req.query.source;
  
  if (req.query.error) {
    res.render('pages/error', { message: i18n.Create_FacebookNotGranted, i18n: i18n });
    
  } else if (!req.query.code) {
    res.redirect(module.exports.getFBAuthUrl(redirectUri));

  } else {
    module.exports.getFBAccessToken(redirectUri, req.query.code, function(err, fbLogin) {
      if (err) {
        console.log('createwallet facebook error: ' + err);
        res.render('pages/error', { message: i18n.Create_FacebookLoginFailed, i18n: i18n });
      } else if (!fbLogin.granted) {
        console.log('createwallet facebook not granted: ' + fbLogin);
        res.render('pages/error', { message: i18n.Create_FacebookNotGranted, i18n: i18n });
      } else {
        
        var Wallet = mongoose.model('Wallet');
        Wallet.findOneAndUpdate({ senderid: req.query.senderid, source: req.query.source }, { $set: { facebook_id: fbLogin.facebook_id, facebook_accesstoken: fbLogin.facebook_accesstoken } }).exec(function(err, wallet) {
          if (err) {
            res.render('pages/error', { message: i18n.Create_FacebookLoginFailed, i18n: i18n });
          } else {
            res.render('pages/success', { message: i18n.Web_ReadyCloseWindow, i18n: i18n });
          }
        });
      }
    });
  }
};

module.exports.getFBAuthUrl = function(redirectUri, authType) {
  var graph = require('fbgraph');
  
  var options = {
    client_id: conf.client_id,
    redirect_uri: redirectUri,
    scope: conf.scope    
  };
  if (authType)
    options.auth_type = authType;
  
  return graph.getOauthUrl(options); 
};

module.exports.getFBAccessToken = function(redirectUri, code, callback) {
  var graph = require('fbgraph');
  
  graph.authorize({
    client_id: conf.client_id,
    redirect_uri: redirectUri,
    client_secret: conf.client_secret,
    code: code
  }, function (err, authRes) {
    if (err) {
      callback(err);
      return;
    }
    console.log(authRes);
    graph.extendAccessToken({
      client_id: conf.client_id,
      client_secret: conf.client_secret
    }, function (err, extendAuthRes) {
      if (err) {
        callback(err);
        return;
      }
      graph.get('me', function(err, meRes) {
        if (err) {
          callback(err);
          return;
        }
        console.log(meRes);
        
        graph.get('me/permissions', function(err, permissionsRes) {
          if (err) {
            callback(err);
            return;
          }
          console.log(permissionsRes);
          
          var userFriendsPermission = permissionsRes.data.find((p) => p.permission === 'user_friends' && p.status === 'granted');

          callback(null, {
            granted: (userFriendsPermission ? true : false),
            facebook_id: meRes.id,
            facebook_accesstoken: graph.getAccessToken()
          });
        });
      });

    });      
  });  
  
};

module.exports.getFriendsList = function(accessToken, callback) {
  var graph = require('fbgraph');
  graph.setAccessToken(accessToken);
  
  graph.get('me/friends?limit=9999', function(err, friendsRes) {
    if (err) {
      callback(err);
      return;
    }
    console.log(friendsRes);
    callback(null, friendsRes.data.map((f) => f.id));
  });
};


module.exports.sendFBInvite = function(sender, i18n) {
  
  module.exports.sendFBMessage(sender, {
    attachment: {
      type: 'template',
      payload: {
        template_type: 'generic',
        elements: [
          {
            title: i18n.Share_Title,
            subtitle: i18n.Share_Subtitle,
            image_url: BASE_URL + '/img/itipu-logo-messenger-preview-955x500.png',
            buttons: [
              {
                type: 'element_share'
              }
            ]
          }
        ]
      }
    }
  });  
};

module.exports.sendFBMessage = function(sender, messageData) {
  return new Promise((resolve, reject) => {
      request({
          url: 'https://graph.facebook.com/v2.6/me/messages',
          qs: {access_token: FB_PAGE_ACCESS_TOKEN},
          method: 'POST',
          json: {
              recipient: {id: sender},
              message: messageData
          }
      }, (error, response) => {
          if (error) {
              console.log('Error sending message: ', error);
              reject(error);
          } else if (response.body.error) {
              console.log('Error: ', response.body.error);
              reject(new Error(response.body.error));
          }

          resolve();
      });
  });  
};

module.exports.sendFBTyping = function(sender) {
  return module.exports.sendFBSenderAction(sender, 'typing_on');
};

module.exports.sendFBSenderAction = function(sender, action) {
  return new Promise((resolve, reject) => {
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token: FB_PAGE_ACCESS_TOKEN},
        method: 'POST',
        json: {
            recipient: {id: sender},
            sender_action: action
        }
    }, (error, response) => {
        if (error) {
            console.error('Error sending action: ', error);
            reject(error);
        } else if (response.body.error) {
            console.error('Error: ', response.body.error);
            reject(new Error(response.body.error));
        }

        resolve();
    });
  });
};  

module.exports.doSubscribeRequest = function() {
    request({
            method: 'POST',
            uri: 'https://graph.facebook.com/v2.6/me/subscribed_apps?access_token=' + FB_PAGE_ACCESS_TOKEN
        },
        (error, response, body) => {
            if (error) {
                console.error('Error while subscription: ', error);
            } else {
                console.log('Subscription result: ', response.body);
            }
        });

  request({
      method: 'POST',
      uri: 'https://graph.facebook.com/v2.6/me/thread_settings',
      qs: {
        access_token: FB_PAGE_ACCESS_TOKEN
      },
      json: {
        setting_type: 'domain_whitelisting',
        whitelisted_domains : ['https://maxcdn.bootstrapcdn.com'],
        domain_action_type: 'add'
      }
    },
    (error, response, body) => {
        if (error) {
            console.error('Error while domain_whitelisting: ', error);
        } else {
            console.log('domain_whitelisting result: ', response.body);
        }
    });

  request({
      method: 'POST',
      uri: 'https://graph.facebook.com/v2.6/me/thread_settings',
      qs: {
        access_token: FB_PAGE_ACCESS_TOKEN
      },
      json: {
        setting_type: 'call_to_actions',
        thread_state: 'new_thread',
        call_to_actions: [
          {
            payload: 'WELCOME'
          }
        ]
      }
    },
    (error, response, body) => {
        if (error) {
            console.error('Error while call_to_actions: ', error);
        } else {
            console.log('call_to_actions result: ', response.body);
        }
    });

  var i18n = i18nLib.get();    
    
  request({
      method: 'POST',
      uri: 'https://graph.facebook.com/v2.6/me/thread_settings',
      qs: {
        access_token: FB_PAGE_ACCESS_TOKEN
      },
      json: {
        setting_type: 'call_to_actions',
        thread_state: 'existing_thread',
        call_to_actions: [
          {
            type: 'postback',
            title: i18n.Menu_Balance,
            payload: 'BALANCE'
          },
          {
            type: 'postback',
            title: i18n.Menu_Topup,
            payload: 'TOPUP'
          },
          {
            type: 'postback',
            title: i18n.Menu_Withdraw,
            payload: 'WITHDRAW'
          },
          {
            type: 'postback',
            title: i18n.Menu_Send,
            payload: 'SEND'
          },
          {
            type: 'postback',
            title: i18n.Menu_Backup,
            payload: 'BACKUP'
          }
        ]
      }
    },
    (error, response, body) => {
        if (error) {
            console.error('Error while call_to_actions: ', error);
        } else {
            console.log('call_to_actions result: ', response.body);
        }
    });
};


module.exports.doDataResponse = function(sender, facebookResponseData, i18n) {
  if (!Array.isArray(facebookResponseData)) {
        console.log('Response as formatted message');
        module.exports.sendFBMessage(sender, facebookResponseData)
            .then(() => maybeSendInvite(sender))
            .catch(err => console.error(err));
    } else {
        async.eachSeries(facebookResponseData, (facebookMessage, callback) => {
            if (facebookMessage.sender_action) {
                console.log('Response as sender action');
                module.exports.sendFBSenderAction(sender, facebookMessage.sender_action)
                    .then(() => callback())
                    .catch(err => callback(err));
            }
            else {
                console.log('Response as formatted message');
                module.exports.sendFBMessage(sender, facebookMessage)
                    .then(() => callback())
                    .catch(err => callback(err));
            }
        }, (err) => {
            if (err) {
                console.error(err);
            } else {
                console.log('doDataResponse completed');
                maybeSendInvite(sender, i18n);
            }
        });
    }
};

module.exports.doRichContentResponse = function(sender, messages, i18n) {
  console.log('Response as rich content');
  
  var facebookMessages = []; // array with result messages

  for (var messageIndex = 0; messageIndex < messages.length; messageIndex++) {
      var message = messages[messageIndex];

      switch (message.type) {
          case 0:
              // speech: ['hi']
              // we have to get value from fulfillment.speech, because of here is raw speech
              if (message.speech) {

                  var splittedText = splitResponse(message.speech);

                  splittedText.forEach(s => {
                      facebookMessages.push({text: s});
                  });
              }

              break;

          case 1: {
              var carousel = [message];

              for (messageIndex++; messageIndex < messages.length; messageIndex++) {
                  if (messages[messageIndex].type == 1) {
                      carousel.push(messages[messageIndex]);
                  } else {
                      messageIndex--;
                      break;
                  }
              }

              var facebookMessage = {};
              carousel.forEach((c) => {
                  // buttons: [ {text: 'hi', postback: 'postback'} ], imageUrl: '', title: '', subtitle: ''

                  var card = {};

                  card.title = c.title;
                  card.image_url = c.imageUrl;
                  if (utils.isDefined(c.subtitle)) {
                      card.subtitle = c.subtitle;
                  }

                  if (c.buttons.length > 0) {
                      var buttons = [];
                      for (var buttonIndex = 0; buttonIndex < c.buttons.length; buttonIndex++) {
                          var button = c.buttons[buttonIndex];

                          if (button.text) {
                              var postback = button.postback;
                              if (!postback) {
                                  postback = button.text;
                              }

                              var buttonDescription = {
                                  title: button.text
                              };

                              if (postback.startsWith('http')) {
                                  buttonDescription.type = 'web_url';
                                  buttonDescription.url = postback;
                              } else if (postback.startsWith('/')) {
                                  buttonDescription.type = 'web_url';
                                  buttonDescription.url = BASE_URL + postback;
                                  buttonDescription.webview_height_ratio = 'compact';
                              } else {
                                  buttonDescription.type = 'postback';
                                  buttonDescription.payload = postback;
                              }

                              buttons.push(buttonDescription);
                          }
                      }

                      if (buttons.length > 0) {
                          card.buttons = buttons;
                      }
                  }

                  if (!facebookMessage.attachment) {
                      facebookMessage.attachment = {type: 'template'};
                  }

                  if (!facebookMessage.attachment.payload) {
                      facebookMessage.attachment.payload = {template_type: 'generic', elements: []};
                  }

                  facebookMessage.attachment.payload.elements.push(card);
              });

              facebookMessages.push(facebookMessage);
          }

              break;

          case 2: {
              if (message.replies && message.replies.length > 0) {
                  var facebookMessage = {};

                  facebookMessage.text = message.title ? message.title : 'Choose an item';
                  facebookMessage.quick_replies = [];

                  message.replies.forEach((r) => {
                      facebookMessage.quick_replies.push({
                          content_type: 'text',
                          title: r,
                          payload: r
                      });
                  });

                  facebookMessages.push(facebookMessage);
              }
          }

              break;

          case 3:

              if (message.imageUrl) {
                  var facebookMessage = {};

                  facebookMessage.attachment = {type: 'image'};
                  facebookMessage.attachment.payload = {url: message.imageUrl};

                  facebookMessages.push(facebookMessage);
              }

              break;

          case 4:
              if (message.payload && message.payload.facebook) {
                  facebookMessages.push(message.payload.facebook);
              }
              break;

          default:
              break;
      }
  }

  return new Promise((resolve, reject) => {
      async.eachSeries(facebookMessages, (msg, callback) => {
              module.exports.sendFBSenderAction(sender, 'typing_on')
                  .then(() => utils.sleep(MESSAGESDELAY))
                  .then(() => module.exports.sendFBMessage(sender, msg))
                  .then(() => callback())
                  .catch(callback);
          },
          (err) => {
              if (err) {
                  console.error(err);
                  reject(err);
              } else {
                  console.log('doRichContentResponse sent');
                  maybeSendInvite(sender, i18n);
                  resolve();
              }
          });
  });

};

module.exports.doTextResponse = function(sender, responseText, i18n) {
  console.log('Response as text message');
  // facebook API limit for text length is 320,
  // so we must split message if needed
  var splittedText = splitResponse(responseText);

  async.eachSeries(splittedText, (textPart, callback) => {
      module.exports.sendFBMessage(sender, {text: textPart})
          .then(() => callback())
          .catch(err => callback(err));
  },
  (err) => {
      if (err) {
          console.error(err);
      } else {
          console.log('doTextResponse sent');
          maybeSendInvite(sender, i18n);
      }
  });
};

function splitResponse(str) {
        if (str.length <= 320) {
            return [str];
        }

        return utils.chunkString(str, 300);
    }


function maybeSendInvite(sender, i18n) {
  if (Math.random() < 0.1) {
    module.exports.sendFBInvite(sender, i18n);
  }    
}



