const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

async function verifyGoogleToken(token) {
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    return {
      googleId: payload['sub'],
      email: payload['email'],
      name: payload['name'],
      picture: payload['picture'],
      emailVerified: payload['email_verified']
    };
  } catch (err) {
    console.error('Token verification error:', err);
    throw new Error('Invalid token');
  }
}

function generateAuthUrl() {
  const redirectUri = process.env.GOOGLE_CALLBACK_URL;
  const scope = [
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email'
  ].join(' ');

  return `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${process.env.GOOGLE_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent(scope)}&` +
    `access_type=offline&` +
    `prompt=consent`;
}

async function exchangeCodeForToken(code) {
  try {
    const { tokens } = await client.getToken({
      code,
      redirect_uri: process.env.GOOGLE_CALLBACK_URL
    });
    
    return tokens;
  } catch (err) {
    console.error('Token exchange error:', err);
    throw new Error('Failed to exchange code for token');
  }
}

module.exports = {
  verifyGoogleToken,
  generateAuthUrl,
  exchangeCodeForToken
};
