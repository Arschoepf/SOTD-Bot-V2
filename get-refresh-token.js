const axios = require('axios');
const qs = require('querystring');
const config = require('./config.json');

// Replace with your values:
const clientId = config.spotifyClientId;
const clientSecret = config.spotifyClientSecret;
const redirectUri = 'https://wmtu.fm';
const authorizationCode = 'spotify-auth-token';

async function getRefreshToken() {
  try {
    const response = await axios.post(
      'https://accounts.spotify.com/api/token',
      qs.stringify({
        grant_type: 'authorization_code',
        code: authorizationCode,
        redirect_uri: redirectUri
      }),
      {
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    console.log('✅ Refresh Token:', response.data.refresh_token);
    console.log('Access Token (expires in 1h):', response.data.access_token);
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}

getRefreshToken();
