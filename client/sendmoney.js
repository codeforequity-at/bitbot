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
  showRunning(i18n.Send_Decrypting);

  triplesec.decrypt ({
    data: new triplesec.Buffer(config.sender.privatekey, "hex"),
    key: new triplesec.Buffer($("#pin").val())
  }, function (err, buff) {
    if (err) {
      breakError(i18n.Send_DecryptionFailed);
      return;
    }

    var keyPair = bitcoin.ECPair.fromWIF(buff.toString());

    $.ajax({
      url: 'https://blockchain.info/de/unspent?cors=true&active=' + config.sender.address,
      type: 'GET'
      }).done(function(data) {

        var tx = new bitcoin.TransactionBuilder()
        var txfeemin = config.txfee;

        var balance = 0;
        var inputCount = 0;
        data.unspent_outputs.forEach(function(uo) {
          tx.addInput(uo.tx_hash_big_endian, uo.tx_output_n);
          balance += uo.value;
          inputCount++;
        });
        
        var txfee = txfeemin;
        var txSize = inputCount * 180 + 2 * 34 + 10 + inputCount;
        //Blockchain: Minimum fee is 1.5 satoshi / B.
        if (txSize * 2 > txfeemin)
          txfee = txSize * 2;

        if (config.satoshis > balance) {
          breakError(i18n.Send_NotEnoughBalance);
          return;
        }
        if (config.satoshis - txfee < 0) {
          breakError(i18n.Send_AmountTooLow);
          return;
        }

        tx.addOutput(config.receiver.address, config.satoshis - txfee);
        tx.addOutput(config.sender.address, balance - config.satoshis);

        for (var i = 0; i < inputCount; i++)
          tx.sign(i, keyPair);

        var txHex = tx.build().toHex();
        
        $.ajax({
          url: 'https://blockchain.info/pushtx?cors=true',
          type: 'POST',
          data: 'tx=' + txHex
          }).done(function(data) {

            $.ajax({
              url: '/moneysent',
              type: 'GET',
              data: { lang: i18n.lang, senderid: config.sender.senderid, source: config.sender.source, receiverid: config.receiver.senderid, receiversource: config.receiver.source, satoshis: config.satoshis }
              }).done(function(data) {
                console.log(data);
                breakReady(i18n.Web_ReadyCloseWindow);
              }).fail(function(err) {
                console.log(err);
                breakReady(i18n.Web_ReadyCloseWindow);
              });

          }).fail(function(err) {
            var msg = i18n.Send_TransactionFailed;
            breakError(msg);
          });

      }).fail(function(err) {
        breakError(i18n.Send_NotEnoughBalance);
      });
  });

}
