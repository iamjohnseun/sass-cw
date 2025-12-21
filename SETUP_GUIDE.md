# SETUP_GUIDE.md

## Complete Setup Guide for PhotoShare

This guide will walk you through setting up PhotoShare from scratch.

## Part 1: Azure Setup

### Step 1: Create Azure Resources

1. **Login to Azure**:
   ```bash
   az login
   ```

2. **Create Resource Group**:
   ```bash
   az group create --name photoshare-rg --location eastus
   ```

3. **Create Storage Account**:
   ```bash
   az storage account create \
     --name photosharestorage123 \
     --resource-group photoshare-rg \
     --location eastus \
     --sku Standard_LRS
   
   # Get connection string
   az storage account show-connection-string \
     --name photosharestorage123 \
     --resource-group photoshare-rg
   ```

4. **Create Blob Container**:
   ```bash
   az storage container create \
     --name photos \
     --account-name photosharestorage123 \
     --public-access blob
   ```

5. **Enable Static Website**:
   ```bash
   az storage blob service-properties update \
     --account-name photosharestorage123 \
     --static-website \
     --index-document index.html
   ```

6. **Create SQL Server**:
   ```bash
   az sql server create \
     --name photoshare-sql \
     --resource-group photoshare-rg \
     --location eastus \
     --admin-user sqladmin \
     --admin-password YourPassword123!
   ```

7. **Create SQL Database**:
   ```bash
   az sql db create \
     --resource-group photoshare-rg \
     --server photoshare-sql \
     --name photoshare-db \
     --edition GeneralPurpose \
     --family Gen5 \
     --capacity 1 \
     --compute-model Serverless \
     --auto-pause-delay 60
   ```

8. **Configure Firewall**:
   ```bash
   az sql server firewall-rule create \
     --resource-group photoshare-rg \
     --server photoshare-sql \
     --name AllowAzureServices \
     --start-ip-address 0.0.0.0 \
     --end-ip-address 0.0.0.0
   ```

9. **Create Function App**:
   ```bash
   az functionapp create \
     --resource-group photoshare-rg \
     --consumption-plan-location eastus \
     --runtime node \
     --runtime-version 18 \
     --functions-version 4 \
     --name photoshare-func-123 \
     --storage-account photosharestorage123
   ```

### Step 2: Setup Database

1. Connect to your Azure SQL Database using Azure Data Studio or SQL Server Management Studio

2. Run the SQL script from `config/database-schema.sql`

3. Verify tables were created:
   ```sql
   SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'
   ```

## Part 2: Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)

2. Create a new project: "PhotoShare"

3. Enable APIs:
   - Google+ API
   - Google Identity

4. Configure OAuth Consent Screen:
   - User Type: External
   - App name: PhotoShare
   - Support email: Your email
   - Scopes: email, profile

5. Create OAuth 2.0 Client ID:
   - Application type: Web application
   - Name: PhotoShare Web Client
   - Authorized JavaScript origins:
     - `http://localhost:3000`
     - `https://photosharestorage123.z13.web.core.windows.net`
   - Authorized redirect URIs:
     - `http://localhost:7071/auth/google/callback`
     - `https://photoshare-func-123.azurewebsites.net/auth/google/callback`

6. Copy your Client ID and Client Secret

## Part 3: Configuration

### Backend Configuration

1. Navigate to `backend/functions/local.settings.json`

2. Update with your credentials:
   ```json
   {
     "IsEncrypted": false,
     "Values": {
       "AZURE_SQL_SERVER": "photoshare-sql.database.windows.net",
       "AZURE_SQL_DATABASE": "photoshare-db",
       "AZURE_SQL_USER": "sqladmin",
       "AZURE_SQL_PASSWORD": "YourPassword123!",
       "AZURE_STORAGE_ACCOUNT_NAME": "photosharestorage123",
       "AZURE_STORAGE_ACCOUNT_KEY": "<your-storage-key>",
       "GOOGLE_CLIENT_ID": "<your-google-client-id>",
       "GOOGLE_CLIENT_SECRET": "<your-google-client-secret>"
     }
   }
   ```

### Frontend Configuration

1. Update `frontend/js/config.js`:
   ```javascript
   const API_CONFIG = {
     baseUrl: 'http://localhost:7071/api', // or your Azure Functions URL
     // ...
   };
   
   const GOOGLE_CONFIG = {
     clientId: '<your-google-client-id>'
   };
   ```

2. Update `frontend/index.html` line with Google Client ID:
   ```html
   <div id="g_id_onload"
        data-client_id="<your-google-client-id>"
        ...>
   </div>
   ```

## Part 4: Local Development

### Backend

1. Install dependencies:
   ```bash
   cd backend
   npm install
   ```

2. Install Azure Functions Core Tools:
   ```bash
   npm install -g azure-functions-core-tools@4
   ```

3. Start the Functions:
   ```bash
   cd functions
   func start
   ```

### Frontend

1. Serve the frontend:
   ```bash
   cd frontend
   python3 -m http.server 3000
   # or
   npx serve -p 3000
   ```

2. Open browser to `http://localhost:3000`

## Part 5: Testing Locally

1. Sign in with Google
2. Upload a test photo (if you're a creator)
3. Like and comment on photos
4. Test search functionality

## Part 6: Deployment

### Deploy Functions

```bash
cd backend/functions
func azure functionapp publish photoshare-func-123
```

### Deploy Frontend

```bash
cd frontend
az storage blob upload-batch \
  --account-name photosharestorage123 \
  --destination '$web' \
  --source . \
  --overwrite
```

### Configure Function App Settings

```bash
az functionapp config appsettings set \
  --name photoshare-func-123 \
  --resource-group photoshare-rg \
  --settings \
  AZURE_SQL_SERVER="photoshare-sql.database.windows.net" \
  AZURE_SQL_DATABASE="photoshare-db" \
  AZURE_SQL_USER="sqladmin" \
  AZURE_SQL_PASSWORD="YourPassword123!" \
  GOOGLE_CLIENT_ID="<your-client-id>" \
  GOOGLE_CLIENT_SECRET="<your-client-secret>"
```

## Part 7: GitHub CI/CD Setup

1. Get Function App Publish Profile:
   ```bash
   az functionapp deployment list-publishing-profiles \
     --name photoshare-func-123 \
     --resource-group photoshare-rg \
     --xml
   ```

2. Add GitHub Secrets:
   - Go to repository Settings > Secrets and variables > Actions
   - Add:
     - `AZURE_FUNCTIONAPP_PUBLISH_PROFILE`: The XML from step 1
     - `AZURE_STORAGE_ACCOUNT_NAME`: photosharestorage123
     - `AZURE_STORAGE_ACCOUNT_KEY`: Your storage key

3. Update `.github/workflows/azure-deploy.yml` with your function app name

4. Push to main branch to trigger deployment

## Troubleshooting

### Database Connection Issues
- Check firewall rules
- Verify connection string
- Ensure SQL Database is not paused

### Authentication Issues
- Verify Google OAuth credentials
- Check redirect URIs match exactly
- Clear browser cache

### CORS Issues
- Configure CORS in Azure Functions:
  ```bash
  az functionapp cors add \
    --name photoshare-func-123 \
    --resource-group photoshare-rg \
    --allowed-origins '*'
  ```

### File Upload Issues
- Check blob container permissions
- Verify storage account key
- Check file size limits

## Next Steps

1. Create an admin user manually in the database
2. Upload test photos
3. Customize the design
4. Add your university branding
5. Prepare presentation materials

## Support

Refer to Azure documentation:
- [Azure Functions](https://docs.microsoft.com/azure/azure-functions/)
- [Azure SQL Database](https://docs.microsoft.com/azure/sql-database/)
- [Azure Blob Storage](https://docs.microsoft.com/azure/storage/blobs/)
