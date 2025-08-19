const { Events } = require('discord.js');
const output = require('../utilities/output.js');
const { getRecentMessageIds } = require('../google/sheets.js');
const config = require('../config.json');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    output.log(`Logged in as ${client.user.tag}`);

    const messageIds = await getRecentMessageIds(config.googleSheetId, config.loggingSheetName);
    let count = 0;
    let max = messageIds.length;

    output.log(`Caching ${max} past messages...`)

    // for (const messageId of messageIds) {
    //   let found = false;
    //   count++;

    //   for (const channelId of config.channels) {

    //     try {
    //       // Try to fetch message
    //       const channel = await client.channels.fetch(channelId);
    //       const message = await channel.messages.fetch(messageId);
    //       output.log(`    (${String(count).padStart(2, '0')}/${String(max).padStart(2, '0')}) Cached message ${messageId.toString().slice(-4)}`);

    //       // Break and flag if found
    //       found = true;
    //       break;
    //     } catch (err) {
    //       if (err.code != 50001) {
    //         output.warn(`    (${String(count).padStart(2, '0')}/${String(max).padStart(2, '0')}) Failed to fetch message ${messageId}:`, 0, err.code);
    //       }
    //     }
    //   }

    //   if (!found) {
    //     output.log(`    (${String(count).padStart(2, '0')}/${String(max).padStart(2, '0')}) Failed to find message ${messageId} in any channel`)
    //   }
    // }

    output.log(`Done! Bot is ready!`)
  },
};
