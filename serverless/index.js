'use strict';
const request = require('request-promise');

exports.event = (event, callback) => {
    console.log('event triggerd!');
    const file = event.data;
    const bucket = file.bucket;
    const gcs_uri = `gs://${file.bucket}/${file.name}`
    console.log(gcs_uri);
    callback();
};
