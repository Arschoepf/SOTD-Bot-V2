const md5 = require('md5');
const config = require('../config.json')
const output = require('../utilities/output');
const { handleQuery } = require('../sotd/handleQuery.js')

module.exports = {
  name: 'messageCreate',
  async execute(message) {

    // Cancel if request created by a bot
    if (message.author.bot) return;

    // Create new request ID to identify and log to console
    const requestId = md5(new Date()).slice(0, 8);
    output.logr(`Request created by ${message.author.tag}`, requestId)

    // Check if message was sent in approved channel
    if (!config.channels.includes(message.channel.id)) {
      output.logr(`Message was not sent in approved channel. Cancelled.`, requestId, 1);
      return;
    }

    // Separate message content
    const query = message.content;

    //Check if message matches format
    if (!query.match(/^(.+?)\s*-\s*(.+)$/)) {
      output.logr(`Message does not match song format. Cancelled.`, requestId, 1);
      return;
    }

    output.logr(`Message matched song format!`, requestId, 1);
    handleQuery(query, requestId, message.author.id);

  },
};
