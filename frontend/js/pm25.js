document.addEventListener('DOMContentLoaded', () => {
    fetchPM25Data();
    // Refresh every 5 minutes
    setInterval(fetchPM25Data, 5 * 60 * 1000);
});

async function fetchPM25Data() {
    const pmWidget = document.getElementById('pm25-widget');
    const pmWidgetLarge = document.getElementById('pm25-widget-large');
    const adminPMValue = document.getElementById('pm25-val');
    const adminPMStatus = document.getElementById('pm25-status');
    
    if (!pmWidget && !adminPMValue && !pmWidgetLarge) return;

    try {
        const response = await fetch('/api/pm25');
        const data = await response.json();

        if (data.error) {
            console.warn('PM2.5 API Setup required');
            if (pmWidget) pmWidget.querySelector('.pm-value').textContent = 'Setup';
            if (adminPMValue) adminPMValue.textContent = 'Setup';
            if (pmWidgetLarge) pmWidgetLarge.innerHTML = 'Setup <span style="font-size: 1rem; font-family: var(--font-body);">AQI</span>';
            return;
        }

        window.currentPMData = data;
        const aqi = data.current.aqi;
        const status = data.current.status;
        
        // Update Navbar Widget — use AQI (same value as everywhere else)
        if (pmWidget) {
            pmWidget.querySelector('.pm-value').textContent = aqi;
            pmWidget.classList.remove('loading', 'good', 'moderate', 'danger');
            if (aqi <= 50) pmWidget.classList.add('good');
            else if (aqi <= 100) pmWidget.classList.add('moderate');
            else pmWidget.classList.add('danger');
            
            // Add click listener if not added
            if (!pmWidget.dataset.listenerAdded) {
                pmWidget.addEventListener('click', () => showHighPMAlert(aqi, data.forecast));
                pmWidget.dataset.listenerAdded = 'true';
                pmWidget.style.cursor = 'pointer';
            }
        }

        // Update Hero/Large Widget (Breath of the City)
        if (pmWidgetLarge) {
            pmWidgetLarge.innerHTML = `${aqi} <span style="font-size: 1.5rem; font-family: var(--font-body); vertical-align: middle;">AQI</span>`;
            pmWidgetLarge.style.color = aqi <= 50 ? 'var(--sc-accent)' : (aqi <= 100 ? 'var(--sc-secondary)' : '#ef4444');
        }

        // Update Admin Dashboard Widget
        if (adminPMValue) {
            adminPMValue.innerHTML = `${aqi} <span style="font-size: 1.1rem; color: var(--sc-text-neutral); font-weight: 400;">AQI</span>`;
            if (adminPMStatus) {
                const icon = aqi <= 50 ? 'fa-face-smile' : (aqi <= 100 ? 'fa-face-meh' : 'fa-face-frown');
                adminPMStatus.innerHTML = `<i class="fa-regular ${icon}"></i> ${status}`;
                adminPMStatus.style.color = aqi <= 50 ? 'var(--sc-accent)' : (aqi <= 100 ? 'var(--sc-secondary)' : '#ef4444');
            }
            const forecastEl = document.getElementById('pm25-forecast');
            if (forecastEl && data.forecast) {
                forecastEl.innerHTML = `<i class="fa-solid fa-crystal-ball"></i> พยากรณ์พรุ่งนี้: ${data.forecast.aqi} AQI (${data.forecast.status})`;
            }
        }
        
        // Auto show alert if unhealthy
        if (aqi > 100 && !sessionStorage.getItem('pm25AlertShown')) {
            showHighPMAlert(aqi, data.forecast);
            sessionStorage.setItem('pm25AlertShown', '1');
        }
    } catch (error) {
        console.error('Error fetching PM2.5 data:', error);
    }
}

function showHighPMAlert(aqi, forecast) {
    let overlay = document.getElementById('pm-modal-overlay');
    let modal = document.getElementById('pm25-alert-modal');

    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'pm-modal-overlay';
        overlay.className = 'modal-overlay';
        document.body.appendChild(overlay);
    }

    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'pm25-alert-modal';
        modal.className = 'elegant-modal';
        document.body.appendChild(modal);
    }

    const isDanger = aqi > 100;
    const title = isDanger ? 'แจ้งเตือนฝุ่นละออง' : 'คุณภาพอากาศปัจจุบัน';
    const icon = isDanger ? 'fa-triangle-exclamation' : 'fa-circle-info';
    const color = isDanger ? '#ef4444' : 'var(--sc-primary)';

    modal.innerHTML = `
        <h3 style="color: ${color};">
            <i class="fa-solid ${icon}"></i> ${title}
        </h3>
        <p>ขณะนี้ค่า AQI ในนครพนมอยู่ที่ <strong style="color: ${color}; font-size: 1.4rem;">${aqi}</strong></p>
        <p style="margin-bottom: 20px;">ดูแลสุขภาพด้วยนะครับ</p>
        
        <div style="background: #f8fafc; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0; text-align: left; margin-bottom: 20px;">
            <p style="font-weight: 600; margin-bottom: 10px; color: #1e293b;">
                <i class="fa-solid fa-crystal-ball" style="color: var(--sc-secondary);"></i> พยากรณ์อากาศล่วงหน้า
            </p>
            ${forecast ? `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>คาดการณ์:</span>
                <span style="font-weight: 700; font-size: 1.2rem;">${forecast.aqi} AQI</span>
            </div>
            ` : `<p>แนวโน้มปกติ</p>`}
        </div>
        <button class="elegant-btn primary" onclick="closePMModal()" style="width: 100%; justify-content: center; background: ${color} !important;">ตกลง</button>
    `;

    setTimeout(() => {
        overlay.classList.add('show');
        modal.classList.add('show');
    }, 10);
}

window.closePMModal = function() {
    const modal = document.getElementById('pm25-alert-modal');
    const overlay = document.getElementById('pm-modal-overlay');
    if (modal) {
        modal.classList.remove('show');
        if (overlay) overlay.classList.remove('show');
        setTimeout(() => {
            modal.remove();
            overlay.remove();
        }, 400);
    }
};
