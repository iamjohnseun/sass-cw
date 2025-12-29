const { query, execute } = require('../utils/db');

module.exports = async function (context, req) {
  try {
    const userId = req.params.id;
    const { adminId, newRole } = req.body || {};

    if (!adminId || !newRole) {
      context.res = {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'adminId and newRole are required' })
      };
      return;
    }

    const admins = await query(
      'SELECT Role FROM Users WHERE UserId = @adminId',
      { adminId }
    );

    if (admins.length === 0 || admins[0].Role !== 'admin') {
      context.res = {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Admin access required' })
      };
      return;
    }

    if (!['consumer', 'creator', 'admin'].includes(newRole)) {
      context.res = {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Invalid role' })
      };
      return;
    }

    await execute(
      'UPDATE Users SET Role = @newRole WHERE UserId = @userId',
      { userId, newRole }
    );

    context.res = {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ message: 'User role updated successfully' })
    };
  } catch (err) {
    context.log.error('Error updating user role:', err);
    context.res = {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Failed to update user role' })
    };
  }
};
