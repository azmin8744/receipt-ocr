'use strict';
const request = require('request-promise');

exports.event = (event, callback) => {
  console.log('event triggerd!');
  callback();
};
