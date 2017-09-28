'use strict';

const request = require('request');
const url = require('url');

module.exports.decodeqr = function(picurl, done) {

  request({
    url: 'http://api.qrserver.com/v1/read-qr-code/?fileurl=' + encodeURIComponent(picurl),
    method: 'GET',
    json: true
  }, (err, response, body) => {
    if (err) {
      done('fehler beim bild download: ' + err);
    } else {

      if (body && body[0].type === 'qrcode' && body[0].symbol && body[0].symbol[0].data) {
        var address = body[0].symbol[0].data;
        var bitcoinUrl = url.parse(address);
        if (bitcoinUrl.protocol === 'bitcoin:') {
          done(null, bitcoinUrl.host);
        } else {
          done(null, address);
        }
      } else {
        done();
      }

    }
  });
};