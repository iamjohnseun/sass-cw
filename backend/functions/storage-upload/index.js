const multipart = require('parse-multipart');
const { uploadPhoto } = require('../utils/storage');

module.exports = async function (context, req) {
  try {
    const contentType = req.headers['content-type'] || '';
    const boundary = multipart.getBoundary(contentType);

    if (!boundary) {
      context.res = {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Missing or invalid content-type boundary' })
      };
      return;
    }

    const bodyBuffer = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(req.body || []);

    const parts = multipart.Parse(bodyBuffer, boundary);

    if (!parts || parts.length === 0) {
      context.res = {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'No file found in upload' })
      };
      return;
    }

    const file = parts[0];
    const extension = file.filename && file.filename.includes('.')
      ? file.filename.substring(file.filename.lastIndexOf('.'))
      : '';
    const safeExtension = extension.length > 10 ? extension.slice(0, 10) : extension;
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e6)}${safeExtension}`;

    const imageUrl = await uploadPhoto(uniqueName, file.data, file.type || 'application/octet-stream');

    context.res = {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ imageUrl, fileName: uniqueName })
    };
  } catch (err) {
    context.log.error('Error uploading file to storage:', err);
    context.res = {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Failed to upload file' })
    };
  }
};
