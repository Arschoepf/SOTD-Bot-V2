const axios = require('axios');
const config = require('../config.json');

let cachedToken = null;
let tokenExpiresAt = 0;

async function getSpotifyToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt) return cachedToken;

  const res = await axios.post('https://accounts.spotify.com/api/token',
    new URLSearchParams({ grant_type: 'client_credentials' }), {
    headers: {
      'Authorization': 'Basic ' + Buffer.from(
        config.spotifyClientId + ':' + config.spotifyClientSecret
      ).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  cachedToken = res.data.access_token;
  tokenExpiresAt = now + (res.data.expires_in * 1000) - 60000;
  return cachedToken;
}

async function searchSpotifyTrack(query) {
  const token = await getSpotifyToken();
  const res = await axios.get('https://api.spotify.com/v1/search', {
    headers: { Authorization: `Bearer ${token}` },
    params: {
      q: query,
      type: 'track',
      limit: 1
    }
  });

  return res.data.tracks.items[0];

}

async function getSpotifyTrack(link) {
  const token = await getSpotifyToken();
  const trackId = getSpotifyTrackId(link)
  const res = await axios.get('https://api.spotify.com/v1/tracks/' + trackId, {
    headers: { Authorization: `Bearer ${token}` },
    params: {}
  });

  return res.data;
}

module.exports = {
  searchSpotifyTrack,
  getSpotifyTrack
};

async function getSpotifyTrackId(input) {
  if (!input) return null;

  // Match full URL (with or without query string)
  const urlMatch = input.match(/spotify\.com\/track\/([a-zA-Z0-9]{22})/);
  if (urlMatch) return urlMatch[1];

  // If it's just the raw ID (22-char alphanumeric)
  const idMatch = input.match(/^[a-zA-Z0-9]{22}$/);
  if (idMatch) return input;

  return null;
}
