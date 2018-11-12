'use strict';
const vision = require('@google-cloud/vision');
const client = new vision.ImageAnnotatorClient();
const BigQuery = require('@google-cloud/bigquery');
const { Storage } = require('@google-cloud/storage');
const moment = require('moment-timezone');
moment.tz.setDefault('Asia/Tokyo');

const PROJECT_ID = process.env.GCLOUD_PROJECT;
const DATASET_ID = 'receipt_ocr';
const TABLE_NAME = 'receipt_details';

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

    const record = {
        date: parseDate(fullText),
        time: parseTime(fullText),
        amount: parseAmount(fullText),
        note: parseNote(fullText),
        fullText
    };
    insertRecord(record);
    res.status(200).json({ status: 'done' });
};

exports.CSVFile = async (req, res) => {
    const now = moment().format('YYYY-MM-DD-HH-mm');
    const storage = new Storage({ projectId: PROJECT_ID });
    const file = storage.bucket(req.query.bucket).file(`${ now }.csv`);

    const bigQuery = new BigQuery({ PROJECT_ID });
    const dataset = bigQuery.dataset(DATASET_ID);
    const table = dataset.table(TABLE_NAME);
    try {
        await table.extract(file, (err, resp) => {});
        const url = await file.getSignedUrl({ action: 'read', expires: moment().add(10, 'm') })[0];
        await table.delete();
        res.status(200).json({ url });
    } catch (e) {
        console.log(e);
        res.status(500).json({ error: 'error' });
    }
}

exports.clearBucket = async (req, res) => {
    const storage = new Storage({ projectId: PROJECT_ID });
    const bucket = storage.bucket(req.query.bucket);
    try {
        await bucket.deleteFiles();
        res.status(200).json();
    } catch (e) {
        res.status(500).json({ error: 'error' });
    }
}

const insertRecord = async (record) => {
    const bigQuery = new BigQuery({PROJECT_ID});
    let dataset = bigQuery.dataset(DATASET_ID);
    const existsResponse = await dataset.exists();
    const exists = existsResponse[0];
    if (!exists) {
        dataset = await bigQuery.createDataset(DATASET_ID);
    }
    const table = dataset.table(TABLE_NAME);
    const schema = 'date:string, time:string, amount:string, note:string, fullText:string';
    const response = await table.insert(record, { autoCreate: true, schema });
    console.log(response[0]);
};

const parseDate = (fullText) => {
    const dateRegExp = /\s(\d{4})(?:年|-|\/)(\d{1,2})(?:月|-|\/|\s)(\d{1,2})(?:日|\s)/;
    const dateMatched = fullText.match(dateRegExp);
    if (dateMatched) {
        return correctNumericChars(`${dateMatched[1]}-${dateMatched[2].padStart(2, 'O')}-${dateMatched[3].padStart(2, '0')}`);
    }
};

const parseTime = (fullText) => {
    const timeRegExp = /\s(\d{1,2})(?:時|:)(\d{1,2})(?:分|\s)/;
    const timeMatched = fullText.match(timeRegExp);
    if (timeMatched) {
        return correctNumericChars(`${timeMatched[1].padStart(2, '0')}:${timeMatched[2].padStart(2, '0')}`);
    }
    return "";
};

const correctNumericChars = (str) => {
    str = str.replace(/o|O|○|０/, '0');
    str = str.replace(/l|i|I|１/, '1');
    return str;
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
