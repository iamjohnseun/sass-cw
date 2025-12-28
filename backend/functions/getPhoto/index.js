const { app } = require('@azure/functions');
const { query, execute } = require('../utils/db');

app.http('getPhoto', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'photos/{id}',
  handler: async (request, context) => {
    try {
      const photoId = request.params.id;

      await execute(
        'UPDATE Photos SET Views = Views + 1 WHERE PhotoId = @photoId',
        { photoId }
      );

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
        return {
          status: 404,
          body: JSON.stringify({ error: 'Photo not found' })
        };
      }

      const comments = await query(
        `SELECT 
          c.CommentId, c.Text, c.CreatedAt,
          u.Name as UserName, u.ProfilePicture as UserPicture
        FROM Comments c
        INNER JOIN Users u ON c.UserId = u.UserId
        WHERE c.PhotoId = @photoId
        ORDER BY c.CreatedAt DESC`,
        { photoId }
      );

      return {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          photo: photos[0],
          comments
        })
      };
    } catch (err) {
      context.error('Error fetching photo:', err);
      return {
        status: 500,
        body: JSON.stringify({ error: 'Failed to fetch photo' })
      };
    }
  }
});
