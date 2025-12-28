const { app } = require('@azure/functions');
const { uploadPhoto } = require('../utils/storage');
const multipart = require('parse-multipart');

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
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
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
