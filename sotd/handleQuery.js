const { hasSubmittedToday } = require('../google/sheets.js');
const config = require('../config.json');
const output = require('../utilities/output');

async function handleQuery(query, requestId, userId) {
    if (hasSubmittedToday(config.googleSheetId, config.loggingSheetName, userId)) {
        output.logr(`User has submitted today`, requestId, 1);
    } else {
        output.logr(`User has not submitted today`, requestId, 1);
    }


}

module.exports = { handleQuery };