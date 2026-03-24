// Simple Admin Authentication Protection logic

document.addEventListener('DOMContentLoaded', () => {
    
    // Protection for admin-dashboard pages
    const isAdminPage = document.querySelector('.admin-layout');
    if (isAdminPage) {
        if (!localStorage.getItem('isAdmin')) {
            window.location.href = 'login.html';
        }
    }
});
