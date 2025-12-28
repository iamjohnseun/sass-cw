// Authentication Module

let currentUser = null;

// Initialize Google Sign-In
function initGoogleSignIn() {
    // Update the Google Client ID in the HTML
    const googleSignInDiv = document.querySelector('[data-client_id]');
    if (googleSignInDiv) {
        googleSignInDiv.setAttribute('data-client_id', GOOGLE_CONFIG.clientId);
    }

    // Attach logout handler
    const signOutBtn = document.getElementById('sign-out-btn');
    if (signOutBtn) {
        signOutBtn.addEventListener('click', () => {
            // Revoke Google token if available
            try {
                if (currentUser && currentUser.email && window.google && window.google.accounts && window.google.accounts.id) {
                    window.google.accounts.id.revoke(currentUser.email, () => {});
                }
                if (window.google && window.google.accounts && window.google.accounts.id) {
                    window.google.accounts.id.disableAutoSelect();
                }
            } catch (e) {}
            logout();
        });
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
        
        if (!result.ok) {
            // Fallback: decode Google ID token client-side to populate basic profile
            try {
                const payload = JSON.parse(atob(idToken.split('.')[1]));
                currentUser = {
                    userId: null,
                    email: payload.email,
                    name: payload.name,
                    picture: payload.picture,
                    role: 'consumer'
                };
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                updateUIForLoggedInUser();
                showNotification('Signed in (offline mode). Backend not reachable.', 'warning');
                if (typeof loadPhotos === 'function') { loadPhotos(); }
            } catch (e) {
                showNotification('Authentication failed. Please try again.', 'error');
            }
            return;
        }

        const data = await result.json();
        
        currentUser = data.user;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        updateUIForLoggedInUser();
        
        // Show creator request button if consumer
        if (typeof showCreatorAccessButton === 'function') {
            showCreatorAccessButton();
        }
        
        showNotification('Successfully signed in!', 'success');
        
        // Reload photos if on main page
        if (typeof loadPhotos === 'function') {
            loadPhotos();
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
    const roleLinks = document.getElementById('role-links');
    const creatorLink = document.getElementById('creator-link');
    const adminLink = document.getElementById('admin-link');
    
    if (authSection && userMenu && currentUser) {
        authSection.classList.add('hidden');
        userMenu.classList.remove('hidden');
        
        document.getElementById('user-avatar').src = currentUser.picture || '';
        document.getElementById('user-name').textContent = currentUser.name || currentUser.email || 'User';
        
        // Show role-based links
        if (roleLinks) {
            const isCreator = currentUser.role === 'creator';
            const isAdmin = currentUser.role === 'admin';
            
            if (isCreator || isAdmin) {
                roleLinks.classList.remove('hidden');
                if (creatorLink) creatorLink.style.display = isCreator ? 'inline-block' : 'none';
                if (adminLink) adminLink.style.display = isAdmin ? 'inline-block' : 'none';
            } else {
                roleLinks.classList.add('hidden');
            }
        }
    }
}

// Logout
function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    
    const authSection = document.getElementById('auth-section');
    const userMenu = document.getElementById('user-menu');
    const roleLinks = document.getElementById('role-links');
    
    if (authSection && userMenu) {
        authSection.classList.remove('hidden');
        userMenu.classList.add('hidden');
    }
    
    if (roleLinks) roleLinks.classList.add('hidden');
    
    showNotification('Logged out successfully', 'success');
}

function getCurrentUser() { return currentUser; }
function isAuthenticated() { return currentUser !== null; }
function hasRole(role) { return currentUser && currentUser.role === role; }
function requireAuth() { if (!isAuthenticated()) { showNotification('Please sign in to continue', 'error'); return false; } return true; }
function requireRole(role) { if (!requireAuth()) return false; if (!hasRole(role)) { showNotification(`This feature requires ${role} access`, 'error'); return false; } return true; }

// Initialize on page load
document.addEventListener('DOMContentLoaded', initGoogleSignIn);
