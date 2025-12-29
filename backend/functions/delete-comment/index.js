const { query, execute } = require('../utils/db');

module.exports = async function (context, req) {
  try {
    const commentId = req.params.id;
    const userId = req.query.userId;

    if (!commentId || !userId) {
      context.res = {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'commentId and userId are required' })
      };
      return;
    }

    const comments = await query(
      'SELECT CommentId, UserId FROM Comments WHERE CommentId = @commentId',
      { commentId }
    );

    if (comments.length === 0) {
      context.res = {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Comment not found' })
      };
      return;
    }

    const users = await query(
      'SELECT Role FROM Users WHERE UserId = @userId',
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

    const isOwner = comments[0].UserId === parseInt(userId, 10);
    const isAdmin = users[0].Role === 'admin';

    if (!isOwner && !isAdmin) {
      context.res = {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Unauthorized' })
      };
      return;
    }

    await execute('DELETE FROM Comments WHERE CommentId = @commentId', { commentId });

    context.res = {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ message: 'Comment deleted successfully' })
    };
  } catch (err) {
    context.log.error('Error deleting comment:', err);
    context.res = {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Failed to delete comment' })
    };
  }
};
