const { Events } = require('discord.js');
const output = require('../utilities/output'); // adjust path if needed

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    output.log(`Ready! Logged in as ${client.user.tag}`);
  },
};
