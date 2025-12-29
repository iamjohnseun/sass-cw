const { app } = require('@azure/functions');
const { query, execute } = require('./utils/db');

// Like a photo
app.http('likePhoto', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'photos/{id}/like',
  handler: async (request, context) => {
    try {
      const photoId = request.params.id;
      const body = await request.json();
      const { userId } = body;

      // Check if already liked
      const existing = await query(
        'SELECT LikeId FROM Likes WHERE PhotoId = @photoId AND UserId = @userId',
        { photoId, userId }
      );

      if (existing.length > 0) {
        // Unlike
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
        // Like
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

// Add comment
app.http('addComment', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'photos/{id}/comments',
  handler: async (request, context) => {
    try {
      const photoId = request.params.id;
      const body = await request.json();
      const { userId, text } = body;

      if (!text || text.trim().length === 0) {
        return {
          status: 400,
          body: JSON.stringify({ error: 'Comment text is required' })
        };
      }

      const result = await execute(
        `INSERT INTO Comments (PhotoId, UserId, Text)
         OUTPUT INSERTED.CommentId
         VALUES (@photoId, @userId, @text)`,
        { photoId, userId, text }
      );

      return {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          commentId: result.recordset[0].CommentId,
          message: 'Comment added successfully'
        })
      };
    } catch (err) {
      context.error('Error adding comment:', err);
      return {
        status: 500,
        body: JSON.stringify({ error: 'Failed to add comment' })
      };
    }
  }
});

// Delete comment
app.http('deleteComment', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'comments/{id}',
  handler: async (request, context) => {
    try {
      const commentId = request.params.id;
      const userId = request.query.get('userId');

      // Verify ownership
      const comments = await query(
        'SELECT UserId FROM Comments WHERE CommentId = @commentId',
        { commentId }
      );

      if (comments.length === 0) {
        return {
          status: 404,
          body: JSON.stringify({ error: 'Comment not found' })
        };
      }

      if (comments[0].UserId !== parseInt(userId)) {
        return {
          status: 403,
          body: JSON.stringify({ error: 'Unauthorized' })
        };
      }

      await execute('DELETE FROM Comments WHERE CommentId = @commentId', { commentId });

      return {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ message: 'Comment deleted successfully' })
      };
    } catch (err) {
      context.error('Error deleting comment:', err);
      return {
        status: 500,
        body: JSON.stringify({ error: 'Failed to delete comment' })
      };
    }
  }
});
