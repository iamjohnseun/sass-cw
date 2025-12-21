// API Configuration
const API_CONFIG = {
    // Update this with your Azure Functions URL
    baseUrl: 'https://your-function-app.azurewebsites.net/api',
    
    // Or for local development:
    // baseUrl: 'http://localhost:7071/api',
    
    endpoints: {
        // Auth
        googleAuth: '/auth/google',
        getUser: '/auth/user',
        updateUserRole: '/users/{id}/role',
        
        // Photos
        getPhotos: '/photos',
        getPhoto: '/photos/{id}',
        uploadPhoto: '/photos/upload',
        updatePhoto: '/photos/{id}',
        deletePhoto: '/photos/{id}',
        
        // Interactions
        likePhoto: '/photos/{id}/like',
        addComment: '/photos/{id}/comments',
        deleteComment: '/comments/{id}',
        
        // Storage
        uploadToStorage: '/storage/upload',
        deleteFromStorage: '/storage/{fileName}'
    }
};

// Google OAuth Configuration
const GOOGLE_CONFIG = {
    // Update this with your Google Client ID
    clientId: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com'
};

// App Configuration
const APP_CONFIG = {
    photosPerPage: 20,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedFileTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
};
