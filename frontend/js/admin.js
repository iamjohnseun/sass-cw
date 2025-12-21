// Admin Dashboard Functions

// Load dashboard data
async function loadDashboard() {
    if (!requireRole('admin')) {
        window.location.href = 'index.html';
        return;
    }
    
    try {
        await Promise.all([
            loadStatistics(),
            loadAllPhotos(),
            loadAllUsers()
        ]);
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showNotification('Failed to load dashboard data', 'error');
    }
}

// Load statistics
async function loadStatistics() {
    try {
        // For now, we'll fetch photos and calculate stats
        // In production, you'd have dedicated stats endpoints
        const data = await PhotoAPI.getPhotos(1, '');
        
        const totalViews = data.photos.reduce((sum, photo) => sum + photo.Views, 0);
        const totalLikes = data.photos.reduce((sum, photo) => sum + photo.Likes, 0);
        
        document.getElementById('total-photos').textContent = data.pagination.total;
        document.getElementById('total-views').textContent = totalViews.toLocaleString();
        document.getElementById('total-likes').textContent = totalLikes.toLocaleString();
        
        // TODO: Get actual user count from backend
        document.getElementById('total-users').textContent = '0';
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

// Load all photos
async function loadAllPhotos() {
    try {
        const data = await PhotoAPI.getPhotos(1, '');
        const tbody = document.getElementById('photos-table-body');
        
        if (data.photos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No photos found</td></tr>';
            return;
        }
        
        tbody.innerHTML = data.photos.map(photo => `
            <tr>
                <td>
                    <img src="${photo.ThumbnailUrl || photo.ImageUrl}" alt="${photo.Title}" class="table-thumbnail">
                </td>
                <td>${photo.Title}</td>
                <td>${photo.CreatorName}</td>
                <td>${photo.Views}</td>
                <td>${photo.Likes}</td>
                <td>${formatDate(photo.CreatedAt)}</td>
                <td class="table-actions">
                    <button class="btn btn-outline" onclick="viewPhoto(${photo.PhotoId})">View</button>
                    <button class="btn btn-danger" onclick="adminDeletePhoto(${photo.PhotoId})">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading photos:', error);
    }
}

// Load all users (mock data for now)
async function loadAllUsers() {
    try {
        // TODO: Implement actual user listing endpoint
        // For now, show a placeholder
        const tbody = document.getElementById('users-table-body');
        
        const user = getCurrentUser();
        tbody.innerHTML = `
            <tr>
                <td>
                    <img src="${user.picture || ''}" alt="${user.name}" class="table-avatar">
                </td>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>
                    <span class="role-badge ${user.role}">${user.role}</span>
                </td>
                <td>Recently</td>
                <td class="table-actions">
                    <select onchange="changeUserRole(${user.userId}, this.value)" disabled>
                        <option value="consumer" ${user.role === 'consumer' ? 'selected' : ''}>Consumer</option>
                        <option value="creator" ${user.role === 'creator' ? 'selected' : ''}>Creator</option>
                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                </td>
            </tr>
            <tr>
                <td colspan="6" class="text-center" style="color: var(--text-light);">
                    <em>User management will be fully functional when connected to database</em>
                </td>
            </tr>
        `;
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// View photo
function viewPhoto(photoId) {
    window.open(`index.html?photo=${photoId}`, '_blank');
}

// Admin delete photo
async function adminDeletePhoto(photoId) {
    if (!confirm('Are you sure you want to delete this photo? This action cannot be undone.')) {
        return;
    }
    
    try {
        const user = getCurrentUser();
        await PhotoAPI.deletePhoto(photoId, user.userId);
        
        showNotification('Photo deleted successfully', 'success');
        loadAllPhotos();
        loadStatistics();
    } catch (error) {
        console.error('Delete error:', error);
        showNotification('Failed to delete photo', 'error');
    }
}

// Change user role
async function changeUserRole(userId, newRole) {
    if (!confirm(`Are you sure you want to change this user's role to ${newRole}?`)) {
        return;
    }
    
    try {
        const admin = getCurrentUser();
        await UserAPI.updateUserRole(userId, admin.userId, newRole);
        
        showNotification('User role updated successfully', 'success');
        loadAllUsers();
    } catch (error) {
        console.error('Role update error:', error);
        showNotification('Failed to update user role', 'error');
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Update user info
    const user = getCurrentUser();
    if (user) {
        document.getElementById('user-avatar').src = user.picture || '';
        document.getElementById('user-name').textContent = user.name;
    }
    
    loadDashboard();
});
