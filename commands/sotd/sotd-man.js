const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } = require('discord.js');
const { searchSpotifyTrack } = require('../../spotify/spotify.js');
const { appendRow, getAllMd5Hashes, hasSubmittedToday } = require('../../google/sheets.js');
const config = require('../../config.json'); // contains spreadsheet ID
const { addToPlaylist } = require('../../spotify/playlist.js');
const md5 = require('md5');


module.exports = {
  data: new SlashCommandBuilder()
    .setName('sotd-man')
    .setDescription('Submit your song of the day!')
    .addStringOption(option =>
      option.setName('title')
        .setDescription('Song title or keywords')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('artist')
        .setDescription('Song title or keywords')
        .setRequired(true)),

  async execute(interaction) {

    const title = interaction.options.getString('title');
    const artist = interaction.options.getString('artist');
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const reqId = md5(new Date()).slice(0, 8);

    // Get user info
    const userId = interaction.user.id;
    const userTag = interaction.user.tag;
    console.log('[' + reqId + '] Manual request created by ' + userTag);

    const isManual = true;

    try {

      // throw new Error('Debugging!');

      if (await hasSubmittedToday(config.googleSheetId, config.loggingSheetName, userId)) {

        console.log('[' + reqId + ']     Detected another submission today. Cancelling!');
        replyMessage = await interaction.editReply({ content: "Oi! One submission per day, goofball", embeds: [], components: [] });

      } else {

        // log track to console
        console.log('[' + reqId + ']     Entered track:');
        console.log('[' + reqId + `]         ${title}`);
        console.log('[' + reqId + `]         ${artist}`);

        // Confirmed
        console.log('  Adding...');

        const songHash = computeSongHash(title, artist);

        // Check if already in the sheet
        const existingHashes = await getAllMd5Hashes(config.googleSheetId, config.loggingSheetName);
        const isDupe = existingHashes.has(songHash);

        let flag = 'N';

        if (isDupe) {
          console.log('[' + reqId + ']     Detected duplicate! Adding flag \'R\'');
          flag += 'R';
        }

        const repeatText = (isDupe ? '[Repeat]' : '');
        const submission = await interaction.channel.send(`--\n<@${userId}> [Manual] ${repeatText}\n**${title} - ${artist}**`);

        await appendRow(config.googleSheetId, config.loggingSheetName, [
          (isDupe ? "=INDIRECT(CONCATENATE(\"R\",ROW()-1,\"C1\"),FALSE)" : "=INDIRECT(CONCATENATE(\"R\",ROW()-1,\"C1\"),FALSE)+1"),
          ((isDupe || isManual) ? "=INDIRECT(CONCATENATE(\"R\",ROW()-1,\"C2\"),FALSE)" : "=INDIRECT(CONCATENATE(\"R\",ROW()-1,\"C2\"),FALSE)+1"),
          "FALSE",
          title,
          artist,
          '',
          interaction.user.id,
          "=LOOKUP(INDIRECT(CONCATENATE(\"R\",ROW(),\"C\",COLUMN()-1),FALSE),Users!$A$2:$A,Users!$B$2:$B)",
          getFormattedDateEST(),
          songHash,
          flag,
          submission.id
        ]);
        console.log('[' + reqId + ']     Added to sheet!');

        console.log('[' + reqId + ']     Skipped adding to playlist. (Manual)');

        await interaction.editReply({ content: `Song added!`, components: [], embeds: [] });

      }

      console.log('[' + reqId + ']     Done!');

    } catch (err) {
      console.error('[' + reqId + '] SOTD-man failed!:', err);
      await interaction.followUp({ content: `Something went wrong! Please contact <@342862568655814667>\nRequest ID: \`${reqId}\``, ephemeral: true });
    }
  }
};

function getFormattedDateEST() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
  });

  return formatter.format(now); // e.g. "07/12/25"
}

function computeSongHash(name, artists) {
  const norm = (s) => s.toLowerCase().replace(/[^\w\s]/gi, '').trim();
  const base = norm(name) + norm(artists);
  return md5(base);
}

