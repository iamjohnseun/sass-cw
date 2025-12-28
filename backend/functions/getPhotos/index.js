const { app } = require('@azure/functions');
const { query } = require('../utils/db');

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
      const total = countResult[0] ? countResult[0].total : 0;

      return {
        status: 200,
        jsonBody: {
          photos,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        }
      };
    } catch (err) {
      context.error('Error fetching photos:', err);
      return {
        status: 500,
        jsonBody: { error: 'Failed to fetch photos', details: err.message }
      };
    }
  }
});
