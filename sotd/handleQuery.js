const { hasSubmittedToday } = require('../google/sheets.js');
const config = require('../config.json');
const output = require('../utilities/output.js');

async function handleQuery(query, message, requestId, userId) {
  if (await hasSubmittedToday(config.googleSheetId, config.loggingSheetName, userId, requestId)) {

    // Already submitted today
    output.logr(`User has submitted today`, requestId, 2);
    message.reply(`Oi! One submission per day, goofball`);
    return;
  }

  output.logr(`User has not submitted today`, requestId, 2);


}

module.exports = { handleQuery };