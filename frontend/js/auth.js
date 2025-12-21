// Authentication Module

let currentUser = null;

// Initialize Google Sign-In
function initGoogleSignIn() {
    // Update the Google Client ID in the HTML
    const googleSignInDiv = document.querySelector('[data-client_id]');
    if (googleSignInDiv) {
        googleSignInDiv.setAttribute('data-client_id', GOOGLE_CONFIG.clientId);
    }
    
    // Check for existing session
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        updateUIForLoggedInUser();
    }
}

// Handle Google Sign-In Response
async function handleGoogleSignIn(response) {
    try {
        const idToken = response.credential;
        
        // Send token to backend for verification
        const result = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.googleAuth}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token: idToken })
        });
        
        const data = await result.json();
        
        if (result.ok) {
            currentUser = data.user;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            updateUIForLoggedInUser();
            showNotification('Successfully signed in!', 'success');
            
            // Reload photos if on main page
            if (typeof loadPhotos === 'function') {
                loadPhotos();
            }
        } else {
            showNotification('Authentication failed. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Authentication error:', error);
        showNotification('Authentication error. Please try again.', 'error');
    }
}

// Update UI for logged-in user
function updateUIForLoggedInUser() {
    const authSection = document.getElementById('auth-section');
    const userMenu = document.getElementById('user-menu');
    const creatorSection = document.getElementById('creator-section');
    const adminSection = document.getElementById('admin-section');
    
    if (authSection && userMenu && currentUser) {
        authSection.classList.add('hidden');
        userMenu.classList.remove('hidden');
        
        document.getElementById('user-avatar').src = currentUser.picture || '';
        document.getElementById('user-name').textContent = currentUser.name;
        
        // Show creator dashboard link if user is creator
        if (creatorSection && currentUser.role === 'creator') {
            creatorSection.classList.remove('hidden');
        }
        
        // Show admin dashboard link if user is admin
        if (adminSection && currentUser.role === 'admin') {
            adminSection.classList.remove('hidden');
        }
    }
}

// Logout
function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    
    const authSection = document.getElementById('auth-section');
    const userMenu = document.getElementById('user-menu');
    const creatorSection = document.getElementById('creator-section');
    const adminSection = document.getElementById('admin-section');
    
    if (authSection && userMenu) {
        authSection.classList.remove('hidden');
        userMenu.classList.add('hidden');
    }
    
    if (creatorSection) creatorSection.classList.add('hidden');
    if (adminSection) adminSection.classList.add('hidden');
    
    showNotification('Logged out successfully', 'success');
    
    // Reload page
    window.location.reload();
}

// Get current user
function getCurrentUser() {
    return currentUser;
}

// Check if user is authenticated
function isAuthenticated() {
    return currentUser !== null;
}

// Check if user has specific role
function hasRole(role) {
    return currentUser && currentUser.role === role;
}

// Require authentication
function requireAuth() {
    if (!isAuthenticated()) {
        showNotification('Please sign in to continue', 'error');
        return false;
    }
    return true;
}

// Require specific role
function requireRole(role) {
    if (!requireAuth()) return false;
    
    if (!hasRole(role)) {
        showNotification(`This feature requires ${role} access`, 'error');
        return false;
    }
    return true;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initGoogleSignIn);
