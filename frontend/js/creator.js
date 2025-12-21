// Creator Dashboard Functions

let myPhotos = [];

// Load creator's photos
async function loadMyPhotos() {
    if (!requireRole('creator')) {
        window.location.href = 'index.html';
        return;
    }
    
    try {
        const user = getCurrentUser();
        const data = await PhotoAPI.getPhotos(1, '');
        
        // Filter to only show creator's photos
        myPhotos = data.photos.filter(photo => photo.UserId === user.userId);
        displayMyPhotos();
    } catch (error) {
        console.error('Error loading photos:', error);
        showNotification('Failed to load your photos', 'error');
    }
}

// Display creator's photos
function displayMyPhotos() {
    const grid = document.getElementById('my-photos-grid');
    
    if (myPhotos.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <div class="empty-state-icon">📸</div>
                <p class="empty-state-text">You haven't uploaded any photos yet</p>
                <button class="btn btn-primary" onclick="showUploadModal()">Upload Your First Photo</button>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = myPhotos.map(photo => `
        <div class="photo-card">
            <img 
                src="${photo.ThumbnailUrl || photo.ImageUrl}" 
                alt="${photo.Title}"
                class="photo-card-image"
            >
            <div class="photo-card-content">
                <h3 class="photo-card-title">${photo.Title}</h3>
                ${photo.Caption ? `<p class="photo-card-caption">${photo.Caption}</p>` : ''}
                <div class="photo-card-meta">
                    <div class="photo-stats">
                        <span>👁️ ${photo.Views}</span>
                        <span>❤️ ${photo.Likes}</span>
                    </div>
                </div>
                <div class="photo-card-actions">
                    <button class="btn btn-outline" onclick="showEditModal(${photo.PhotoId})">Edit</button>
                    <button class="btn btn-danger" onclick="deleteMyPhoto(${photo.PhotoId})">Delete</button>
                </div>
            </div>
        </div>
    `).join('');
}

// Show upload modal
function showUploadModal() {
    const modal = document.getElementById('upload-modal');
    modal.classList.remove('hidden');
    
    // Setup file preview
    const fileInput = document.getElementById('photo-file');
    fileInput.addEventListener('change', handleFilePreview);
}

// Close upload modal
function closeUploadModal() {
    const modal = document.getElementById('upload-modal');
    modal.classList.add('hidden');
    
    // Reset form
    document.getElementById('upload-form').reset();
    document.getElementById('preview-container').classList.add('hidden');
}

// Handle file preview
function handleFilePreview(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
        validateFile(file);
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const previewContainer = document.getElementById('preview-container');
            const previewImage = document.getElementById('preview-image');
            previewImage.src = e.target.result;
            previewContainer.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    } catch (error) {
        showNotification(error.message, 'error');
        event.target.value = '';
    }
}

// Handle upload
async function handleUpload(event) {
    event.preventDefault();
    
    try {
        const fileInput = document.getElementById('photo-file');
        const file = fileInput.files[0];
        
        if (!file) {
            showNotification('Please select a file', 'error');
            return;
        }
        
        validateFile(file);
        
        // Upload file to storage
        showNotification('Uploading photo...', 'info');
        const uploadResult = await StorageAPI.uploadFile(file);
        
        // Create photo record
        const user = getCurrentUser();
        const photoData = {
            userId: user.userId,
            title: document.getElementById('photo-title').value,
            caption: document.getElementById('photo-caption').value,
            location: document.getElementById('photo-location').value,
            imageUrl: uploadResult.imageUrl,
            thumbnailUrl: uploadResult.imageUrl // Use same URL for now
        };
        
        await PhotoAPI.uploadPhoto(photoData);
        
        showNotification('Photo uploaded successfully!', 'success');
        closeUploadModal();
        loadMyPhotos();
    } catch (error) {
        console.error('Upload error:', error);
        showNotification(error.message || 'Failed to upload photo', 'error');
    }
}

// Show edit modal
async function showEditModal(photoId) {
    const photo = myPhotos.find(p => p.PhotoId === photoId);
    if (!photo) return;
    
    document.getElementById('edit-photo-id').value = photoId;
    document.getElementById('edit-title').value = photo.Title;
    document.getElementById('edit-caption').value = photo.Caption || '';
    document.getElementById('edit-location').value = photo.Location || '';
    
    const modal = document.getElementById('edit-modal');
    modal.classList.remove('hidden');
}

// Close edit modal
function closeEditModal() {
    const modal = document.getElementById('edit-modal');
    modal.classList.add('hidden');
    document.getElementById('edit-form').reset();
}

// Handle edit
async function handleEdit(event) {
    event.preventDefault();
    
    try {
        const photoId = document.getElementById('edit-photo-id').value;
        const user = getCurrentUser();
        
        const photoData = {
            userId: user.userId,
            title: document.getElementById('edit-title').value,
            caption: document.getElementById('edit-caption').value,
            location: document.getElementById('edit-location').value
        };
        
        await PhotoAPI.updatePhoto(photoId, photoData);
        
        showNotification('Photo updated successfully!', 'success');
        closeEditModal();
        loadMyPhotos();
    } catch (error) {
        console.error('Update error:', error);
        showNotification('Failed to update photo', 'error');
    }
}

// Delete photo
async function deleteMyPhoto(photoId) {
    if (!confirm('Are you sure you want to delete this photo? This action cannot be undone.')) {
        return;
    }
    
    try {
        const user = getCurrentUser();
        await PhotoAPI.deletePhoto(photoId, user.userId);
        
        showNotification('Photo deleted successfully', 'success');
        loadMyPhotos();
    } catch (error) {
        console.error('Delete error:', error);
        showNotification('Failed to delete photo', 'error');
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
    
    loadMyPhotos();
});
