const { query, execute } = require('../utils/db');

module.exports = async function (context, req) {
  try {
    const photoId = req.params.id;
    const { userId, text } = req.body || {};

    if (!photoId || !userId || !text || !text.trim()) {
      context.res = {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'photoId, userId, and text are required' })
      };
      return;
    }

    const users = await query(
      'SELECT UserId, Name, ProfilePicture FROM Users WHERE UserId = @userId',
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

    const photos = await query(
      'SELECT PhotoId FROM Photos WHERE PhotoId = @photoId AND IsPublished = 1',
      { photoId }
    );

    if (photos.length === 0) {
      context.res = {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Photo not found or unpublished' })
      };
      return;
    }

    const sanitizedText = text.trim();

    const result = await execute(
      `INSERT INTO Comments (PhotoId, UserId, Text)
       OUTPUT INSERTED.CommentId, INSERTED.CreatedAt
       VALUES (@photoId, @userId, @text)`,
      { photoId, userId, text: sanitizedText }
    );

    const inserted = result.recordset[0];

    context.res = {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        comment: {
          commentId: inserted.CommentId,
          text: sanitizedText,
          createdAt: inserted.CreatedAt,
          userName: users[0].Name,
          userPicture: users[0].ProfilePicture
        },
        message: 'Comment added successfully'
      })
    };
  } catch (err) {
    context.log.error('Error adding comment:', err);
    context.res = {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Failed to add comment' })
    };
  }
};
