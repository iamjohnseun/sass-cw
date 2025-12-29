const { query, execute } = require('../utils/db');

module.exports = async function (context, req) {
  try {
    const photoId = req.params.id;
    const { userId } = req.body || {};

    if (!userId) {
      context.res = {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'userId is required' })
      };
      return;
    }

    const existing = await query(
      'SELECT LikeId FROM Likes WHERE PhotoId = @photoId AND UserId = @userId',
      { photoId, userId }
    );

    if (existing.length > 0) {
      await execute('DELETE FROM Likes WHERE PhotoId = @photoId AND UserId = @userId', { photoId, userId });
      await execute('UPDATE Photos SET Likes = Likes - 1 WHERE PhotoId = @photoId', { photoId });

      context.res = {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ liked: false, message: 'Photo unliked' })
      };
    } else {
      await execute('INSERT INTO Likes (PhotoId, UserId) VALUES (@photoId, @userId)', { photoId, userId });
      await execute('UPDATE Photos SET Likes = Likes + 1 WHERE PhotoId = @photoId', { photoId });

      context.res = {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ liked: true, message: 'Photo liked' })
      };
    }
  } catch (err) {
    context.log.error('Error toggling like:', err);
    context.res = {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Failed to toggle like' })
    };
  }
};
