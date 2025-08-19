const { hasSubmittedToday, appendRow, getFormattedDateEST, updateTempRow, getAllMd5Hashes } = require('../google/sheets.js');
const config = require('../config.json');
const output = require('../utilities/output.js');
const { searchSpotifyTrack, getSpotifyTrack } = require('../spotify/spotify.js');
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } = require('discord.js');
const md5 = require('md5');

async function handleQuery(query, message, requestId, userId, isTrack = false, fromMessage = false) {
  if (await hasSubmittedToday(config.googleSheetId, userId, requestId, fromMessage)) {

    // Already submitted today
    message.reply(`Oi! One submission per day, goofball.\nIf you need to confirm a submission, you can use\n\`/sotd\`, \`/sotd-link\`, or \`/sotd-man\``);
    return;
  }

  output.logr(`User has not submitted today`, requestId, 2);
  let date = getFormattedDateEST();

  output.logr(`Appending temp row to sheet`, requestId, 2);
  await appendRow(config.googleSheetId, config.loggingSheetName, [
    "=INDIRECT(CONCATENATE(\"R\",ROW()-1,\"C1\"),FALSE)+IF(REGEXMATCH(INDIRECT(CONCATENATE(\"R\",ROW(),\"C11\"),FALSE),\"[R]\"),0,1)",  // Song Counter
    "=INDIRECT(CONCATENATE(\"R\",ROW()-1,\"C2\"),FALSE)+IF(REGEXMATCH(INDIRECT(CONCATENATE(\"R\",ROW(),\"C11\"),FALSE),\"[RN]\"),0,1)", // Playlist Counter
    "FALSE",
    "",
    "",
    "",
    message.author.id,
    "=LOOKUP(INDIRECT(CONCATENATE(\"R\",ROW(),\"C\",COLUMN()-1),FALSE),Users!$A$2:$A,Users!$B$2:$B)", // Lookup Name fron ID
    date,
    "",
    "X",
    message.id
  ]);

  let track;
  if (!isTrack) {
    output.logr(`Searching spotify for '${query}'`, requestId, 2);
    track = await searchSpotifyTrack(query);
  } else {
    track = await getSpotifyTrack(query);
  }

  output.logr(`Found track:`, requestId, 2);
  output.logr(`${track.name}`, requestId, 3);
  output.logr(`${track.artists.map(a => a.name)}`, requestId, 3);
  output.logr(`${track.album.name}`, requestId, 3);

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
  replyMessage = await message.reply({ embeds: [embed], components: [row] });

  const confirmation = await replyMessage.awaitMessageComponent({
    filter: i => i.user.id === userId,
    time: 15000
  }).catch(async () => {
    output.logr(`Interaction timed out. Cancelling!`, requestId, 2);
    await replyMessage.edit({ content: 'Timed out! Song was not added to playlist.', embeds: [], components: [] }); // fallback
    return;
  });

  if (!confirmation) return;

  if (confirmation.customId === 'cancel') {
    output.logr(`Song denied by user!`, requestId, 2);
    await confirmation.reply({ content: 'Cancelled!\nUse `\/sotd`, `\/sotd-link`, or `\/sotd-man` to add the correct song.', flags: MessageFlags.Ephemeral });
    await replyMessage.delete(); // Delete message
    return;
  }

  output.logr(`Song confirmed by user!`, requestId, 2);
  await confirmation.reply({ content: 'Song confirmed!', flags: MessageFlags.Ephemeral });
  await replyMessage.delete(); // Delete message when confirmed

  const songHash = computeSongHash(track.name, track.artists.map(a => a.name));

  // Check if already in the sheet
  const existingHashes = await getAllMd5Hashes(config.googleSheetId);
  const isDupe = existingHashes.has(songHash);

  let flag = '';

  if (isDupe) {
    console.log('[' + reqId + ']     Detected duplicate! Adding flag \'R\'');
    flag += 'R';
  }

  updateTempRow(config.googleSheetId, userId, date, [
    ,
    ,
    ,
    track.name,
    track.artists.map(a => a.name).join(', '),
    track.album.name,
    ,
    ,
    ,
    songHash,
    flag,
  ]);
}

module.exports = { handleQuery };

function computeSongHash(name, artists) {
  const norm = (s) => s.toLowerCase().replace(/[^\w\s]/gi, '').replace(/\s+/g, ' ').trim();
  const base = norm(name) + artists.map(norm).join('');
  return md5(base);
}