'use strict';

const numeral = require('numeral');

numeral.locale('de', require('numeral/locales/de'));
numeral.locale('de');

module.exports = numeral;
module.exports.SATOSHI_RATE = 100000000;

