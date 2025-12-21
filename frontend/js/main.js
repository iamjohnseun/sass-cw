// Main application initialization

document.addEventListener('DOMContentLoaded', () => {
    console.log('PhotoShare application initialized');
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Escape key to close modals
        if (e.key === 'Escape') {
            const modal = document.getElementById('photo-modal');
            if (modal && !modal.classList.contains('hidden')) {
                closePhotoModal();
            }
        }
    });
    
    // Handle clicks outside modal to close
    const modal = document.getElementById('photo-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closePhotoModal();
            }
        });
    }
});
