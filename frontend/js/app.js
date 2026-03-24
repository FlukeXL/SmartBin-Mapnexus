// frontend/js/app.js
console.log("SuperMapnexus Application Initialized");

const getApiUrl = () => {
    // Automatically use current origin for API calls (Works locally and on Vercel)
    return `${window.location.origin}/api`;
};

window.SuperMapAPI = {
    baseUrl: getApiUrl()
};

document.addEventListener('DOMContentLoaded', () => {
    // Fetch Traffic if elements exist
    const trafficListEl = document.getElementById('home-traffic-list');
    function updateHomeTraffic() {
        if (!trafficListEl) return;
        fetch('/api/traffic/status')
            .then(res => res.json())
            .then(response => {
                // รองรับทั้ง format เก่า (array) และใหม่ ({ roads, aiSummary })
                const data = Array.isArray(response) ? response : (response.roads || []);
                trafficListEl.classList.add('dynamic-grid');
                
                trafficListEl.innerHTML = data.map(road => `
                    <div class="metric-card">
                        <div class="metric-card-header">
                            <div class="metric-icon-box" style="background: ${road.color}15; color: ${road.color};">
                                <i class="fa-solid fa-car-side"></i>
                            </div>
                            ${road.isRealTime ? '<div class="metric-badge live">ข้อมูลสด</div>' : '<div class="metric-badge city">ข้อมูลเมือง</div>'}
                        </div>
                        <div class="metric-card-body">
                            <div class="metric-title">${road.name}</div>
                            <div class="metric-value" style="color: ${road.color};">${road.status}</div>
                            <div class="metric-progress-bg">
                                <div class="metric-progress-fill" style="width: ${road.level}%; background: ${road.color};"></div>
                            </div>
                            <div class="metric-footer">
                                <span>ความหนาแน่นจราจร</span>
                                <span style="font-weight: 700; color: var(--text-main);">${road.level}%</span>
                            </div>
                            ${road.aiPrediction ? `<div style="margin-top:8px;font-size:0.72rem;color:var(--text-muted);border-top:1px solid rgba(0,0,0,0.05);padding-top:6px;">${road.aiPrediction}</div>` : ''}
                        </div>
                    </div>
                `).join('');

                // Update Forecast Hint
                let forecastHint = trafficListEl.parentElement.querySelector('.forecast-hint');
                if (!forecastHint) {
                    forecastHint = document.createElement('div');
                    forecastHint.className = 'forecast-hint';
                    forecastHint.style.marginTop = '20px';
                    forecastHint.style.fontSize = '0.85rem';
                    forecastHint.style.color = 'var(--text-muted)';
                    trafficListEl.parentElement.appendChild(forecastHint);
                }
                forecastHint.innerHTML = `<i class="fa-solid fa-crystal-ball" style="color:var(--primary-color);"></i> เชื่อมต่อระบบทำนายล่วงหน้า 24 ชม. เรียบร้อย (ดูรายละเอียดได้ในระบบ Admin)`;
            })
            .catch(e => {
                trafficListEl.innerHTML = "<p style='text-align:center; color:var(--danger-color); font-size:0.85rem;'>ไม่สามารถดึงข้อมูลได้</p>";
            });
    }

    if (trafficListEl) {
        updateHomeTraffic();
        setInterval(updateHomeTraffic, 5000); // 5s for Ultra-Live feel
    }

    // Fetch Water Level with Polling (Optimized for reliability)
    function updateWaterLevelHome() {
        const waterStatusEl = document.getElementById('home-water-status');
        const waterCanvas = document.getElementById('homeWaterChart');
        if (!waterStatusEl || !waterCanvas) return;

        fetch('/api/water/level')
            .then(res => res.json())
            .then(data => {
                if (!data || !data.current || !data.history) {
                    throw new Error("Invalid API Data Format");
                }

                const val = data.current.value;
                let text = "น้อย";
                let color = "#3b82f6";

                if (val >= 3.0 && val < 7.0) { text = "ปานกลาง"; color = "#10b981"; }
                else if (val >= 7.0 && val < 10.0) { text = "เต็ม"; color = "#f59e0b"; }
                else if (val >= 10.0) { text = "สูงเกินวิกฤต"; color = "var(--danger-color)"; }

                waterStatusEl.innerHTML = `<span style="color:${color};">${text}</span> <span style="font-size:0.9rem; color:var(--text-muted); font-weight:400;">(${val.toFixed(2)} ม.)</span>`;

                const ctx = waterCanvas.getContext('2d');
                if (window.homeWaterChartInstance) {
                    window.homeWaterChartInstance.destroy();
                }

                window.homeWaterChartInstance = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: data.history.map(d => d.month || d.day),
                        datasets: [{
                            label: 'ระดับน้ำโขง (เมตร)',
                            data: data.history.map(d => d.value),
                            borderColor: color,
                            backgroundColor: color + '33',
                            borderWidth: 2,
                            tension: 0.4,
                            fill: true,
                            pointRadius: 2,
                            pointBackgroundColor: color
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                            y: { display: false, min: 0, max: 15 },
                            x: { display: true, grid: { display: false }, ticks: { font: { size: 9 }, color: 'rgba(0,0,0,0.5)' } }
                        },
                        layout: { padding: 0 }
                    }
                });
            })
            .catch(e => {
                console.error("Water Analytics Error:", e);
                waterStatusEl.innerHTML = `<span style="color:#ef4444; font-size:0.9rem;">ไม่สามารถดึงข้อมูลได้</span>`;
            });
    }

    if (document.getElementById('homeWaterChart')) {
        updateWaterLevelHome();
        setInterval(updateWaterLevelHome, 5000); 
    }

    // Fetch Weather Level (Nakhon Phanom Areas)
    function updateWeatherHome() {
        const gridEl = document.getElementById('home-weather-grid');
        if (!gridEl) return;

        fetch('/api/weather/areas')
            .then(res => res.json())
            .then(data => {
                gridEl.innerHTML = data.map(area => {
                    if (area.error) return '';
                    const isReal = area.isReal !== false;
                    const temp = area.temp !== undefined ? Math.round(area.temp) : '--';
                    
                    return `
                        <div class="metric-card">
                            <div class="metric-card-header">
                                <div class="metric-icon-box" style="background: rgba(16, 185, 129, 0.1); color: #10b981;">
                                    <i class="fa-solid ${area.icon_base || 'fa-cloud-sun'}"></i>
                                </div>
                                ${isReal ? '<div class="metric-badge live">เรียลไทม์</div>' : ''}
                            </div>
                            <div class="metric-card-body">
                                <div class="metric-title">${area.name}</div>
                                <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 15px;">
                                    <div class="metric-value" style="color: var(--sc-secondary); margin-bottom: 0;">${temp}°C</div>
                                    <span style="font-size: 0.85rem; color: var(--text-muted); font-weight: 500; text-transform: capitalize;">${area.description || 'Clear'}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; padding-top: 12px; border-top: 1px solid rgba(0,0,0,0.05);">
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <div style="width: 28px; height: 28px; background: rgba(59, 130, 246, 0.1); border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                                            <i class="fa-solid fa-droplet" style="font-size: 0.75rem; color: #3b82f6;"></i>
                                        </div>
                                        <div>
                                            <div style="font-size: 0.85rem; font-weight: 700;">${area.humidity}%</div>
                                            <div style="font-size: 0.65rem; color: var(--text-muted);">ความชื้น</div>
                                        </div>
                                    </div>
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <div style="width: 28px; height: 28px; background: rgba(100, 116, 139, 0.1); border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                                            <i class="fa-solid fa-wind" style="font-size: 0.75rem; color: #64748b;"></i>
                                        </div>
                                        <div>
                                            <div style="font-size: 0.85rem; font-weight: 700;">${area.wind_speed} <span style="font-size: 0.6rem; font-weight: normal;">m/s</span></div>
                                            <div style="font-size: 0.65rem; color: var(--text-muted);">แรงลม</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
                
                // Trigger forecast logic
                updateWeatherForecastHome();
            })
            .catch(e => {
                console.error("Area Weather Fetch Error:", e);
                if (gridEl) gridEl.innerHTML = "<p style='text-align:center; color:var(--danger-color); font-size:0.85rem;'>ไม่สามารถดึงข้อมูลอากาศได้</p>";
            });
    }

    function updateWeatherForecastHome() {
        const gridEl = document.getElementById('home-weather-grid');
        if (!gridEl) return;

        let forecastWrap = document.getElementById('home-forecast-wrap');
        if (!forecastWrap) {
            forecastWrap = document.createElement('div');
            forecastWrap.id = 'home-forecast-wrap';
            forecastWrap.style.width = '100%';
            forecastWrap.style.marginTop = '3rem';
            forecastWrap.className = 'reveal active'; // Add active class to show immediately
            forecastWrap.innerHTML = `
                <div class="section-header-row" style="margin-bottom: 1.5rem;">
                    <div class="section-header-icon" style="color: #6366f1; background: rgba(99, 102, 241, 0.1);">
                        <i class="fa-solid fa-calendar-days"></i>
                    </div>
                    <div>
                        <h4 style="font-family: var(--font-display); font-size: 1.4rem; color: var(--text-main); line-height: 1.2;">5-Day Smart Forecast</h4>
                        <span style="font-size: 0.85rem; color: var(--text-muted); font-weight: 500;">Predictive atmospheric analytics</span>
                    </div>
                </div>
                <div id="home-forecast-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1rem;">
                    <div class="metric-card" style="padding: 2rem; text-align: center; grid-column: 1/-1;">
                        <p class="text-muted"><i class="fa-solid fa-spinner fa-spin"></i> Analyzing future atmospheric patterns...</p>
                    </div>
                </div>
            `;
            gridEl.parentElement.appendChild(forecastWrap);
        }

        fetch('/api/weather/forecast')
            .then(res => res.json())
            .then(data => {
                const forecastGrid = document.getElementById('home-forecast-grid');
                if (!forecastGrid) return;

                if (data.list && data.list.length > 0) {
                    forecastGrid.innerHTML = data.list.map(day => {
                        const dateObj = new Date(day.dt * 1000);
                        const dayName = dateObj.toLocaleDateString('th-TH', { weekday: 'long' });
                        const dateNum = dateObj.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
                        const temp = Math.round(day.temp);
                        
                        return `
                            <div class="metric-card" style="padding: 1.5rem; text-align: center; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); display: flex; flex-direction: column; align-items: center; justify-content: center;">
                                <div style="font-size: 0.9rem; font-weight: 700; color: var(--text-main); margin-bottom: 2px;">${dayName}</div>
                                <div style="font-size: 0.7rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.5px;">${dateNum}</div>
                                
                                <div style="width: 50px; height: 50px; background: rgba(0,0,0,0.03); border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 12px;">
                                    <img src="https://openweathermap.org/img/wn/${day.icon}@2x.png" style="width: 100%; height: 100%; object-fit: contain;" alt="weather icon">
                                </div>
                                
                                <div style="font-size: 1.8rem; font-weight: 800; color: var(--sc-secondary); line-height: 1; margin-bottom: 5px;">${temp}<span style="font-size: 1rem; vertical-align: top; margin-left: 2px;">°C</span></div>
                                <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500; text-transform: capitalize;">${day.description}</div>
                                
                                <div style="margin-top: 15px; width: 100%; padding-top: 10px; border-top: 1px dashed rgba(0,0,0,0.08); display: flex; justify-content: space-around; font-size: 0.7rem; color: var(--text-muted);">
                                    <span title="Humidity"><i class="fa-solid fa-droplet" style="color: #3b82f6;"></i> ${day.humidity}%</span>
                                    <span title="Wind"><i class="fa-solid fa-wind"></i> ${day.wind_speed}m/s</span>
                                </div>
                            </div>
                        `;
                    }).join('');
                } else {
                    forecastGrid.innerHTML = `
                        <div class="metric-card" style="padding: 2rem; text-align: center; grid-column: 1/-1;">
                            <p style="color: var(--danger-color);">ไม่สามารถดึงข้อมูลพยากรณ์อากาศได้ในขณะนี้</p>
                        </div>
                    `;
                }
            })
            .catch(e => {
                console.warn("Home Forecast Error:", e);
                const forecastGrid = document.getElementById('home-forecast-grid');
                if (forecastGrid) {
                    forecastGrid.innerHTML = `
                        <div class="metric-card" style="padding: 2rem; text-align: center; grid-column: 1/-1;">
                            <p style="color: var(--danger-color);">เกิดข้อผิดพลาดในการดึงข้อมูล</p>
                        </div>
                    `;
                }
            });
    }

    if (document.getElementById('home-weather-grid')) {
        updateWeatherHome();
        setInterval(updateWeatherHome, 120000); // 2 mins for hyper-live
    }

    // Global Header User Menu Injection
    const userId = localStorage.getItem('userId');
    const username = localStorage.getItem('username');
    const menuContainer = document.getElementById('user-menu-container');
    
    if (userId && username && menuContainer) {
        const isPremium = localStorage.getItem('isPremium') === 'true';
        
        // Clear and render user actions
        menuContainer.innerHTML = `
            <div class="user-pill-section desktop-only">
                <div class="user-avatar" style="width: 36px; height: 36px; background: var(--primary-color); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; box-shadow: 0 4px 12px rgba(124, 58, 237, 0.25);">
                    <i class="fa-solid fa-user"></i>
                </div>
                <div style="display: flex; flex-direction: column; line-height: 1.25;">
                    <span style="font-size: 0.95rem; font-weight: 700; color: var(--text-main); letter-spacing: -0.2px;">${username}</span>
                    <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Lv.1</span>
                </div>
            </div>
            
            ${!isPremium ? `
                <a href="programs.html" class="elegant-btn sm primary premium-glow-btn" style="padding: 6px 15px; font-size: 0.8rem; border-radius: 50px;">
                    <i class="fa-solid fa-crown"></i> 👑
                </a>
            ` : ''}

            <div style="display: flex; gap: 5px;" class="desktop-only">
                <a href="profile.html" class="elegant-btn sm secondary" style="width: 32px; height: 32px; padding: 0; border-radius: 50%; font-size: 0.8rem;">
                    <i class="fa-solid fa-gear"></i>
                </a>
                <button onclick="localStorage.clear(); window.location.reload();" class="elegant-btn sm secondary" style="width: 32px; height: 32px; padding: 0; border-radius: 50%; font-size: 0.8rem; color: #ef4444;">
                    <i class="fa-solid fa-power-off"></i>
                </button>
            </div>
        `;
    }

    // Scroll Reveal Optimization for Mobile
    const reveals = document.querySelectorAll('.reveal');
    const revealOnScroll = () => {
        for (let i = 0; i < reveals.length; i++) {
            const windowHeight = window.innerHeight;
            const elementTop = reveals[i].getBoundingClientRect().top;
            const elementVisible = 100;
            if (elementTop < windowHeight - elementVisible) {
                reveals[i].classList.add('active');
            }
        }
    };
    window.addEventListener('scroll', revealOnScroll);
    setTimeout(revealOnScroll, 500); // Small delay to ensure layout is ready
});

// Global Mobile Menu Toggle
function toggleMobileMenu() {
    const nav = document.querySelector('.nav-center');
    const btn = document.querySelector('.mobile-menu-btn');
    if (nav && btn) {
        nav.classList.toggle('active');
        btn.classList.toggle('active');
    }
}
