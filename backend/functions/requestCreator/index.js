const { execute } = require('../utils/db');

module.exports = async function (context, req) {
  try {
    const { userId, reason } = req.body;

    if (!userId) {
      context.res = {
        status: 400,
        body: JSON.stringify({
          error: 'User ID is required'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      };
      return;
    }

    // Automatically approve and update user role to creator
    const result = await execute(
      `UPDATE Users 
       SET Role = 'creator' 
       OUTPUT INSERTED.*
       WHERE UserId = @userId`,
      { userId }
    );

    if (!result.recordset || result.recordset.length === 0) {
      context.res = {
        status: 404,
        body: JSON.stringify({
          error: 'User not found'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      };
      return;
    }

    const user = result.recordset[0];

    context.log(`User ${userId} automatically approved as creator. Reason: ${reason || 'Not provided'}`);

    context.res = {
      status: 200,
      body: JSON.stringify({
        message: 'Creator access granted successfully',
        user: {
          userId: user.UserId,
          email: user.Email,
          name: user.Name,
          picture: user.ProfilePicture,
          role: user.Role
        }
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    };
  } catch (err) {
    context.log.error('Creator request error:', err);
    context.res = {
      status: 500,
      body: JSON.stringify({
        error: 'Failed to grant creator access',
        details: err.message
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    };
  }
};
