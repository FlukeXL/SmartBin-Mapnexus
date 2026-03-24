let currentReviewPlaceId = null;
let currentRating = 5;

function openReviewModal(placeId, placeName) {
    currentReviewPlaceId = placeId;
    document.getElementById('review-place-name').innerText = `รีวิว: ${placeName}`;
    document.getElementById('review-modal-backdrop').style.display = 'block';
    document.getElementById('review-modal').style.display = 'block';
    
    // Reset inputs
    currentRating = 5;
    updateStarUI();
    document.getElementById('review-comment').value = '';
    
    // Fetch reviews
    fetchReviews(placeId);
}

function closeReviewModal() {
    document.getElementById('review-modal-backdrop').style.display = 'none';
    document.getElementById('review-modal').style.display = 'none';
    currentReviewPlaceId = null;
}

async function fetchReviews(placeId) {
    const list = document.getElementById('reviews-list');
    list.innerHTML = '<p style="text-align:center; color:var(--text-muted);">กำลังโหลดรีวิว...</p>';
    
    try {
        const response = await fetch(`/api/review/place/${placeId}`);
        const data = await response.json();
        
        if (data.status === 'success' && data.data && data.data.length > 0) {
            list.innerHTML = data.data.map(r => `
                <div style="padding: 1rem; background: rgba(0,0,0,0.02); border-radius: 12px; margin-bottom: 10px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <strong>
                            ${r.username} 
                            ${r.is_premium ? '<span style="color:#FFD700; font-size:0.8rem;" title="Premium Member"><i class="fa-solid fa-crown"></i></span>' : ''}
                        </strong>
                        <span style="color:#FFD700; font-size:0.9rem;">${'<i class="fa-solid fa-star"></i>'.repeat(r.rating)}</span>
                    </div>
                    <p style="color:var(--text-muted); font-size:0.95rem; margin-top:5px;">${r.comment || '-'}</p>
                    <small style="color:var(--text-muted); font-size:0.8rem;">${new Date(r.created_at).toLocaleDateString('th-TH')}</small>
                </div>
            `).join('');
        } else {
            list.innerHTML = '<p style="text-align:center; color:var(--text-muted);">ยังไม่มีรีวิวสำหรับสถานที่นี้ มารีวิวเป็นคนแรกสิ!</p>';
        }
    } catch (e) {
        list.innerHTML = '<p style="text-align:center; color:var(--danger-color);">เกิดข้อผิดพลาดในการโหลดรีวิว</p>';
    }
}

function updateStarUI() {
    const stars = document.querySelectorAll('#star-rating i');
    stars.forEach(star => {
        const val = parseInt(star.getAttribute('data-val'));
        if (val <= currentRating) {
            star.className = 'fa-solid fa-star';
        } else {
            star.className = 'fa-regular fa-star';
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // Star Rating Interactivity
    const stars = document.querySelectorAll('#star-rating i');
    stars.forEach(star => {
        star.addEventListener('click', (e) => {
            currentRating = parseInt(e.target.getAttribute('data-val'));
            updateStarUI();
        });
    });

    // Submit Review
    const submitBtn = document.getElementById('submit-review-btn');
    if (submitBtn) {
        submitBtn.addEventListener('click', async () => {
            const userId = localStorage.getItem('userId');
            if (!userId) {
                alert('กรุณาลงชื่อเข้าใช้ก่อนรีวิว');
                return;
            }

            const comment = document.getElementById('review-comment').value;
            
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> กำลังส่ง...';

            try {
                const response = await fetch('/api/review', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        place_id: currentReviewPlaceId,
                        user_id: userId,
                        rating: currentRating,
                        comment: comment
                    })
                });

                const data = await response.json();
                if (data.status === 'success') {
                    // refresh reviews
                    fetchReviews(currentReviewPlaceId);
                    document.getElementById('review-comment').value = '';
                    alert('ขอบคุณสำหรับรีวิวของคุณ!');
                } else {
                    alert('ข้อผิดพลาด: ' + data.message);
                }
            } catch (err) {
                alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerText = 'โพสต์รีวิว';
            }
        });
    }
});
