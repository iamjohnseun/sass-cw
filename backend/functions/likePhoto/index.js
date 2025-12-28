const { app } = require('@azure/functions');
const { query, execute } = require('../utils/db');

app.http('likePhoto', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'photos/{id}/like',
  handler: async (request, context) => {
    try {
      const photoId = request.params.id;
      const body = await request.json();
      const { userId } = body;

      const existing = await query(
        'SELECT LikeId FROM Likes WHERE PhotoId = @photoId AND UserId = @userId',
        { photoId, userId }
      );

      if (existing.length > 0) {
        await execute(
          'DELETE FROM Likes WHERE PhotoId = @photoId AND UserId = @userId',
          { photoId, userId }
        );
        await execute(
          'UPDATE Photos SET Likes = Likes - 1 WHERE PhotoId = @photoId',
          { photoId }
        );

        return {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({ liked: false, message: 'Photo unliked' })
        };
      } else {
        await execute(
          'INSERT INTO Likes (PhotoId, UserId) VALUES (@photoId, @userId)',
          { photoId, userId }
        );
        await execute(
          'UPDATE Photos SET Likes = Likes + 1 WHERE PhotoId = @photoId',
          { photoId }
        );

        return {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({ liked: true, message: 'Photo liked' })
        };
      }
    } catch (err) {
      context.error('Error toggling like:', err);
      return {
        status: 500,
        body: JSON.stringify({ error: 'Failed to toggle like' })
      };
    }
  }
});
