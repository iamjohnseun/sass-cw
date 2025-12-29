const { verifyGoogleToken } = require('../utils/auth');
const { query, execute } = require('../utils/db');

module.exports = async function (context, req) {
  try {
    const { token } = req.body || {};

    if (!token) {
      context.res = {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Token is required' })
      };
      return;
    }

    const googleUser = await verifyGoogleToken(token);

    let users = await query(
      'SELECT * FROM Users WHERE GoogleId = @googleId',
      { googleId: googleUser.googleId }
    );

    let user;
    if (users.length === 0) {
      const result = await execute(
        `INSERT INTO Users (GoogleId, Email, Name, ProfilePicture, Role)
         OUTPUT INSERTED.*
         VALUES (@googleId, @email, @name, @picture, 'consumer')`,
        {
          googleId: googleUser.googleId,
          email: googleUser.email,
          name: googleUser.name,
          picture: googleUser.picture
        }
      );
      user = result.recordset[0];
    } else {
      user = users[0];
    }

    context.res = {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        user: {
          userId: user.UserId,
          email: user.Email,
          name: user.Name,
          picture: user.ProfilePicture,
          role: user.Role
        },
        message: 'Authentication successful'
      })
    };
  } catch (err) {
    context.log.error('Authentication error:', err);
    context.res = {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Authentication failed' })
    };
  }
};
