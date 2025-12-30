// Photos Management (Main Gallery)

let currentPage = 1;
let currentSearch = '';
let currentPhotoId = null;
let currentPhotoOwnerId = null;

// Load photos
async function loadPhotos(page = 1, search = '') {
    try {
        showLoading(true);
        currentPage = page;
        currentSearch = search;
        
        const data = await PhotoAPI.getPhotos(page, search);
        displayPhotos(data.photos);
        displayPagination(data.pagination);
        
        showLoading(false);
    } catch (error) {
        console.error('Error loading photos:', error);
        showNotification('Failed to load photos', 'error');
        showLoading(false);
    }
}

// Display photos in grid
function displayPhotos(photos) {
    const grid = document.getElementById('photo-grid');
    
    if (photos.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <div class="empty-state-icon">📷</div>
                <p class="empty-state-text">No photos found</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = photos.map(photo => `
        <div class="photo-card" onclick="openPhotoModal(${photo.PhotoId})">
            <img 
                src="${photo.ThumbnailUrl || photo.ImageUrl}" 
                alt="${photo.Title}"
                class="photo-card-image"
                loading="lazy"
            >
            <div class="photo-card-content">
                <h3 class="photo-card-title">${photo.Title}</h3>
                ${photo.Caption ? `<p class="photo-card-caption">${photo.Caption}</p>` : ''}
                <div class="photo-card-meta">
                    <div class="creator-info">
                        <img src="${photo.CreatorPicture || ''}" alt="${photo.CreatorName}" class="avatar-small">
                        <span>${photo.CreatorName}</span>
                    </div>
                    <div class="photo-stats">
                        <span>👁️ ${photo.Views}</span>
                        <span>❤️ ${photo.Likes}</span>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Display pagination
function displayPagination(pagination) {
    const paginationDiv = document.getElementById('pagination');
    
    if (pagination.totalPages <= 1) {
        paginationDiv.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // Previous button
    html += `
        <button 
            onclick="loadPhotos(${pagination.page - 1}, '${currentSearch}')" 
            ${pagination.page === 1 ? 'disabled' : ''}
        >
            ← Previous
        </button>
    `;
    
    // Page numbers
    for (let i = 1; i <= pagination.totalPages; i++) {
        if (
            i === 1 || 
            i === pagination.totalPages || 
            (i >= pagination.page - 2 && i <= pagination.page + 2)
        ) {
            html += `
                <button 
                    onclick="loadPhotos(${i}, '${currentSearch}')" 
                    class="${i === pagination.page ? 'active' : ''}"
                >
                    ${i}
                </button>
            `;
        } else if (i === pagination.page - 3 || i === pagination.page + 3) {
            html += '<span>...</span>';
        }
    }
    
    // Next button
    html += `
        <button 
            onclick="loadPhotos(${pagination.page + 1}, '${currentSearch}')" 
            ${pagination.page === pagination.totalPages ? 'disabled' : ''}
        >
            Next →
        </button>
    `;
    
    paginationDiv.innerHTML = html;
}

// Search photos
function searchPhotos() {
    const searchInput = document.getElementById('search-input');
    const search = searchInput.value.trim();
    loadPhotos(1, search);
}

// Handle search on Enter key
function handleSearchKeyPress(event) {
    if (event.key === 'Enter') {
        searchPhotos();
    }
}

// Handle navbar search on Enter key
function handleNavSearchKeyPress(event) {
    if (event.key === 'Enter') {
        const navSearchInput = document.getElementById('nav-search-input');
        const search = navSearchInput.value.trim();
        loadPhotos(1, search);
    }
}

// Open photo modal
async function openPhotoModal(photoId) {
    try {
        currentPhotoId = photoId;
        const data = await PhotoAPI.getPhoto(photoId);
        
        const modal = document.getElementById('photo-modal');
        const photo = data.photo;
        const comments = data.comments || [];
        
        currentPhotoOwnerId = photo.UserId;

        // Update modal content
        document.getElementById('modal-image').src = photo.ImageUrl;
        document.getElementById('modal-title').textContent = photo.Title;
        document.getElementById('modal-caption').textContent = photo.Caption || '';
        document.getElementById('modal-location').textContent = photo.Location || 'Unknown location';
        document.getElementById('modal-creator-avatar').src = photo.CreatorPicture || '';
        document.getElementById('modal-creator-name').textContent = photo.CreatorName;
        document.getElementById('modal-views').textContent = `👁️ ${photo.Views} views`;

        const likeButton = document.getElementById('like-button');
        if (likeButton) {
            likeButton.textContent = `🤍 ${photo.Likes}`;
            likeButton.classList.remove('liked');
        }
        
        // Display comments
        displayComments(comments);
        
        // Show/hide comment form based on auth
        const commentForm = document.getElementById('comment-form');
        if (isAuthenticated()) {
            commentForm.classList.remove('hidden');
        } else {
            commentForm.classList.add('hidden');
        }
        
        modal.classList.remove('hidden');
    } catch (error) {
        console.error('Error opening photo:', error);
        showNotification('Failed to load photo details', 'error');
    }
}

// Close photo modal
function closePhotoModal() {
    const modal = document.getElementById('photo-modal');
    modal.classList.add('hidden');
    currentPhotoId = null;
    currentPhotoOwnerId = null;
}

// Toggle like
async function toggleLike() {
    if (!requireAuth()) return;
    
    try {
        const user = getCurrentUser();
        const result = await PhotoAPI.likePhoto(currentPhotoId, user.userId);

        // Refresh photo details for accurate counts
        const data = await PhotoAPI.getPhoto(currentPhotoId);
        const likeButton = document.getElementById('like-button');
        if (likeButton) {
            likeButton.textContent = `${result.liked ? '❤️' : '🤍'} ${data.photo.Likes}`;
            likeButton.classList.toggle('liked', result.liked);
        }

        showNotification(result.message, 'success');
    } catch (error) {
        console.error('Error toggling like:', error);
        showNotification('Failed to toggle like', 'error');
    }
}

// Display comments
function displayComments(comments) {
    const commentsList = document.getElementById('comments-list');
    const user = getCurrentUser();
    
    if (comments.length === 0) {
        commentsList.innerHTML = '<p class="text-center" style="color: var(--text-light);">No comments yet. Be the first to comment!</p>';
        return;
    }
    
    commentsList.innerHTML = comments.map(comment => {
        const canDelete = user && (comment.UserId === user.userId || currentPhotoOwnerId === user.userId || user.role === 'admin');
        return `
        <div class="comment">
            <div class="comment-header">
                <img src="${comment.UserPicture || ''}" alt="${comment.UserName}" class="avatar-small">
                <span class="comment-author">${comment.UserName}</span>
                <span class="comment-date">${formatDate(comment.CreatedAt)}</span>
            </div>
            <p class="comment-text">${comment.Text}</p>
            ${canDelete ? `<button class="comment-delete-btn" aria-label="Delete comment" onclick="deleteComment(${comment.CommentId})">🗑️</button>` : ''}
        </div>`;
    }).join('');
}

async function deleteComment(commentId) {
    if (!requireAuth()) return;
    try {
        const user = getCurrentUser();
        await PhotoAPI.deleteComment(commentId, user.userId);
        const data = await PhotoAPI.getPhoto(currentPhotoId);
        displayComments(data.comments || []);
        showNotification('Comment deleted', 'success');
        
        // Update like button/metrics after deletion refresh if available
        const likeButton = document.getElementById('like-button');
        if (likeButton && data.photo) {
            likeButton.textContent = `${'🤍'} ${data.photo.Likes}`;
            likeButton.classList.toggle('liked', false);
        }
    } catch (error) {
        console.error('Error deleting comment:', error);
        showNotification('Failed to delete comment', 'error');
    }
}

// Submit comment
async function submitComment() {
    if (!requireAuth()) return;
    
    try {
        const commentInput = document.getElementById('comment-input');
        const text = commentInput.value.trim();
        
        if (!text) {
            showNotification('Please enter a comment', 'error');
            return;
        }
        
        const user = getCurrentUser();
        await PhotoAPI.addComment(currentPhotoId, user.userId, text);
        
        // Clear input
        commentInput.value = '';
        
        // Refresh comments
        const data = await PhotoAPI.getPhoto(currentPhotoId);
        displayComments(data.comments);
        
        showNotification('Comment added successfully', 'success');
    } catch (error) {
        console.error('Error adding comment:', error);
        showNotification('Failed to add comment', 'error');
    }
}

// Share photo
function sharePhoto() {
    const url = `${window.location.origin}?photo=${currentPhotoId}`;
    
    if (navigator.share) {
        navigator.share({
            title: document.getElementById('modal-title').textContent,
            text: document.getElementById('modal-caption').textContent,
            url: url
        }).catch(err => console.log('Error sharing:', err));
    } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(url).then(() => {
            showNotification('Link copied to clipboard!', 'success');
        }).catch(err => {
            console.error('Failed to copy:', err);
            showNotification('Failed to copy link', 'error');
        });
    }
}

// Show/hide loading indicator
function showLoading(show) {
    const loading = document.getElementById('loading');
    const grid = document.getElementById('photo-grid');
    
    if (show) {
        loading.classList.remove('hidden');
        grid.style.opacity = '0.5';
    } else {
        loading.classList.add('hidden');
        grid.style.opacity = '1';
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadPhotos();
    
    // Setup search icon toggle
    const searchToggle = document.getElementById('search-toggle');
    const searchContainer = searchToggle?.parentElement;
    const navSearchInput = document.getElementById('nav-search-input');
    
    if (searchToggle && searchContainer && navSearchInput) {
        searchToggle.addEventListener('click', () => {
            searchContainer.classList.toggle('expanded');
            if (searchContainer.classList.contains('expanded')) {
                navSearchInput.focus();
            }
        });

        // Keep expanded when input has focus
        navSearchInput.addEventListener('focus', () => {
            searchContainer.classList.add('expanded');
        });

        navSearchInput.addEventListener('blur', () => {
            if (!navSearchInput.value.trim()) {
                searchContainer.classList.remove('expanded');
            }
        });
    }
    
    // Check for photo ID in URL
    const urlParams = new URLSearchParams(window.location.search);
    const photoId = urlParams.get('photo');
    if (photoId) {
        openPhotoModal(parseInt(photoId));
    }
});
