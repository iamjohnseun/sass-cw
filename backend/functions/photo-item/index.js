const { query, execute } = require('../utils/db');

module.exports = async function (context, req) {
  const method = (req.method || '').toUpperCase();
  const photoId = req.params.id;

  try {
    if (method === 'GET') {
      await execute('UPDATE Photos SET Views = Views + 1 WHERE PhotoId = @photoId', { photoId });

      const photos = await query(
        `SELECT 
          p.PhotoId, p.Title, p.Caption, p.Location,
          p.ImageUrl, p.ThumbnailUrl, p.Views, p.Likes,
          p.CreatedAt, p.UpdatedAt,
          u.Name as CreatorName, u.ProfilePicture as CreatorPicture,
          u.UserId
        FROM Photos p
        INNER JOIN Users u ON p.UserId = u.UserId
        WHERE p.PhotoId = @photoId AND p.IsPublished = 1`,
        { photoId }
      );

      if (photos.length === 0) {
        context.res = {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({ error: 'Photo not found' })
        };
        return;
      }

      const comments = await query(
        `SELECT 
          c.CommentId, c.Text, c.CreatedAt, c.UserId,
          u.Name as UserName, u.ProfilePicture as UserPicture
        FROM Comments c
        INNER JOIN Users u ON c.UserId = u.UserId
        WHERE c.PhotoId = @photoId
        ORDER BY c.CreatedAt DESC`,
        { photoId }
      );

      context.res = {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ photo: photos[0], comments })
      };
      return;
    }

    if (method === 'PUT') {
      const { userId, title, caption, location } = req.body || {};

      const photos = await query(
        'SELECT UserId FROM Photos WHERE PhotoId = @photoId',
        { photoId }
      );

      if (photos.length === 0) {
        context.res = {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({ error: 'Photo not found' })
        };
        return;
      }

      if (photos[0].UserId !== userId) {
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

      await execute(
        `UPDATE Photos 
         SET Title = @title, Caption = @caption, Location = @location, UpdatedAt = GETUTCDATE()
         WHERE PhotoId = @photoId`,
        { photoId, title, caption, location }
      );

      context.res = {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ message: 'Photo updated successfully' })
      };
      return;
    }

    if (method === 'DELETE') {
      const userId = req.query.userId;

      const photos = await query(
        'SELECT UserId FROM Photos WHERE PhotoId = @photoId',
        { photoId }
      );

      if (photos.length === 0) {
        context.res = {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({ error: 'Photo not found' })
        };
        return;
      }

      const users = await query(
        'SELECT Role FROM Users WHERE UserId = @userId',
        { userId }
      );

      if (users.length === 0 || (photos[0].UserId !== parseInt(userId, 10) && users[0].Role !== 'admin')) {
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

      await execute('DELETE FROM Photos WHERE PhotoId = @photoId', { photoId });

      context.res = {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ message: 'Photo deleted successfully' })
      };
      return;
    }

    context.res = {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  } catch (err) {
    context.log.error('Error handling photo item:', err);
    context.res = {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Failed to process photo request' })
    };
  }
};
