const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } = require('discord.js');
const { searchSpotifyTrack } = require('../../spotify/spotify.js');
const { appendRow, getAllMd5Hashes, hasSubmittedToday } = require('../../google/sheets.js');
const config = require('../../config.json'); // contains spreadsheet ID
const { addToPlaylist } = require('../../spotify/playlist.js');
const md5 = require('md5');


module.exports = {
  data: new SlashCommandBuilder()
    .setName('sotd')
    .setDescription('Submit your song of the day!')
    .addStringOption(option =>
      option.setName('req')
        .setDescription('Song title or keywords')
        .setRequired(true)),

  async execute(interaction) {

    const query = interaction.options.getString('req');
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const reqId = md5(new Date()).slice(0, 8);

    // Get user info
    const userId = interaction.user.id;
    const userTag = interaction.user.tag;
    console.log('[' + reqId + '] Request created by ' + userTag);

    const isManual = false;

    try {

      // throw new Error('Debugging!');

      if (false && await hasSubmittedToday(config.googleSheetId, config.loggingSheetName, userId)) {

        console.log('[' + reqId + ']     Detected another submission today. Cancelling!');
        replyMessage = await interaction.editReply({ content: "Oi! One submission per day, goofball", embeds: [], components: [] });
      } else {

        console.log('[' + reqId + ']     User entered query \'' + query + '\'. Searching...');
        const track = await searchSpotifyTrack(query);
        let replyMessage;

        // Make sure Spotify returned a song
        if (track) {

          // log track to console
          console.log('[' + reqId + ']     Found track:');
          console.log(`[` + reqId + `]          ${track.name}`);
          console.log(`[` + reqId + `]          ${track.artists.map(a => a.name)}`);
          console.log(`[` + reqId + `]          ${track.album.name}`);


          // Embed with song info
          const embed = new EmbedBuilder()
            .setTitle(track.name)
            .setURL(track.external_urls.spotify)
            .setAuthor({ name: `${track.artists.map(a => a.name).join(', ')}` })
            .setThumbnail(track.album.images[0]?.url || '')
            .setFooter({ text: `${track.album.name}` });

          // Create buttons
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('confirm')
              .setLabel('Yes, that\'s it')
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId('cancel')
              .setLabel('No, try again')
              .setStyle(ButtonStyle.Danger)
          );

          // Create response message
          replyMessage = await interaction.editReply({ embeds: [embed], components: [row] });

        } else {

          console.log('[' + reqId + ']     Failed to find track!');
          await interaction.editReply('No results found!');
          console.log('[' + reqId + ']     Done!');
          return;

        }

        const confirmation = await interaction.channel.awaitMessageComponent({
          filter: i => i.user.id === userId,
          time: 15000
        }).catch(async () => {
          console.log('[' + reqId + ']     Interaction timed out. Cancelling!');
          await interaction.editReply({ content: 'Timed out!', embeds: [], components: [] }); // fallback
          console.log('[' + reqId + ']     Done!');
          return;
        });

        if (!confirmation) return;

        if (confirmation.customId === 'cancel') {
          console.log('[' + reqId + ']    Song denied by user!');
          await confirmation.update({ content: 'Cancelled!', components: [], embeds: [] });
          console.log('[' + reqId + ']     Done!');
          return;
        }

        // Confirmed
        console.log('[' + reqId + ']     Song confirmed! Adding...');

        const songHash = computeSongHash(track.name, track.artists.map(a => a.name));

        // Check if already in the sheet
        const existingHashes = await getAllMd5Hashes(config.googleSheetId, config.loggingSheetName);
        const isDupe = existingHashes.has(songHash);

        let flag = '';

        if (isDupe) {
          console.log('[' + reqId + ']     Detected duplicate! Adding flag \'R\'');
          flag += 'R';
        }

        const repeatText = (isDupe ? '[Repeat]' : '');
        const submission = await interaction.channel.send(`--\n<@${userId}> ${repeatText}\n**${track.name} - ${track.artists.map(a => a.name).join(', ')}**`); /*\n${track.external_urls.spotify}*/

        await appendRow(config.googleSheetId, config.loggingSheetName, [
          (isDupe ? "=INDIRECT(CONCATENATE(\"R\",ROW()-1,\"C1\"),FALSE)" : "=INDIRECT(CONCATENATE(\"R\",ROW()-1,\"C1\"),FALSE)+1"),
          ((isDupe || isManual) ? "=INDIRECT(CONCATENATE(\"R\",ROW()-1,\"C2\"),FALSE)" : "=INDIRECT(CONCATENATE(\"R\",ROW()-1,\"C2\"),FALSE)+1"),
          "FALSE",
          track.name,
          track.artists.map(a => a.name).join(','),
          track.album.name,
          interaction.user.id,
          "=LOOKUP(INDIRECT(CONCATENATE(\"R\",ROW(),\"C\",COLUMN()-1),FALSE),Users!$A$2:$A,Users!$B$2:$B)",
          getFormattedDateEST(),
          songHash,
          flag,
          submission.id
        ]);
        console.log('[' + reqId + ']     Added to sheet!');

        if (!isDupe) {
          await addToPlaylist(track.uri);
          console.log('[' + reqId + ']     Added to playlist!');
        } else {
          console.log('[' + reqId + ']     Skipped adding to playlist. (Duplicate)');
        }

        await interaction.editReply({ content: `Song added!`, components: [], embeds: [] });

      }

      console.log('[' + reqId + ']     Done!');

    } catch (err) {
      console.error('[' + reqId + '] SOTD failed!:', err);
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
  const norm = (s) => s.toLowerCase().replace(/[^\w\s]/gi, '').replace(/\s+/g, ' ').trim();
  const base = norm(name) + artists.map(norm).join('');
  return md5(base);
}

