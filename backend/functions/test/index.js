const { app } = require('@azure/functions');

app.http('test', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'test',
  handler: async (request, context) => {
    return {
      status: 200,
      jsonBody: {
        message: 'Test endpoint working',
        timestamp: new Date().toISOString(),
        env: {
          hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
          hasSqlServer: !!process.env.AZURE_SQL_SERVER,
          nodePath: process.env.NODE_PATH,
          workingDir: process.cwd()
        }
      }
    };
  }
});
