const { app } = require('@azure/functions');
const { verifyGoogleToken } = require('./utils/auth');
const { query, execute } = require('./utils/db');
const { uploadPhoto, deletePhoto } = require('./utils/storage');
const multipart = require('parse-multipart');

// ======================
// AUTH FUNCTIONS
// ======================

app.http('googleAuth', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'auth/google',
  handler: async (request, context) => {
    try {
      const body = await request.json();
      const { token } = body;

      const googleUser = await verifyGoogleToken(token);

      let users = await query(
        'SELECT * FROM Users WHERE GoogleId = @googleId',
        { googleId: googleUser.googleId }
      );

      let user;
      if (users.length === 0) {
        const result = await execute(
          `INSERT INTO Users (GoogleId, Email, Name, ProfilePicture, Role)
           OUTPUT INSERTED.*
           VALUES (@googleId, @email, @name, @picture, 'consumer')`,
          {
            googleId: googleUser.googleId,
            email: googleUser.email,
            name: googleUser.name,
            picture: googleUser.picture
          }
        );
        user = result.recordset[0];
      } else {
        user = users[0];
      }

      return {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          user: {
            userId: user.UserId,
            email: user.Email,
            name: user.Name,
            picture: user.ProfilePicture,
            role: user.Role
          },
          message: 'Authentication successful'
        })
      };
    } catch (err) {
      context.error('Authentication error:', err);
      return {
        status: 401,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Authentication failed' })
      };
    }
  }
});

// ======================
// PHOTO RETRIEVAL
// ======================

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

      let countQuery = `SELECT COUNT(*) as total FROM Photos p WHERE p.IsPublished = 1`;
      if (searchTerm) {
        countQuery += ` AND (p.Title LIKE @search OR p.Caption LIKE @search OR p.Location LIKE @search)`;
      }
      const countResult = await query(countQuery, { search: `%${searchTerm}%` });
      const total = countResult[0].total;

      return {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
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
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
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

// ======================
// PHOTO INTERACTIONS
// ======================

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
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
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
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
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
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
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

// ======================
// STORAGE OPERATIONS
// ======================

app.http('uploadToStorage', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'storage/upload',
  handler: async (request, context) => {
    try {
      const contentType = request.headers.get('content-type');
      
      if (!contentType || !contentType.includes('multipart/form-data')) {
        return {
          status: 400,
          body: JSON.stringify({ error: 'Content-Type must be multipart/form-data' })
        };
      }

      const bodyBuffer = await request.arrayBuffer();
      const boundary = multipart.getBoundary(contentType);
      const parts = multipart.Parse(Buffer.from(bodyBuffer), boundary);

      if (!parts || parts.length === 0) {
        return {
          status: 400,
          body: JSON.stringify({ error: 'No file uploaded' })
        };
      }

      const filePart = parts[0];
      const fileName = `${Date.now()}-${filePart.filename}`;
      const mimeType = filePart.type;

      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(mimeType)) {
        return {
          status: 400,
          body: JSON.stringify({ error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' })
        };
      }

      const maxSize = 10 * 1024 * 1024;
      if (filePart.data.length > maxSize) {
        return {
          status: 400,
          body: JSON.stringify({ error: 'File size exceeds 10MB limit' })
        };
      }

      const imageUrl = await uploadPhoto(fileName, filePart.data, mimeType);

      return {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          imageUrl,
          fileName,
          message: 'File uploaded successfully'
        })
      };
    } catch (err) {
      context.error('Upload error:', err);
      return {
        status: 500,
        body: JSON.stringify({ error: 'Failed to upload file' })
      };
    }
  }
});
