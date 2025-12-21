# PhotoShare - Scalable Photo Distribution Platform

A modern, cloud-native photo-sharing platform built on Azure, featuring a minimalist design and scalable architecture.

## 🎯 Features

### Consumer Features
- **Browse Photos**: View a beautiful gallery of shared photos
- **Search**: Search photos by title, caption, or location
- **Interact**: Like and comment on photos
- **Share**: Share photo links with others

### Creator Features
- **Upload Photos**: Upload and manage your photo collection
- **Photo Management**: Edit titles, captions, and locations
- **Analytics**: View likes and views on your photos
- **Delete**: Remove photos from the platform

### Admin Features
- **Dashboard**: Overview of platform statistics
- **Photo Management**: View and delete any photo
- **User Management**: Manage user roles (Consumer, Creator, Admin)
- **Analytics**: Platform-wide statistics

## 🏗️ Architecture

### Frontend
- **Vanilla JavaScript**: No framework dependencies
- **Responsive Design**: Mobile-first approach
- **Google Fonts**: Inter & Playfair Display for elegant typography
- **Static Hosting**: Served from Azure Blob Storage

### Backend
- **Azure Functions**: Serverless compute for API endpoints
- **Node.js**: JavaScript runtime (v18.x)
- **RESTful API**: Clean, predictable API design

### Database
- **Azure SQL Database**: Relational data storage
- **Serverless Tier**: Auto-scaling with free tier support

### Storage
- **Azure Blob Storage**: Photo and thumbnail storage
- **Public Access**: Direct serving of images

### Authentication
- **Google Sign-In**: OAuth 2.0 authentication
- **Role-Based Access**: Consumer, Creator, and Admin roles

## 📋 Prerequisites

- **Azure Account**: Free tier available
- **Node.js**: v18.x or later
- **Azure Functions Core Tools**: v4.x
- **Git**: For version control
- **Google Cloud Console Account**: For OAuth setup

## 🚀 Setup Instructions

### 1. Azure Resources Setup

#### Create Resource Group
```bash
az group create --name photoshare-rg --location eastus
```

#### Create Azure SQL Database
```bash
az sql server create \
  --name photoshare-sql-server \
  --resource-group photoshare-rg \
  --location eastus \
  --admin-user sqladmin \
  --admin-password <YourPassword>

az sql db create \
  --resource-group photoshare-rg \
  --server photoshare-sql-server \
  --name photoshare-db \
  --edition GeneralPurpose \
  --family Gen5 \
  --capacity 2 \
  --compute-model Serverless \
  --auto-pause-delay 60
```

#### Create Storage Account
```bash
az storage account create \
  --name photosharestorage \
  --resource-group photoshare-rg \
  --location eastus \
  --sku Standard_LRS \
  --kind StorageV2

# Enable static website hosting
az storage blob service-properties update \
  --account-name photosharestorage \
  --static-website \
  --index-document index.html
```

#### Create Azure Function App
```bash
az functionapp create \
  --resource-group photoshare-rg \
  --consumption-plan-location eastus \
  --runtime node \
  --runtime-version 18 \
  --functions-version 4 \
  --name photoshare-functions \
  --storage-account photosharestorage
```

### 2. Database Setup

Run the SQL schema from `config/database-schema.sql` in your Azure SQL Database using Azure Data Studio or SQL Server Management Studio.

### 3. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:7071/auth/google/callback` (development)
   - `https://your-function-app.azurewebsites.net/auth/google/callback` (production)
6. Copy Client ID and Client Secret

### 4. Configuration

#### Backend Configuration
1. Copy `backend/functions/local.settings.json` (already exists)
2. Update with your Azure credentials:
   - Azure SQL connection details
   - Storage account name and key
   - Google OAuth credentials

#### Frontend Configuration
1. Update `frontend/js/config.js`:
   - Set `API_CONFIG.baseUrl` to your Azure Functions URL
   - Set `GOOGLE_CONFIG.clientId` to your Google Client ID

### 5. Local Development

#### Backend
```bash
cd backend
npm install
cd functions
func start
```

#### Frontend
```bash
cd frontend
# Use any local server, e.g.:
python -m http.server 3000
# or
npx serve
```

### 6. Deployment

#### Option 1: GitHub Actions (Recommended)
1. Set up GitHub secrets:
   - `AZURE_FUNCTIONAPP_PUBLISH_PROFILE`
   - `AZURE_STORAGE_ACCOUNT_NAME`
   - `AZURE_STORAGE_ACCOUNT_KEY`
2. Push to main branch
3. GitHub Actions will automatically deploy

#### Option 2: Azure CLI
```bash
# Deploy Functions
cd backend/functions
func azure functionapp publish photoshare-functions

# Deploy Frontend
cd ../../frontend
az storage blob upload-batch \
  --account-name photosharestorage \
  --account-key <your-key> \
  --destination '$web' \
  --source . \
  --overwrite
```

## 📁 Project Structure

```
Scalable/
├── backend/
│   ├── functions/
│   │   ├── utils/
│   │   │   ├── auth.js         # Authentication helpers
│   │   │   ├── db.js           # Database connection
│   │   │   └── storage.js      # Blob storage helpers
│   │   ├── auth.js             # Auth endpoints
│   │   ├── photos.js           # Photo CRUD endpoints
│   │   ├── interactions.js     # Like/comment endpoints
│   │   ├── storage.js          # File upload endpoints
│   │   ├── host.json           # Functions host config
│   │   └── local.settings.json # Local environment vars
│   └── package.json
├── frontend/
│   ├── css/
│   │   ├── main.css           # Base styles
│   │   ├── components.css     # Component styles
│   │   └── dashboard.css      # Dashboard styles
│   ├── js/
│   │   ├── config.js          # App configuration
│   │   ├── auth.js            # Authentication logic
│   │   ├── api.js             # API helpers
│   │   ├── photos.js          # Photo gallery logic
│   │   ├── creator.js         # Creator dashboard
│   │   ├── admin.js           # Admin dashboard
│   │   └── main.js            # Main app logic
│   ├── index.html             # Main gallery page
│   ├── creator.html           # Creator dashboard
│   └── admin.html             # Admin dashboard
├── config/
│   ├── .env.example           # Environment variables template
│   ├── azure-functions-config.json
│   └── database-schema.sql    # Database schema
├── .github/
│   └── workflows/
│       └── azure-deploy.yml   # CI/CD pipeline
└── README.md
```

## 🔒 Security Considerations

- **Environment Variables**: Never commit credentials to Git
- **CORS**: Configure proper CORS settings in production
- **SQL Injection**: Uses parameterized queries
- **File Upload**: Validates file types and sizes
- **Authentication**: Google OAuth 2.0 for secure auth

## 💰 Cost Estimation

### Free Tier (12 months)
- **Azure Functions**: 1M executions/month free
- **Azure SQL**: 32GB serverless free
- **Blob Storage**: 5GB free/month
- **Total**: $0/month for first 12 months

### After Free Tier
- **App Service (B1)**: ~$54.75/month
- **Azure SQL**: Included in free tier
- **Storage**: ~$0.15/month (for 5GB)
- **Functions**: ~$0.20 per million executions
- **Total**: ~$55/month

## 🎨 Design Philosophy

- **Minimalism**: Clean, distraction-free interface
- **Typography**: Google Fonts (Inter + Playfair Display)
- **Colors**: Neutral palette with blue accents
- **Responsive**: Mobile-first design
- **Performance**: Optimized image loading
- **Accessibility**: Semantic HTML and ARIA labels

## 📚 API Endpoints

### Authentication
- `POST /api/auth/google` - Google Sign-In
- `GET /api/auth/user/{id}` - Get user details

### Photos
- `GET /api/photos` - List photos (with pagination & search)
- `GET /api/photos/{id}` - Get photo details
- `POST /api/photos/upload` - Upload photo (Creator only)
- `PUT /api/photos/{id}` - Update photo (Creator only)
- `DELETE /api/photos/{id}` - Delete photo (Creator/Admin)

### Interactions
- `POST /api/photos/{id}/like` - Toggle like
- `POST /api/photos/{id}/comments` - Add comment
- `DELETE /api/comments/{id}` - Delete comment

### Storage
- `POST /api/storage/upload` - Upload file to blob storage
- `DELETE /api/storage/{fileName}` - Delete file

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Linting
npm run lint
```

## 📝 Future Enhancements

- [ ] Image thumbnail generation
- [ ] Azure CDN integration
- [ ] Advanced search with filters
- [ ] Photo albums/collections
- [ ] Social features (follow users)
- [ ] Notifications
- [ ] Analytics dashboard
- [ ] Mobile app

## 👥 User Roles

### Consumer (Default)
- View photos
- Like and comment
- Search functionality

### Creator
- All consumer features
- Upload photos
- Edit own photos
- Delete own photos

### Admin
- All creator features
- Manage all photos
- Manage user roles
- View platform statistics

## 📄 License

This project is part of academic coursework.

## 🤝 Support

For issues or questions, please create an issue in the GitHub repository.

---

**Built with ❤️ using Azure, Node.js, and Vanilla JavaScript**
