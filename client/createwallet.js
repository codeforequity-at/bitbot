"use strict";

global.jQuery = require("jquery");
var $ = global.jQuery;
require('bootstrap');

var base58 = require('bs58');
var bitcoin = require('bitcoinjs-lib');
var ecurve = require('ecurve');
var BigInteger = require('bigi');
var Buffer = require('buffer');
var triplesec = require('triplesec');

$(function() {
  $('#btnSubmit').click(function() {
    if (validatePin())
      generate();
  });
  $('#btnCancel').click(function() {
    breakError(i18n.Web_CloseWindow);
  });

  $("#pin1").on('keyup blur', validatePin);
  $("#pin2").on('keyup blur', validatePin);

  $("#page1").show();
  $("#page2").hide();
});

function validatePin() {
  if ($("#pin1").val().length >= 4 && $("#pin1").val() === $("#pin2").val()) {
    $("#btnSubmit").removeAttr('disabled');
    return true;
  } else {
    $("#btnSubmit").prop("disabled", true);
    return false;
  }
}

function showRunning(status) {
  $("#page1").hide();
  $("#page2").show();
  $('#check').hide();
  $('#times').hide();
  $('#spinner').show();
  $('#status').text(status);
  $('#status_container').css('color', 'orange');
}

function breakError(err) {
  $("#page1").hide();
  $("#page2").show();
  $('#check').hide();
  $('#times').show();
  $('#spinner').hide();
  $('#status').text(err);
  $('#status_container').css('color', 'red');
}
function breakReady(status) {
  $("#page1").hide();
  $("#page2").show();
  $('#check').show();
  $('#times').hide();
  $('#spinner').hide();
  $('#status').text(status);
  $('#status_container').css('color', 'green');
}

function generate() {
  showRunning(i18n.Create_GenerateWallet);
  var keyPair = bitcoin.ECPair.makeRandom()
  var address = keyPair.getAddress()

  showRunning(i18n.Create_Encrypting);

  triplesec.encrypt ({
    data: new triplesec.Buffer(keyPair.toWIF()),
    key: new triplesec.Buffer($("#pin1").val())
  }, function(err, buff) {
    if (err) {
      breakError(i18n.Create_EncryptionFailed);
    } else {
      var ciphertext = buff.toString('hex');

      $.ajax({
        url: '/createwallet',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ senderid: config.senderid, source: config.source, privatekey: ciphertext, address: keyPair.getAddress(), facebook_id: fbLogin.facebook_id, facebook_accesstoken: fbLogin.facebook_accesstoken })
        }).done(function(data) {
          breakReady(i18n.Web_ReadyCloseWindow);
        }).fail(function(err) {
          var msg = i18n.Create_Failed;
          if (err.responseJSON && err.responseJSON.message) {
            if (err.responseJSON.message === 'walletexisting')
              msg = i18n.Create_WalletExists;
          }
          breakError(msg);
        });
    }
  });
}
