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
    sendmoney();
  });
  $('#btnCancel').click(function() {
    breakError(i18n.Web_CloseWindow);
  });

  $("#page1").show();
  $("#page2").hide();
});

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


function sendmoney() {
  showRunning(i18n.Withdraw_Decrypting);

  triplesec.decrypt ({
    data: new triplesec.Buffer(config.sender.privatekey, "hex"),
    key: new triplesec.Buffer($("#pin").val())
  }, function (err, buff) {
    if (err) {
      breakError(i18n.Withdraw_DecryptionFailed);
      return;
    }

    var keyPair = bitcoin.ECPair.fromWIF(buff.toString());

    $.ajax({
      url: 'https://blockchain.info/de/unspent?cors=true&active=' + config.sender.address,
      type: 'GET'
      }).done(function(data) {

        var tx = new bitcoin.TransactionBuilder()
        var txfee = config.txfee;

        var balance = 0;
        var inputCount = 0;
        data.unspent_outputs.forEach(function(uo) {
          tx.addInput(uo.tx_hash_big_endian, uo.tx_output_n);
          balance += uo.value;
          inputCount++;
        });

        if (balance - txfee < 0) {
          breakError(i18n.Withdraw_NotEnoughBalance);
          return;
        }

        tx.addOutput(config.address, balance - txfee);

        for (var i = 0; i < inputCount; i++)
          tx.sign(i, keyPair);

        var txHex = tx.build().toHex();

        $.ajax({
          url: 'https://blockchain.info/pushtx?cors=true',
          type: 'POST',
          data: 'tx=' + txHex
          }).done(function(data) {

            $.ajax({
              url: '/withdrawn',
              type: 'GET',
              data: { lang: i18n.lang, senderid: config.sender.senderid, source: config.sender.source, address: config.address }
              }).done(function(data) {
                breakReady(i18n.Web_ReadyCloseWindow);
              }).fail(function(err) {
                breakReady(i18n.Web_ReadyCloseWindow);
              });

          }).fail(function(err) {
            breakError(i18n.Withdraw_TransactionFailed);
          });

      }).fail(function(err) {
        breakError(i18n.Withdraw_NotEnoughBalance);
      });
  });

}
