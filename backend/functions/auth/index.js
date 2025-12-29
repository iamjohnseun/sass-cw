const { verifyGoogleToken } = require('../utils/auth');
const { query, execute } = require('../utils/db');

module.exports = async function (context, req) {
  try {
    const { token } = req.body;

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
      body: JSON.stringify({
        user: {
          userId: user.UserId,
          email: user.Email,
          name: user.Name,
          picture: user.ProfilePicture,
          role: user.Role
        },
        message: 'Authentication successful'
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    };
  } catch (err) {
    context.log.error('Auth error:', err);
    context.res = {
      status: 401,
      body: JSON.stringify({
        error: 'Authentication failed',
        details: err.message
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    };
  }
};

