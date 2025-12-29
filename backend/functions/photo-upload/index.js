const { query, execute } = require('../utils/db');

module.exports = async function (context, req) {
  try {
    const { userId, title, caption, location, imageUrl, thumbnailUrl } = req.body || {};

    if (!userId || !title || !imageUrl) {
      context.res = {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'userId, title, and imageUrl are required' })
      };
      return;
    }

    const users = await query(
      'SELECT Role FROM Users WHERE UserId = @userId',
      { userId }
    );

    if (users.length === 0 || users[0].Role !== 'creator') {
      context.res = {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Only creators can upload photos' })
      };
      return;
    }

    const result = await execute(
      `INSERT INTO Photos (UserId, Title, Caption, Location, ImageUrl, ThumbnailUrl)
       OUTPUT INSERTED.PhotoId
       VALUES (@userId, @title, @caption, @location, @imageUrl, @thumbnailUrl)`,
      { userId, title, caption, location, imageUrl, thumbnailUrl }
    );

    context.res = {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        photoId: result.recordset[0].PhotoId,
        message: 'Photo uploaded successfully'
      })
    };
  } catch (err) {
    context.log.error('Error uploading photo:', err);
    context.res = {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Failed to upload photo' })
    };
  }
};
