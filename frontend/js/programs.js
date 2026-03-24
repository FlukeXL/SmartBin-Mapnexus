document.addEventListener('DOMContentLoaded', async () => {
    const userId = localStorage.getItem('userId');
    const isPremium = localStorage.getItem('isPremium') === 'true';
    
    const programsList = document.getElementById('programs-list');
    
    if (!isPremium) {
        programsList.innerHTML = `
            <div style="text-align:center; padding: 60px 20px; background: rgba(0,0,0,0.03); border-radius: 20px; border: 1px solid rgba(0,0,0,0.05);">
                <i class="fa-solid fa-lock" style="font-size: 4rem; color: var(--accent-color); margin-bottom: 20px;"></i>
                <h2 style="color: var(--text-main); margin-bottom: 10px;">เนื้อหาสงวนสิทธิ์เฉพาะสมาชิก Premium</h2>
                <p style="color: var(--text-muted); margin-bottom: 30px; font-size: 1.1rem;">
                    กรุณาอัปเกรดเป็นสมาชิก Premium เพื่อดูและเลือกโปรแกรมท่องเที่ยวแบบสุดพิเศษที่เราเตรียมไว้ให้คุณ
                </p>
                <a href="premium-register.html" class="elegant-btn primary" style="display: inline-flex; align-items: center; justify-content: center; padding: 15px 30px; font-size: 1.1rem;">
                    <i class="fa-solid fa-crown" style="margin-right: 10px;"></i> สมัครสมาชิก Premium ทันที
                </a>
            </div>
        `;
        return;
    }

    try {
        const response = await fetch('/api/program');
        if (!response.ok) throw new Error("Failed to fetch");
        
        const data = await response.json();
        const programs = data.data || [];
        
        if (programs.length === 0) {
            programsList.innerHTML = '<p style="text-align:center;">ยังไม่มีโปรแกรมในขณะนี้</p>';
            return;
        }

        let html = '';
        programs.forEach(prog => {
            html += `
            <div class="program-card">
                <div class="program-img" style="background-image: url('${prog.image_url || 'assets/images/placeholder.jpg'}');">
                    <!-- Placeholder color if img fails -->
                </div>
                <div class="program-info">
                    <div>
                        <h2 style="color: var(--text-main); margin-bottom: 10px;">${prog.title}</h2>
                        <p style="color: var(--text-muted); line-height: 1.6; margin-bottom: 15px;">
                            ${prog.description}
                        </p>
                        <div style="display: flex; gap: 15px; margin-bottom: 20px;">
                            <span class="elegant-badge" style="background: rgba(156, 39, 176, 0.1); color: var(--purple-color); padding: 5px 12px; border-radius: 20px; font-size: 0.85rem;">
                                <i class="fa-solid fa-clock"></i> ระยะเวลา: ${prog.duration}
                            </span>
                        </div>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 20px;">
                        <span style="font-size: 1.4rem; font-weight: 600; color: var(--success-color);">
                            ฿${parseFloat(prog.price_baht).toLocaleString()}
                        </span>
                        <button class="elegant-btn primary">
                            <i class="fa-solid fa-calendar-check"></i> จองโปรแกรมนี้
                        </button>
                    </div>
                </div>
            </div>
            `;
        });
        
        programsList.innerHTML = html;
        
    } catch (error) {
        console.error("Error loading programs:", error);
        programsList.innerHTML = '<p style="text-align:center; color: var(--danger-color);">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>';
    }
});
