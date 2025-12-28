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

        // Store request in localStorage as a simple fallback
        // In production, this would be sent to a backend endpoint
        const requests = JSON.parse(localStorage.getItem('creatorRequests') || '{}');
        if (!requests[user.email]) {
            requests[user.email] = {
                userId: user.userId,
                email: user.email,
                name: user.name,
                reason: reason,
                requestedAt: new Date().toISOString(),
                status: 'pending'
            };
            localStorage.setItem('creatorRequests', JSON.stringify(requests));

            showNotification('Creator access request submitted! An admin will review your request.', 'success');
            closeCreatorRequestModal();
            
            // Clear textarea
            if (reasonTextarea) {
                reasonTextarea.value = '';
            }
        } else {
            showNotification('You have already submitted a creator request. Please wait for admin review.', 'warning');
        }
    } catch (error) {
        console.error('Error submitting creator request:', error);
        showNotification('Failed to submit creator request', 'error');
    } finally {
        creatorRequestPending = false;
    }
}

// Show creator access button (for consumers)
function showCreatorAccessButton() {
    const btn = document.getElementById('request-creator-btn');
    const user = getCurrentUser();
    
    if (btn && user && user.role === 'consumer') {
        // Check if they have a pending request
        const requests = JSON.parse(localStorage.getItem('creatorRequests') || '{}');
        if (requests[user.email]) {
            btn.textContent = `Creator Request Pending (${requests[user.email].status})`;
            btn.disabled = true;
        } else {
            btn.textContent = 'Request Creator Access';
            btn.disabled = false;
            btn.style.display = 'inline-block';
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
