const { app } = require('@azure/functions');
const { verifyGoogleToken } = require('../utils/auth');
const { query, execute } = require('../utils/db');

app.http('googleAuth', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'auth/google',
  handler: async (request, context) => {
    try {
      const body = await request.json();
      const { token } = body;

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

      return {
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
      context.error('Authentication error:', err);
      return {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Authentication failed' })
      };
    }
  }
});
