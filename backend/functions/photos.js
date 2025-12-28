const { app } = require('@azure/functions');
const { query, execute } = require('./utils/db');

// Get all photos (consumer view)
app.http('getPhotos', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'photos',
  handler: async (request, context) => {
    try {
      const searchTerm = request.query.get('search') || '';
      const page = parseInt(request.query.get('page') || '1');
      const limit = parseInt(request.query.get('limit') || '20');
      const offset = (page - 1) * limit;

      let queryText = `
        SELECT 
          p.PhotoId, p.Title, p.Caption, p.Location,
          p.ImageUrl, p.ThumbnailUrl, p.Views, p.Likes,
          p.CreatedAt, p.UpdatedAt,
          u.Name as CreatorName, u.ProfilePicture as CreatorPicture
        FROM Photos p
        INNER JOIN Users u ON p.UserId = u.UserId
        WHERE p.IsPublished = 1
      `;

      if (searchTerm) {
        queryText += ` AND (p.Title LIKE @search OR p.Caption LIKE @search OR p.Location LIKE @search)`;
      }

      queryText += ` ORDER BY p.CreatedAt DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;

      const photos = await query(queryText, {
        search: `%${searchTerm}%`,
        offset,
        limit
      });

      // Get total count
      let countQuery = `SELECT COUNT(*) as total FROM Photos p WHERE p.IsPublished = 1`;
      if (searchTerm) {
        countQuery += ` AND (p.Title LIKE @search OR p.Caption LIKE @search OR p.Location LIKE @search)`;
      }
      const countResult = await query(countQuery, { search: `%${searchTerm}%` });
      const total = countResult[0].total;

      return {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          photos,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        })
      };
    } catch (err) {
      context.error('Error fetching photos:', err);
      return {
        status: 500,
        body: JSON.stringify({ error: 'Failed to fetch photos' })
      };
    }
  }
});

// Get single photo details
app.http('getPhoto', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'photos/{id}',
  handler: async (request, context) => {
    try {
      const photoId = request.params.id;

      // Increment view count
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

      // Get comments
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

// Upload photo (creator only)
app.http('uploadPhoto', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'photos/upload',
  handler: async (request, context) => {
    try {
      const body = await request.json();
      const { userId, title, caption, location, imageUrl, thumbnailUrl } = body;

      // Verify user is a creator
      const users = await query(
        'SELECT Role FROM Users WHERE UserId = @userId',
        { userId }
      );

      if (users.length === 0 || users[0].Role !== 'creator') {
        return {
          status: 403,
          body: JSON.stringify({ error: 'Only creators can upload photos' })
        };
      }

      const result = await execute(
        `INSERT INTO Photos (UserId, Title, Caption, Location, ImageUrl, ThumbnailUrl)
         OUTPUT INSERTED.PhotoId
         VALUES (@userId, @title, @caption, @location, @imageUrl, @thumbnailUrl)`,
        { userId, title, caption, location, imageUrl, thumbnailUrl }
      );

      return {
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
      context.error('Error uploading photo:', err);
      return {
        status: 500,
        body: JSON.stringify({ error: 'Failed to upload photo' })
      };
    }
  }
});

// Update photo (creator only)
app.http('updatePhoto', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'photos/{id}',
  handler: async (request, context) => {
    try {
      const photoId = request.params.id;
      const body = await request.json();
      const { userId, title, caption, location } = body;

      // Verify ownership
      const photos = await query(
        'SELECT UserId FROM Photos WHERE PhotoId = @photoId',
        { photoId }
      );

      if (photos.length === 0) {
        return {
          status: 404,
          body: JSON.stringify({ error: 'Photo not found' })
        };
      }

      if (photos[0].UserId !== userId) {
        return {
          status: 403,
          body: JSON.stringify({ error: 'Unauthorized' })
        };
      }

      await execute(
        `UPDATE Photos 
         SET Title = @title, Caption = @caption, Location = @location, UpdatedAt = GETUTCDATE()
         WHERE PhotoId = @photoId`,
        { photoId, title, caption, location }
      );

      return {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ message: 'Photo updated successfully' })
      };
    } catch (err) {
      context.error('Error updating photo:', err);
      return {
        status: 500,
        body: JSON.stringify({ error: 'Failed to update photo' })
      };
    }
  }
});

// Delete photo
app.http('deletePhoto', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'photos/{id}',
  handler: async (request, context) => {
    try {
      const photoId = request.params.id;
      const userId = request.query.get('userId');

      // Verify ownership or admin
      const photos = await query(
        'SELECT UserId FROM Photos WHERE PhotoId = @photoId',
        { photoId }
      );

      if (photos.length === 0) {
        return {
          status: 404,
          body: JSON.stringify({ error: 'Photo not found' })
        };
      }

      const users = await query(
        'SELECT Role FROM Users WHERE UserId = @userId',
        { userId }
      );

      if (photos[0].UserId !== parseInt(userId) && users[0].Role !== 'admin') {
        return {
          status: 403,
          body: JSON.stringify({ error: 'Unauthorized' })
        };
      }

      await execute('DELETE FROM Photos WHERE PhotoId = @photoId', { photoId });

      return {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ message: 'Photo deleted successfully' })
      };
    } catch (err) {
      context.error('Error deleting photo:', err);
      return {
        status: 500,
        body: JSON.stringify({ error: 'Failed to delete photo' })
      };
    }
  }
});
