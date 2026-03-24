// Gamification Logic Simulator
let userXP = 650;
let userLevel = 5;
const xpNeeded = 1000;

// Gamification Logic - Real Data Integration
async function updateProfileUI() {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    try {
        const response = await CityAPI.getProfile(userId);
        if (response.status === "success") {
            const user = response.data;
            const userXP = user.xp || 0;
            const userLevel = user.level || 1;
            const xpNeeded = 1000; // Can be dynamic or from backend

            // Update UI Elements
            const fillPercent = Math.min(((userXP % xpNeeded) / xpNeeded) * 100, 100);
            const xpFill = document.getElementById('xp-fill');
            const xpText = document.getElementById('xp-text');
            const levelEl = document.getElementById('user-level');
            const usernameEl = document.querySelectorAll('.username-display');

            if (xpFill) xpFill.style.width = `${fillPercent}%`;
            if (xpText) xpText.innerText = `${userXP % xpNeeded} / ${xpNeeded} XP (รวม ${userXP} XP)`;
            if (levelEl) levelEl.innerHTML = `<i class="fa-solid fa-star"></i> เลเวล ${userLevel}`;
            
            usernameEl.forEach(el => el.innerText = user.username);
            
            // Handle Premium UI
            localStorage.setItem('isPremium', user.is_premium ? 'true' : 'false');
            const premiumContainer = document.getElementById('premium-badge-container');
            if (premiumContainer) {
                if (user.is_premium) {
                    premiumContainer.innerHTML = `<span style="background: linear-gradient(45deg, #FFD700, #FDB931); color: #000; padding: 5px 15px; border-radius: 20px; font-weight: 600; font-size: 0.9rem; box-shadow: 0 4px 10px rgba(255, 215, 0, 0.4);"><i class="fa-solid fa-crown"></i> สมาชิก Premium</span>`;
                } else {
                    premiumContainer.innerHTML = `<button onclick="upgradeToPremium()" class="elegant-btn accent" style="padding: 5px 15px; font-size: 0.9rem;"><i class="fa-solid fa-arrow-up-right-dots"></i> อัปเกรด Premium</button>`;
                }
            }

            // Fetch check-in history
            fetchCheckinHistory(userId);
        }
    } catch (error) {
        console.error("Error updating profile UI:", error);
    }
}

async function fetchCheckinHistory(userId) {
    try {
        const res = await fetch(`${window.SuperMapAPI.baseUrl}/checkin/user/${userId}`);
        const response = await res.json();
        
        if (response.status === "success") {
            const historyContainer = document.getElementById('history-container');
            if (historyContainer) {
                if (response.data.length === 0) {
                    historyContainer.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:20px;">ยังไม่มีประวัติการเช็คอิน</p>';
                    return;
                }

                historyContainer.innerHTML = response.data.map(item => `
                    <div class="checkin-item">
                        <div>
                            <h4 style="color: var(--text-main);">${item.place_name}</h4>
                            <p style="color: var(--text-muted); font-size: 0.9rem;">${new Date(item.timestamp).toLocaleString('th-TH')}</p>
                        </div>
                        <span style="color: var(--success-color); font-weight: 600;">+${item.xp_earned} XP</span>
                    </div>
                `).join('');
            }
        }
    } catch (error) {
        console.error("Error fetching history:", error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('isLoggedIn') === 'true') {
        updateProfileUI();
    }
});

window.updateProfileUI = updateProfileUI;

function showLevelUpModal(level) {
    let backdrop = document.querySelector('.modal-backdrop');
    if(!backdrop) {
        backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop';
        document.body.appendChild(backdrop);
    }
    backdrop.classList.add('active');

    const modalHtml = `
        <div id="levelup-alert-modal" class="elegant-modal" style="position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); z-index:9999; padding:2.5rem; width:90%; max-width:400px; text-align:center;">
            <h3 style="color: var(--secondary-color); margin-bottom:1rem;">
                <i class="fa-solid fa-award"></i> อัปเลเวลสำเร็จ
            </h3>
            <p style="font-size: 1.1rem; margin-bottom:1rem;">ยินดีด้วย คุณเลเวล <strong style="color: var(--primary-color);">${level}</strong> แล้ว!</p>
            <button class="elegant-btn primary" onclick="closeLevelupModal()" style="width:100%;">ยอมเยี่ยม!</button>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

window.closeLevelupModal = function() {
    const modal = document.getElementById('levelup-alert-modal');
    const backdrop = document.querySelector('.modal-backdrop');
    if (modal) modal.remove();
    if (backdrop) backdrop.classList.remove('active');
};

window.upgradeToPremium = async function() {
    const userId = localStorage.getItem('userId');
    if (!userId) return alert('กรุณาลงชื่อเข้าใช้ก่อน');
    
    // Simulate payment modal or confirm
    if (confirm("ต้องการอัปเกรดเป็นสมาชิกระดับ Premium ในราคา 199 บาท/เดือน หรือไม่?")) {
        try {
            const response = await fetch('/api/user/upgrade', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });
            const data = await response.json();
            if (data.status === 'success') {
                alert('อัปเกรดเป็น Premium สำเร็จ! คุณสามารถเข้าถึงโปรแกรมทัวร์พิเศษได้แล้ว.');
                localStorage.setItem('isPremium', 'true');
                window.location.reload();
            } else {
                alert('เกิดข้อผิดพลาด: ' + data.message);
            }
        } catch (error) {
            console.error(error);
            alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
        }
    }
};
