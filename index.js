// Require the necessary discord.js classes
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits, MessageFlags } = require('discord.js');
const config = require('./config.json');
const tokens = require('./secrets/tokens.json');
const md5 = require('md5');
const output = require('./utilities/output');

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,               // Servers
    GatewayIntentBits.GuildMessages,        // Messages in servers
    GatewayIntentBits.MessageContent,       // Content of messages
    GatewayIntentBits.GuildMessageReactions // Reactions in servers
  ],
  partials: ['MESSAGE', 'CHANNEL', 'REACTION'], // Needed to handle uncached messages/reactions
});

// Load commands
output.log(`Loading commands...`);
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
loadCommandsRecursively(commandsPath);

// Load events
output.log(`Loading events...`);
const eventsPath = path.join(__dirname, 'events');
loadEventsRecursively(eventsPath);

// Log in to Discord with your client's token
client.login(tokens.discord_token);


// Bot perms integer 397351709792

// Main bot
// https://discord.com/api/oauth2/authorize?client_id=1393683644404596867&permissions=397351709792&scope=bot%20applications.commands

// Test bot
// https://discord.com/api/oauth2/authorize?client_id=1395399103977885780&permissions=397351709792&scope=bot%20applications.commands

// npm install discord.js @discordjs/builders @discordjs/rest googleapis axios md5

// Google sheet flags
// R - Repeat
// N - Not in playlist

// Load all commands inside a directory
function loadCommandsRecursively(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });

  // Loop through all files in directory
  for (const file of files) {
    const filePath = path.join(dir, file.name);

    if (file.isDirectory()) {

      // Open path and keep searching
      loadCommandsRecursively(filePath);

    } else if (file.name.endsWith('.js')) {

      // Load command if .js file
      const command = require(filePath);
      if (command?.data?.name && typeof command.execute === 'function') {
        client.commands.set(command.data.name, command);
        output.log('loaded command ' + command.data.name, 1);
      } else {
        output.warn(`Skipped loading invalid command file: ${filePath}`);
      }
    }
  }
}

// Load all events inside a directory
function loadEventsRecursively(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });

  // Loop through all files in directory
  for (const file of files) {
    const filePath = path.join(dir, file.name);

    if (file.isDirectory()) {

      // Open path and keep searching
      loadEventsRecursively(filePath)

    } else if (file.name.endsWith('.js')) {

      // Load event if .js file
      const event = require(filePath);
      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
      } else {
        client.on(event.name, (...args) => event.execute(...args));
      }
      output.log('loaded event ' + event.name, 1);
    }
  }
}