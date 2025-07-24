const { google } = require('googleapis');
const credentials = require('../secrets/google-credentials.json'); // path to your service account file
const config = require('../config.json'); // contains spreadsheet ID

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

async function getAllMd5Hashes(spreadsheetId, sheetName, md5Column = config.columnMd5) { //column J (index 9)
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A2:M`, // Start at row 3 to skip headers and blank row
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

async function hasSubmittedToday(spreadsheetId, sheetName, userId) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A2:M`
  });

  const rows = res.data.values || [];
  const today = getFormattedDateEST();

  return rows.some(row => {
    const date = row[config.columnDate];
    const id = row[config.columnUserId];
    const flags = row[config.columnFlags];
    return (date === today && id === userId && !flags.includes('X'));
  });
}

async function appendReactionEmoji(spreadsheetId, sheetName, messageId, emojiRaw) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A2:M`
  });

  const rows = res.data.values || [];

  // Assume Message ID is in column L (index 11)
  const rowIndex = rows.findIndex(row => row[config.columnMessage] === messageId);
  if (rowIndex === -1) return false;

  // Reactions column (e.g. column M = index 12)
  const colIndex = config.columnReactions;
  const current = rows[rowIndex][colIndex] || '';

  // Replace custom emoji with *
  const emoji = emojiRaw.length > 2 ? '*' : emojiRaw;

  const updated = current.trim() + (current ? ' ' : '') + emoji;

  const cellRange = `${sheetName}!${columnLetter(colIndex + 1)}${rowIndex + 2}`;

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

function columnLetter(col) {
  let letter = '';
  while (col > 0) {
    const mod = (col - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    col = Math.floor((col - mod - 1) / 26);
  }
  return letter;
}

module.exports = { appendRow, getAllMd5Hashes, hasSubmittedToday, appendReactionEmoji };