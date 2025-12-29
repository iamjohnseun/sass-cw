const { query } = require('../utils/db');

module.exports = async function (context, req) {
  try {
    const searchTerm = req.query.search || '';
    const page = parseInt(req.query.page || '1');
    const limit = parseInt(req.query.limit || '20');
    const offset = (page - 1) * limit;

    let queryText = `
      SELECT 
        p.PhotoId, p.Title, p.Caption, p.Location,
        p.ImageUrl, p.ThumbnailUrl, p.Views, p.Likes,
        p.CreatedAt, p.UpdatedAt,
        u.Name as CreatorName, u.ProfilePicture as CreatorPicture
      FROM Photos p
      LEFT JOIN Users u ON p.UserId = u.UserId
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
    const total = (countResult && countResult[0]) ? countResult[0].total : 0;

    context.res = {
      status: 200,
      body: JSON.stringify({
        photos: photos || [],
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 0
        }
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    };
  } catch (err) {
    context.log.error('Error fetching photos:', err);
    context.res = {
      status: 500,
      body: JSON.stringify({
        error: 'Failed to fetch photos',
        details: err.message
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    };
  }
};
