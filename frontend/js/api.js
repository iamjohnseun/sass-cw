// API Helper Functions

async function apiRequest(endpoint, options = {}) {
    try {
        const url = `${API_CONFIG.baseUrl}${endpoint}`;
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Request failed');
        }
        
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Photo API functions
const PhotoAPI = {
    async getPhotos(page = 1, search = '') {
        const params = new URLSearchParams({ page, limit: APP_CONFIG.photosPerPage });
        if (search) params.append('search', search);
        
        return apiRequest(`${API_CONFIG.endpoints.getPhotos}?${params}`);
    },
    
    async getPhoto(photoId) {
        const endpoint = API_CONFIG.endpoints.getPhoto.replace('{id}', photoId);
        return apiRequest(endpoint);
    },
    
    async uploadPhoto(photoData) {
        return apiRequest(API_CONFIG.endpoints.uploadPhoto, {
            method: 'POST',
            body: JSON.stringify(photoData)
        });
    },
    
    async updatePhoto(photoId, photoData) {
        const endpoint = API_CONFIG.endpoints.updatePhoto.replace('{id}', photoId);
        return apiRequest(endpoint, {
            method: 'PUT',
            body: JSON.stringify(photoData)
        });
    },
    
    async deletePhoto(photoId, userId) {
        const endpoint = API_CONFIG.endpoints.deletePhoto.replace('{id}', photoId);
        return apiRequest(`${endpoint}?userId=${userId}`, {
            method: 'DELETE'
        });
    },
    
    async likePhoto(photoId, userId) {
        const endpoint = API_CONFIG.endpoints.likePhoto.replace('{id}', photoId);
        return apiRequest(endpoint, {
            method: 'POST',
            body: JSON.stringify({ userId })
        });
    },
    
    async addComment(photoId, userId, text) {
        const endpoint = API_CONFIG.endpoints.addComment.replace('{id}', photoId);
        return apiRequest(endpoint, {
            method: 'POST',
            body: JSON.stringify({ userId, text })
        });
    },
    
    async deleteComment(commentId, userId) {
        const endpoint = API_CONFIG.endpoints.deleteComment.replace('{id}', commentId);
        return apiRequest(`${endpoint}?userId=${userId}`, {
            method: 'DELETE'
        });
    }
};

// Storage API functions
const StorageAPI = {
    async uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.uploadToStorage}`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Upload failed');
        }
        
        return response.json();
    },
    
    async deleteFile(fileName) {
        const endpoint = API_CONFIG.endpoints.deleteFromStorage.replace('{fileName}', fileName);
        return apiRequest(endpoint, {
            method: 'DELETE'
        });
    }
};

// User API functions
const UserAPI = {
    async getUser(userId) {
        const endpoint = API_CONFIG.endpoints.getUser.replace('{id}', userId);
        return apiRequest(endpoint);
    },
    
    async updateUserRole(userId, adminId, newRole) {
        const endpoint = API_CONFIG.endpoints.updateUserRole.replace('{id}', userId);
        return apiRequest(endpoint, {
            method: 'PUT',
            body: JSON.stringify({ adminId, newRole })
        });
    }
};

// Utility Functions
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `alert alert-${type}`;
    notification.textContent = message;
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.zIndex = '9999';
    notification.style.minWidth = '300px';
    notification.style.animation = 'slideIn 0.3s ease';
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

function validateFile(file) {
    if (!APP_CONFIG.allowedFileTypes.includes(file.type)) {
        throw new Error('Invalid file type. Please upload JPEG, PNG, or WebP images.');
    }
    
    if (file.size > APP_CONFIG.maxFileSize) {
        throw new Error('File size exceeds 10MB limit.');
    }
    
    return true;
}

// Add CSS for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
