const { query } = require('../utils/db');

module.exports = async function (context, req) {
  try {
    const userId = req.params.id;

    const users = await query(
      'SELECT UserId, Email, Name, ProfilePicture, Role, CreatedAt FROM Users WHERE UserId = @userId',
      { userId }
    );

    if (users.length === 0) {
      context.res = {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'User not found' })
      };
      return;
    }

    context.res = {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ user: users[0] })
    };
  } catch (err) {
    context.log.error('Error fetching user:', err);
    context.res = {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Failed to fetch user' })
    };
  }
};
