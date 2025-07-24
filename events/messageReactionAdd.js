const config = require('../config.json');
const { appendReactionEmoji } = require('../google/sheets.js');
const md5 = require('md5');

module.exports = {
    name: 'messageReactionAdd',
    async execute(reaction, user) {
        const reqId = md5(new Date()).slice(0, 8);
        console.log('[' + reqId + '] Reaction added!');
        if (user.bot) return;

        try {
            if (reaction.partial) await reaction.fetch();

            const emoji = reaction.emoji.name;
            const messageId = reaction.message.id;
            const username = user.username;
            console.log('[' + reqId + ']     ' + user.username + ' on message ' + reaction.message.id);

            if (await appendReactionEmoji(config.googleSheetId, config.loggingSheetName, messageId, emoji)) {
                console.log('[' + reqId + ']     Logged in sheet!');
            }
            console.log('[' + reqId + ']     Done!');
        } catch (err) {
            console.error('[' + reqId + '] Reaction tracking failed:', err);
        }
    }
};