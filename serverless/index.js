'use strict';
const vision = require('@google-cloud/vision');
const client = new vision.ImageAnnotatorClient();

exports.event = async (event, callback) => {
    const gcs_uri = `gs://${event.bucket}/${event.name}`
    console.log(gcs_uri);
    const detections = await client.textDetection(gcs_uri);
    const fullText = detections[0].fullTextAnnotation.text;
    console.log(fullText);
    console.log(parseAmount(fullText));
    console.log(parseDate(fullText));
    console.log(parseTime(fullText));
    console.log(parseNote(fullText));
};

const parseDate = (fullText) => {
    const dateRegExp = /\s(\d{4})年(\d{1,2})(?:月|\s)(\d{1,2})(?:日|\s)/;
    const dateMatched = fullText.match(dateRegExp);
    if (dateMatched) {
        return `${dateMatched[1]}-${dateMatched[2].padStart(2, 'O')}-${dateMatched[3].padStart(2, '0')}`;
    }
};

const parseTime = (fullText) => {
    const timeRegExp = /\s(\d{1,2})(?:時|:)(\d{1,2})(?:分|\s)/;
    const timeMatched = fullText.match(timeRegExp);
    if (timeMatched) {
        return `${timeMatched[1].padStart(2, '0')}:${timeMatched[2].padStart(2, '0')}`;
    }
};

const parseAmount = (fullText) => {
    const priceRegExp = /¥[0-9]+ *(?:,|、| +|，|) *[0-9]+/g;
    const pricesStr = fullText.match(priceRegExp);
    const prices = pricesStr.map(p => parseInt(p.replace(/¥|,|、|，|\s/g, ''), 10));
    const uniquePrice = prices.filter((p, i) => prices.indexOf(p) === i);
    uniquePrice.sort((price, otherPrice) => otherPrice - price);
    if (uniquePrice.length <= 2) {
        return uniquePrice[0];
    }
    return uniquePrice[1];
};

const parseNote = (fullText) => {
    const splitedText = fullText.split(/\n/);
    let note = "";
    for (let lineNum = 0; lineNum < 4; lineNum++) {
        note += splitedText[lineNum];
    }
    return note;
};
