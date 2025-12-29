module.exports = async function (context, req) {
  context.res = {
    status: 200,
    body: JSON.stringify({
      message: 'Test endpoint working',
      timestamp: new Date().toISOString(),
      env: {
        hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
        hasSqlServer: !!process.env.AZURE_SQL_SERVER,
        nodePath: process.env.NODE_PATH,
        workingDir: process.cwd()
      }
    }),
    headers: {
      'Content-Type': 'application/json'
    }
  };
};

