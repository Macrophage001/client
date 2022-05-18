require('dotenv').config();

const axios = require('axios');
const express = require('express');
const fileUpload = require('express-fileupload');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const app = express();

const port = process.env.port || 5000

const mappingValidityCheck = (url, decoder) => {
    let isValidURL = typeof url === 'string';
    let isValidDecoder = typeof decoder === 'function';
    return isValidURL && isValidDecoder;
}

let urlScraperMap = [];
;(() => {
    fs.readdir(process.env.MAPPING_MODULE_DIRECTORY, (err, files) => {
        if (err) console.error(err);
        files.forEach(file => {
            const { getModules } = require(path.join(__dirname, process.env.MAPPING_MODULE_DIRECTORY, file));
            getModules().forEach(mapping => {
                if (mapping !== undefined && mappingValidityCheck(mapping.url, mapping.decoder)) {
                    urlScraperMap.push( mapping );
                }
                else {
                    console.error('Invalid Mapping: Must include valid URL: string and decoder: [Function (string) => string[]]', mapping);
                }
            })
        })
    })
})();

const formatSimpleText = (text) => 
    text
        .replace('Sponsored Content', '')
        .replace('\r', ' ')
        .replace('\n', ' ')
        .replace('\t', ' ')
        .replace('\b', ' ')
        .split(' ')
        .filter(word => word !== '');

const getValidMapping = (url) => urlScraperMap.filter(mapping => url.includes(mapping.url))[0];

app.use(fileUpload({ createParentPath: true }))
app.use(express.urlencoded({extended: false}));
app.use(express.json());

app.get('/retrieve', async (req, resp) => {
    console.log('RETRIEVE SITE REQUEST RECEIVED');

    let url = req.query.url;
    let response = await axios.get(url);
    let mapping = getValidMapping(url);
    let wordArr = mapping.decoder(response);

    let instructions = mapping.instructions;

    resp
        .status(200)
        .send({ wordArr, instructions });
});

app.post('/retrieve-file', async (req, resp) => {
    console.log('RETRIEVE FILE REQUEST RECEIVED');
    if (!req.files) {
        resp.status(404).send('No file uploaded');
    } else {
        let fileText = req.files.file.data.toString();
        resp.status(200).send({ wordArr: formatSimpleText(fileText) });
    }
});

app.post('/retrieve-text', (req, resp) => {
    console.log('RETRIEVE TEXT REQUEST RECEIVED');
    console.log('WORD ARRAY: ', req.body.text);

    let wordArr = formatSimpleText(req.body.text);
    resp.status(200).send({ wordArr });
});


app.listen(port, () => console.log('Listening on port: ' + port));