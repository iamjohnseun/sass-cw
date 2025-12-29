const { deletePhoto } = require('../utils/storage');

module.exports = async function (context, req) {
  try {
    const fileName = decodeURIComponent(req.params.fileName || '');

    if (!fileName) {
      context.res = {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'fileName is required' })
      };
      return;
    }

    await deletePhoto(fileName);

    context.res = {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ message: 'File deleted successfully' })
    };
  } catch (err) {
    context.log.error('Error deleting file from storage:', err);
    context.res = {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Failed to delete file' })
    };
  }
};
