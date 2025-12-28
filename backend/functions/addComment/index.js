const { app } = require('@azure/functions');
const { query, execute } = require('../utils/db');

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
