const axios = require('axios');
const config = require('../config.json');

async function getAccessToken() {
  const res = await axios.post('https://accounts.spotify.com/api/token',
    new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: config.spotifyRefreshToken
    }),
    {
      headers: {
        Authorization: 'Basic ' + Buffer.from(
          config.spotifyClientId + ':' + config.spotifyClientSecret
        ).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  );

  return res.data.access_token;
}

async function addToPlaylist(trackUri) {
  const accessToken = await getAccessToken();

  const res = await axios.post(
    `https://api.spotify.com/v1/playlists/${config.spotifyPlaylistId}/tracks`,
    { uris: [trackUri] },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return res.data;
}

module.exports = { addToPlaylist };
