// Creator Access Request Feature

let creatorRequestPending = false;

// Show creator request modal
function showCreatorRequestModal() {
    const modal = document.getElementById('creator-request-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

// Close creator request modal
function closeCreatorRequestModal() {
    const modal = document.getElementById('creator-request-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Request creator access
async function requestCreatorAccess() {
    if (!isAuthenticated() || creatorRequestPending) {
        return;
    }

    const reasonTextarea = document.getElementById('request-reason');
    const reason = reasonTextarea ? reasonTextarea.value.trim() : '';

    if (!reason) {
        showNotification('Please provide a reason for requesting creator access', 'error');
        return;
    }

    try {
        creatorRequestPending = true;
        const user = getCurrentUser();

        // Call backend API to auto-approve creator request
        const response = await fetch(`${API_CONFIG.baseUrl}/users/request-creator`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: user.userId,
                reason: reason
            })
        });

        const data = await response.json();

        if (response.ok) {
            // Update local user data with new creator role
            const updatedUser = {
                ...user,
                role: 'creator'
            };
            localStorage.setItem('currentUser', JSON.stringify(updatedUser));
            
            showNotification('Creator access granted! Redirecting to creator dashboard...', 'success');
            closeCreatorRequestModal();
            
            // Clear textarea
            if (reasonTextarea) {
                reasonTextarea.value = '';
            }

            // Update UI to show creator links
            updateUIForLoggedInUser();
            
            // Redirect to creator dashboard after 2 seconds
            setTimeout(() => {
                window.location.href = 'creator.html';
            }, 2000);
        } else {
            showNotification(data.error || 'Failed to grant creator access', 'error');
        }
    } catch (error) {
        console.error('Error submitting creator request:', error);
        showNotification('Failed to submit creator request. Please try again.', 'error');
    } finally {
        creatorRequestPending = false;
    }
}

// Show creator access button (for consumers only)
function showCreatorAccessButton() {
    const btn = document.getElementById('request-creator-btn');
    const user = getCurrentUser();
    
    if (btn && user) {
        if (user.role === 'consumer') {
            btn.textContent = 'Request Creator Access';
            btn.disabled = false;
            btn.style.display = 'inline-block';
        } else {
            btn.style.display = 'none';
        }
    }
}

// Initialize creator request feature
document.addEventListener('DOMContentLoaded', () => {
    // Add click handler to request button if it exists
    const requestBtn = document.getElementById('request-creator-btn');
    if (requestBtn) {
        requestBtn.addEventListener('click', showCreatorRequestModal);
    }

    // Add handler to submit button
    const submitBtn = document.getElementById('submit-creator-request');
    if (submitBtn) {
        submitBtn.addEventListener('click', requestCreatorAccess);
    }

    // Check for pending requests on login
    setTimeout(showCreatorAccessButton, 100);
});
