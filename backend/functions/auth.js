const { app } = require('@azure/functions');
const { verifyGoogleToken } = require('../utils/auth');
const { query, execute } = require('../utils/db');

// Google Sign-In
app.http('googleAuth', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'auth/google',
  handler: async (request, context) => {
    try {
      const body = await request.json();
      const { token } = body;

      // Verify Google token
      const googleUser = await verifyGoogleToken(token);

      // Check if user exists
      let users = await query(
        'SELECT * FROM Users WHERE GoogleId = @googleId',
        { googleId: googleUser.googleId }
      );

      let user;
      if (users.length === 0) {
        // Create new user (default role: consumer)
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
        body: JSON.stringify({ error: 'Authentication failed' })
      };
    }
  }
});

// Get current user
app.http('getCurrentUser', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'auth/user/{id}',
  handler: async (request, context) => {
    try {
      const userId = request.params.id;

      const users = await query(
        'SELECT UserId, Email, Name, ProfilePicture, Role, CreatedAt FROM Users WHERE UserId = @userId',
        { userId }
      );

      if (users.length === 0) {
        return {
          status: 404,
          body: JSON.stringify({ error: 'User not found' })
        };
      }

      return {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ user: users[0] })
      };
    } catch (err) {
      context.error('Error fetching user:', err);
      return {
        status: 500,
        body: JSON.stringify({ error: 'Failed to fetch user' })
      };
    }
  }
});

// Update user role (admin only)
app.http('updateUserRole', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'users/{id}/role',
  handler: async (request, context) => {
    try {
      const userId = request.params.id;
      const body = await request.json();
      const { adminId, newRole } = body;

      // Verify admin
      const admins = await query(
        'SELECT Role FROM Users WHERE UserId = @adminId',
        { adminId }
      );

      if (admins.length === 0 || admins[0].Role !== 'admin') {
        return {
          status: 403,
          body: JSON.stringify({ error: 'Admin access required' })
        };
      }

      if (!['consumer', 'creator', 'admin'].includes(newRole)) {
        return {
          status: 400,
          body: JSON.stringify({ error: 'Invalid role' })
        };
      }

      await execute(
        'UPDATE Users SET Role = @newRole WHERE UserId = @userId',
        { userId, newRole }
      );

      return {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ message: 'User role updated successfully' })
      };
    } catch (err) {
      context.error('Error updating user role:', err);
      return {
        status: 500,
        body: JSON.stringify({ error: 'Failed to update user role' })
      };
    }
  }
});
