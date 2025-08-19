const { google } = require('googleapis');
const credentials = require('../secrets/google-credentials.json'); // path to your service account file
const config = require('../config.json'); // contains spreadsheet ID
const output = require('../utilities/output.js');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: SCOPES
});
const sheets = google.sheets({ version: 'v4', auth });

async function appendRow(spreadsheetId, sheetName, values) {
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetName}!A1`, // starts from A1, but appends to next empty row
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [values]
    }
  });
}

async function getAllMd5Hashes(spreadsheetId, md5Column = config.columnMd5) { //column J (index 9)
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${config.loggingSheetName}!A2:M`, // Start at row 3 to skip headers and blank row
  });

  const rows = res.data.values || [];
  const hashes = rows.map(row => row[md5Column]).filter(Boolean); // 1-based column index
  return new Set(hashes);
}

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

async function hasSubmittedToday(spreadsheetId, userId, requestId, fromMessage) {
  output.logr(`Checking for submissions today`, requestId, 1);

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${config.loggingSheetName}!A2:M`
  });

  const rows = res.data.values || [];
  const today = getFormattedDateEST();

  return rows.some(row => {
    const date = row[config.columns.date];
    const id = row[config.columns.userId];
    const flags = row[config.columns.flags] || '';

    // Check if user has submitted today
    // Will exempt an X flag if request is from a command
    const match = (date === today && id === userId);

    if (match) {
      // If there is any match for today
      output.logr(`Submission detected today`, requestId, 2);

      if (flags.includes('X')) {
        // Match has partial flag
        output.logr(`Partial submission`, requestId, 3);

        if (fromMessage) {
          output.logr(`Triggered via message`, requestId, 4);
          return true;
        } else {
          output.logr(`Triggered via command. Exempting...`, requestId, 4);
          return false;
        }
      } else {
        // Match does not have partial flag
        return true;
      }


    } else {
      // No matches today
      return false;
    }

  });
}

async function appendReactionEmoji(spreadsheetId, messageId, emojiRaw) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${config.loggingSheetName}!A2:M`
  });

  const rows = res.data.values || [];

  // Assume Message ID is in column L (index 11)
  const rowIndex = rows.findIndex(row => row[config.columns.messageId] === messageId);
  if (rowIndex === -1) return false;

  // Reactions column (e.g. column M = index 12)
  const colIndex = config.columns.reactions;
  const current = rows[rowIndex][colIndex] || '';

  // Replace custom emoji with *
  const emoji = emojiRaw.length > 2 ? '*' : emojiRaw;

  const updated = current.trim() + (current ? ' ' : '') + emoji;

  const cellRange = `${config.loggingSheetName}!${columnLetter(colIndex + 1)}${rowIndex + 2}`;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: cellRange,
    valueInputOption: 'RAW',
    requestBody: {
      values: [[updated]]
    }
  });

  return true;
}

async function updateTempRow(spreadsheetId, userId, date, values) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${config.loggingSheetName}!A2:M`
  });

  const rows = res.data.values || [];

  // Assume Message ID is in column L (index 11)
  const rowIndex = rows.findIndex(row => (row[config.columns.userId] === userId) && row[config.columns.date] === date);
  if (rowIndex === -1) return false;

  const cellRange = `${config.loggingSheetName}!A${rowIndex + 2}:L${rowIndex + 2}`;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: cellRange,
    valueInputOption: 'RAW',
    requestBody: {
      values: [values]
    }
  });

  return true;
}

async function getRow(spreadsheetId, userId, date) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${config.loggingSheetName}!A2:M`
  });

  const rows = res.data.values || [];

  const rowIndex = rows.findIndex(row => (row[config.columns.userId] === userId) && row[config.columns.date] === date);
  if (rowIndex === -1) return false;

  return rows[rowIndex];
}

function columnLetter(col) {
  let letter = '';
  while (col > 0) {
    const mod = (col - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    col = Math.floor((col - mod - 1) / 26);
  }
  return letter;
}

async function getRecentMessageIds(spreadsheetId, maxCount = 50) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${config.loggingSheetName}!A2:M`, // Adjust range if needed
  });

  const rows = res.data.values || [];

  // Only keep rows that have a message ID
  const messageIdIndex = config.columns.messageId;
  const validRows = rows.filter(row => row[messageIdIndex]);

  // Get the last `maxCount` message IDs
  const recent = validRows.slice(-maxCount).map(row => row[messageIdIndex]);

  return recent;
}

module.exports = { appendRow, getAllMd5Hashes, hasSubmittedToday, appendReactionEmoji, getRecentMessageIds, getFormattedDateEST, updateTempRow, getRow };