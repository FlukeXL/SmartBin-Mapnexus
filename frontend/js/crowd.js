// frontend/js/crowd.js
document.addEventListener('DOMContentLoaded', () => {
    const crowdListEl = document.getElementById('crowd-status-list');
    
    function updateCrowdStatus() {
        if (!crowdListEl) return;
        
        fetch('/api/crowd')
            .then(res => res.json())
            .then(data => {
                crowdListEl.classList.add('dynamic-grid');
                crowdListEl.innerHTML = data.map(loc => `
                    <div class="metric-card">
                        <div class="metric-card-header">
                            <div class="metric-icon-box" style="background: ${loc.color}15; color: ${loc.color};">
                                <i class="fa-solid ${loc.icon}"></i>
                            </div>
                            <div style="width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.03);">
                                <i class="fa-solid fa-arrow-${loc.trend === 'up' ? 'trend-up' : (loc.trend === 'down' ? 'trend-down' : 'right')}" style="color: ${loc.trend === 'up' ? '#ef4444' : (loc.trend === 'down' ? '#10b981' : '#94a3b8')}; font-size: 0.85rem;"></i>
                            </div>
                        </div>
                        <div class="metric-card-body">
                            <div class="metric-title" style="min-height: 2.6rem;">${loc.name}</div>
                            <div class="metric-value" style="color: ${loc.color}; font-size: 1.8rem;">${loc.status}</div>
                            <div class="metric-progress-bg">
                                <div class="metric-progress-fill" style="width: ${loc.level}%; background: ${loc.color};"></div>
                            </div>
                            <div class="metric-footer">
                                <span>Density Level</span>
                                <span style="font-weight: 700; color: var(--text-main);">${Math.round(loc.level)}%</span>
                            </div>
                        </div>
                    </div>
                `).join('');
            })
            .catch(error => {
                console.error("Error fetching crowd data:", error);
                crowdListEl.innerHTML = `<p style="color: var(--danger-color);">ไม่สามารถโหลดข้อมูลได้</p>`;
            });
    }

    if (crowdListEl) {
        updateCrowdStatus();
        setInterval(updateCrowdStatus, 10000); // Update every 10 seconds
    }
});
