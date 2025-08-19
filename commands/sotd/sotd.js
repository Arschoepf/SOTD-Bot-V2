const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } = require('discord.js');
const { searchSpotifyTrack } = require('../../spotify/spotify.js');
const { appendRow, getAllMd5Hashes, hasSubmittedToday } = require('../../google/sheets.js');
const config = require('../../config.json'); // contains spreadsheet ID
const { addToPlaylist } = require('../../spotify/playlist.js');
const md5 = require('md5');
const { handleQuery } = require('../../sotd/handleQuery.js');


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

    const requestId = md5(new Date()).slice(0, 8);
    const userId = interaction.user.id;
    const isLink = false;
    const fromMessage = false;

    handleQuery(query, interaction, requestId, userId, isLink, fromMessage);
  }
};