var map;
var routeControl;
var userLocation = [17.4045, 104.7933]; // Default Nakhon Phanom Center
var manualPoints = [];
var tempMarkers = [];
var smartBinMarkers = []; // เก็บ marker ของถังขยะ

document.addEventListener('DOMContentLoaded', function() {
    // Load and show mockup from database
    loadMockupFromDatabase();
    
    // Wait for everything to settle
    setTimeout(function() {
        initMap();
        setupGPS();
        // Initial render with static places, then fetch from backend
        renderPlaces();
        fetchPlaces();
        // Load smart bins from database
        loadSmartBins();
    }, 1200);
});

async function loadMockupFromDatabase() {
    try {
        const response = await fetch('/api/mockup');
        if (response.ok) {
            const mockupData = await response.json();
            renderMockup(mockupData);
            showMockupIfFirstVisit();
        }
    } catch (error) {
        console.error('Error loading mockup:', error);
        // Use default mockup if API fails
        showMockupIfFirstVisit();
    }
}

function renderMockup(data) {
    const mockupOverlay = document.getElementById('map-mockup-overlay');
    if (!mockupOverlay) return;

    const featuresHTML = data.features.map(feature => `
        <div class="mockup-feature">
            <i class="fa-solid ${feature.icon}"></i>
            <span>${feature.text}</span>
        </div>
    `).join('');

    const mockupContent = `
        <div class="mockup-content">
            <div class="mockup-header">
                <i class="fa-solid ${data.icon}"></i>
                <h3>${data.title}</h3>
                ${data.description ? `<p style="margin-top: 0.5rem; opacity: 0.9;">${data.description}</p>` : ''}
            </div>
            <div class="mockup-features">
                ${featuresHTML}
            </div>
            <button class="mockup-close-btn" onclick="closeMockup()">
                <i class="fa-solid fa-xmark"></i> ปิดตัวอย่าง
            </button>
        </div>
    `;

    mockupOverlay.innerHTML = mockupContent;
}

function showMockupIfFirstVisit() {
    const hasSeenMockup = localStorage.getItem('hasSeenMapMockup');
    if (!hasSeenMockup) {
        setTimeout(function() {
            const mockup = document.getElementById('map-mockup-overlay');
            if (mockup) {
                mockup.classList.add('active');
            }
        }, 2000);
    }
}

function closeMockup() {
    const mockup = document.getElementById('map-mockup-overlay');
    if (mockup) {
        mockup.classList.remove('active');
        localStorage.setItem('hasSeenMapMockup', 'true');
    }
}

// Optional: Show mockup manually (for testing or button trigger)
function showMockup() {
    const mockup = document.getElementById('map-mockup-overlay');
    if (mockup) {
        mockup.classList.add('active');
    }
}

async function fetchPlaces() {
    try {
        const response = await fetch('/api/place');
        if (response.ok) {
            const backendPlaces = await response.json();
            // Merge backend places with static ones
            backendPlaces.forEach(p => {
                // Map backend icon or use default
                p.icon = p.icon || (p.type === 'restaurant' ? 'fa-mug-hot' : 'fa-location-dot');
                if (!PLACES.find(staticP => staticP.lat === p.lat && staticP.lng === p.lng)) {
                    PLACES.push(p);
                }
            });
            renderPlaces();
        }
    } catch (error) {
        console.error("Error fetching places:", error);
    }
}

// พิกัดจริงจาก OpenStreetMap / Google Maps (ตรวจสอบแล้ว)
var PLACES = [
    { name: 'พญาศรีสัตตนาคราช (แลนด์มาร์ค)', lat: 17.4038, lng: 104.7865, icon: 'fa-vihara' },
    { name: 'หอนาฬิกาเวียดนามอนุสรณ์', lat: 17.4069, lng: 104.7843, icon: 'fa-landmark' },
    { name: 'ตลาดอินโดจีน', lat: 17.4065, lng: 104.7882, icon: 'fa-bag-shopping' },
    { name: 'บ้านลุงโฮจิมินห์', lat: 17.3948, lng: 104.7336, icon: 'fa-house' },
    { name: 'พระธาตุพนม (วรมหาวิหาร)', lat: 16.9444, lng: 104.7247, icon: 'fa-vihara' },
    { name: 'สะพานมิตรภาพไทย-ลาว 3', lat: 17.4851, lng: 104.7431, icon: 'fa-bridge' },
    { name: 'โบสถ์นักบุญอันนา', lat: 17.4190, lng: 104.7820, icon: 'fa-church' },
    { name: 'โรงพยาบาลนครพนม', lat: 17.3992, lng: 104.7806, icon: 'fa-hospital' },
    { name: 'วัดมหาธาตุ', lat: 17.3985, lng: 104.7915, icon: 'fa-vihara' },
    { name: 'ศาลากลางจังหวัดนครพนม', lat: 17.3995, lng: 104.7842, icon: 'fa-building-columns' },
    { name: 'ถนนคนเดินนครพนม', lat: 17.4080, lng: 104.7810, icon: 'fa-person-walking' },
    { name: 'ลานพญาศรีสัตตนาคราช', lat: 17.4038, lng: 104.7865, icon: 'fa-dragon' }
];

function initMap() {
    var container = document.getElementById('map-container');
    if (!container) return;
    
    // Clear the loading text
    container.innerHTML = '';
    
    map = L.map('map-container', { zoomControl: false }).setView(userLocation, 14);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Fetch Longdo Key and Add Traffic Layer
    fetch('/api/config/client-keys')
        .then(res => res.json())
        .then(config => {
            if (config.longdoKey && config.longdoKey !== 'YOUR_LONGDO_MAP_KEY_HERE') {
                const trafficLayer = L.tileLayer('https://ms.longdo.com/mmmap/tile.php?layer=traffic&key=' + config.longdoKey + '&x={x}&y={y}&z={z}', {
                    maxZoom: 18,
                    opacity: 0.8
                });
                trafficLayer.addTo(map);
                console.log("Longdo Traffic Layer Added to Main Map");
            }
        }).catch(err => console.error("Config fetch error:", err));

    // Manual Routing Listener
    map.on('click', handleMapClick);
    
    setTimeout(function() { map.invalidateSize(); }, 500);
}

function handleMapClick(e) {
    const hint = document.getElementById('route-hint');
    const hintText = document.getElementById('hint-text');
    const controls = document.getElementById('manual-route-controls');

    if (manualPoints.length === 0) {
        // Clear previous
        clearManualRoute();
        
        // Add Start Marker
        const startMarker = L.marker(e.latlng, {
            icon: L.divIcon({
                className: 'manual-pin-start',
                html: '<i class="fa-solid fa-location-dot" style="color:var(--success-color); font-size:1.5rem; text-shadow:0 0 10px white;"></i>',
                iconAnchor: [12, 24]
            })
        }).addTo(map).bindPopup("จุดเริ่มต้น").openPopup();
        
        tempMarkers.push(startMarker);
        manualPoints.push(e.latlng);

        // Update Hint
        hint.style.display = 'block';
        hintText.innerText = "คลิกอีกครั้งเพื่อเลือก จุดปลายทาง";
        controls.style.display = 'block';

    } else if (manualPoints.length === 1) {
        // Add End Marker
        const endMarker = L.marker(e.latlng, {
            icon: L.divIcon({
                className: 'manual-pin-end',
                html: '<i class="fa-solid fa-flag-checkered" style="color:var(--accent-color); font-size:1.5rem; text-shadow:0 0 10px white;"></i>',
                iconAnchor: [12, 24]
            })
        }).addTo(map).bindPopup("ปลายทางของคุณ").openPopup();

        tempMarkers.push(endMarker);
        manualPoints.push(e.latlng);

        // Render Route
        renderManualRoute(manualPoints[0], manualPoints[1]);

        // Hide Hint
        hint.style.display = 'none';
    }
}

function renderManualRoute(start, end) {
    if (routeControl) map.removeControl(routeControl);

    document.getElementById('ai-route-result').classList.remove('hidden');
    document.getElementById('route-steps').innerHTML = '<div style="padding:15px; border-radius:12px; background:rgba(0,122,255,0.05);"><h4>กำลังสร้างเส้นทางที่คุณเลือก</h4><p>คำนวณจาก OSRM สั้นที่สุดให้ครับ...</p></div>';

    routeControl = L.Routing.control({
        waypoints: [start, end],
        show: false,
        addWaypoints: false,
        lineOptions: { 
            styles: [{
                color: '#1A237E', 
                opacity: 0.8, 
                weight: 8 
            }] 
        }
    }).addTo(map);

    map.fitBounds(L.latLngBounds(start, end), { padding: [50, 50] });
}

function clearManualRoute() {
    if (routeControl) map.removeControl(routeControl);
    tempMarkers.forEach(m => map.removeLayer(m));
    tempMarkers = [];
    manualPoints = [];
    
    document.getElementById('route-hint').style.display = 'none';
    document.getElementById('manual-route-controls').style.display = 'none';
    document.getElementById('ai-route-result').classList.add('hidden');
}

function setupGPS() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(pos) {
            userLocation = [pos.coords.latitude, pos.coords.longitude];
            L.marker(userLocation, {
                icon: L.divIcon({
                    className: 'user-pin',
                    html: '<div style="background:var(--primary-color); width:18px; height:18px; border-radius:50%; border:3px solid white; box-shadow:0 0 15px var(--primary-color);"></div>',
                    iconSize: [22,22]
                })
            }).addTo(map).bindPopup("คุณอยู่ที่นี่").openPopup();
            
            map.setView(userLocation, 15);
            renderPlaces(); // Re-render to sort by proximity
        }, null, { enableHighAccuracy: true });
    }
}

function getDistanceKM(lat1, lon1, lat2, lon2) {
    var p = 0.017453292519943295;
    var c = Math.cos;
    var a = 0.5 - c((lat2 - lat1) * p)/2 + c(lat1 * p) * c(lat2 * p) * (1 - c((lon2 - lon1) * p))/2;
    return 12742 * Math.asin(Math.sqrt(a));
}

function renderPlaces() {
    var panel = document.getElementById('ai-options-panel');
    if (!panel) return;

    var sorted = PLACES.slice().sort(function(a, b) {
        return getDistanceKM(userLocation[0], userLocation[1], a.lat, a.lng) - 
               getDistanceKM(userLocation[0], userLocation[1], b.lat, b.lng);
    });

    var html = '<p style="color:var(--text-muted); font-size: 0.9rem; margin-bottom: 1rem;">ทริปแนะนำตามตำแหน่งปัจจุบันของคุณ:</p>';
    sorted.forEach(function(p) {
        var dist = getDistanceKM(userLocation[0], userLocation[1], p.lat, p.lng).toFixed(1);
        html += '<div style="display:flex; flex-direction:column; gap:5px; margin-bottom:15px;">';
        html += '<button class="elegant-btn secondary" onclick="goTrip(' + p.lat + ',' + p.lng + ',\'' + p.name + '\')" ';
        html += 'style="width:100%; display:flex; justify-content:space-between; align-items:center; padding:15px; border-radius:15px;">';
        html += '<span><i class="fa-solid ' + p.icon + '" style="color:var(--primary-color); margin-right:8px;"></i> ' + p.name + '</span>';
        html += '<span style="font-size:0.85rem; color:var(--text-muted);">' + dist + ' กม.</span>';
        html += '</button>';
        
        // Add Check-in Button if close enough (e.g., < 0.5 km)
        if (parseFloat(dist) < 0.5) {
            html += '<div style="display:flex; gap:10px; width:100%; margin-top:5px;">';
            html += '<button class="elegant-btn primary" onclick="handleCheckin(' + (p.id || 1) + ',\'' + p.name + '\')" ';
            html += 'style="flex:1; font-size:0.85rem; padding:8px; border-radius:10px; background:var(--success-color); border:none;">';
            html += '<i class="fa-solid fa-location-crosshairs"></i> เช็คอิน (+350 XP)';
            html += '</button>';
            html += '<button class="elegant-btn secondary" onclick="openReviewModal(' + (p.id || 1) + ',\'' + p.name + '\')" ';
            html += 'style="flex:1; font-size:0.85rem; padding:8px; border-radius:10px;">';
            html += '<i class="fa-solid fa-star"></i> รีวิวสถานที่';
            html += '</button>';
            html += '</div>';
        } else {
            // Only show Review button
            html += '<button class="elegant-btn secondary" onclick="openReviewModal(' + (p.id || 1) + ',\'' + p.name + '\')" ';
            html += 'style="width:100%; margin-top:5px; font-size:0.85rem; padding:8px; border-radius:10px;">';
            html += '<i class="fa-solid fa-star"></i> รีวิวสถานที่นี้';
            html += '</button>';
        }
        html += '</div>';
    });
    
    panel.innerHTML = html;
}

function goTrip(lat, lng, name) {
    if (routeControl) map.removeControl(routeControl);
    
    // Clear loading/previous
    var res = document.getElementById('ai-route-result');
    if (res) res.classList.remove('hidden');
    document.getElementById('route-steps').innerHTML = '<div style="padding:15px; border-radius:12px; background:rgba(0,122,255,0.05);"><h4>กำลังนำทางไป ' + name + '</h4><p>คำนวณเส้นทางตามถนนจริงสั้นที่สุด...</p></div>';

    routeControl = L.Routing.control({
        waypoints: [L.latLng(userLocation[0], userLocation[1]), L.latLng(lat, lng)],
        show: false,
        addWaypoints: false,
        lineOptions: { styles: [{color: getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim() || '#1A237E', opacity: 0.8, weight: 6}] }
    }).addTo(map);

    map.flyTo([lat, lng], 15);

    // Hide panel on mobile to see map
    if (window.innerWidth <= 1024) {
        toggleAIPanel();
    }
}

function toggleAIPanel() {
    var panel = document.querySelector('.ai-panel');
    var btn = document.querySelector('.mobile-ai-toggle');
    if (panel) {
        panel.classList.toggle('active');
        if (btn) {
            btn.innerHTML = panel.classList.contains('active') ? 
                '<i class="fa-solid fa-xmark"></i>' : 
                '<i class="fa-solid fa-wand-magic-sparkles"></i>';
        }
        setTimeout(function() { map.invalidateSize(); }, 500);
    }
}

// Map Page Traffic Info Synchronization
function updateMapTrafficInfo() {
    const badge = document.getElementById('map-traffic-badge');
    const hint = document.getElementById('map-traffic-forecast-hint');
    if (!badge || !hint) return;

    fetch('/api/traffic/status')
        .then(res => res.json())
        .then(response => {
            // รองรับทั้ง format เก่า (array) และใหม่ { roads, aiSummary }
            const data = Array.isArray(response) ? response : (response.roads || []);
            if (data.length === 0) return;

            const avgLevel = data.reduce((sum, d) => sum + d.level, 0) / data.length;
            let status = 'ไหลลื่น';
            let color = '#10b981';
            if (avgLevel > 70) { status = 'ติดขัดหนาแน่น'; color = '#ef4444'; }
            else if (avgLevel > 40) { status = 'ชะลอตัว'; color = '#f59e0b'; }

            const percentageEl = document.getElementById('map-traffic-percentage');
            const statusTextEl = document.getElementById('map-traffic-status-text');
            const pbarContainer = document.getElementById('map-traffic-pbar-container');

            if (percentageEl) percentageEl.innerText = `${Math.round(avgLevel)}%`;
            if (statusTextEl) { statusTextEl.innerText = status; statusTextEl.style.color = color; }
            if (pbarContainer) {
                pbarContainer.innerHTML = `<div class="traffic-bar-fill" style="width:${avgLevel}%;height:100%;background:${color};transition:width 1s;"></div>`;
            }
            badge.innerHTML = `<span style="background:${color};color:white;padding:4px 12px;border-radius:20px;font-size:0.65rem;font-weight:800;letter-spacing:0.5px;white-space:nowrap;display:inline-block;">${status.toUpperCase()}</span>`;

            fetch('/api/traffic/forecast')
                .then(res => res.json())
                .then(forecast => {
                    if (!forecast || forecast.length === 0) return;
                    const nextHour = forecast[0];
                    const trend = nextHour.level > avgLevel ? 'มีแนวโน้มหนาแน่นขึ้น' : 'มีแนวโน้มระบายตัวดี';
                    hint.innerHTML = `<i class="fa-solid fa-crystal-ball" style="color:var(--sc-secondary);"></i> พยากรณ์: ${trend} ใน 1-2 ชม. หน้า`;
                });
        }).catch(err => console.error('Traffic info sync error:', err));
}

updateMapTrafficInfo();
setInterval(updateMapTrafficInfo, 5000); // 5s refresh

// Load Smart Bins from Database
async function loadSmartBins() {
    try {
        const response = await fetch('/api/smartbin');
        if (response.ok) {
            const bins = await response.json();
            renderSmartBins(bins);
        }
    } catch (error) {
        console.error('Error loading smart bins:', error);
    }
}

function renderSmartBins(bins) {
    // Clear existing markers
    smartBinMarkers.forEach(marker => map.removeLayer(marker));
    smartBinMarkers = [];

    bins.forEach(bin => {
        addSmartBinMarker(bin);
    });

    console.log(`Loaded ${bins.length} smart bins on map`);
}

function addSmartBinMarker(bin) {
    // กำหนดสีตามระดับความเต็ม
    let color = '#10b981'; // เขียว (ว่าง)
    if (bin.fill_level >= 90) {
        color = '#ef4444'; // แดง (เต็ม)
    } else if (bin.fill_level >= 70) {
        color = '#f59e0b'; // ส้ม (ใกล้เต็ม)
    } else if (bin.fill_level >= 50) {
        color = '#fbbf24'; // เหลือง (ครึ่งหนึ่ง)
    }

    // กำหนดไอคอนตามประเภทถังขยะ
    let binIcon = 'fa-trash-can';
    if (bin.bin_type === 'recycle') {
        binIcon = 'fa-recycle';
    } else if (bin.bin_type === 'organic') {
        binIcon = 'fa-leaf';
    } else if (bin.bin_type === 'hazardous') {
        binIcon = 'fa-biohazard';
    }

    const marker = L.marker([bin.lat, bin.lng], {
        icon: L.divIcon({
            className: 'smart-bin-marker',
            html: `
                <div style="position: relative;">
                    <div style="
                        background: ${color};
                        width: 40px;
                        height: 40px;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                        border: 3px solid white;
                    ">
                        <i class="fa-solid ${binIcon}" style="color: white; font-size: 1.2rem;"></i>
                    </div>
                    <div style="
                        position: absolute;
                        top: -8px;
                        right: -8px;
                        background: white;
                        color: ${color};
                        font-size: 0.7rem;
                        font-weight: bold;
                        padding: 2px 6px;
                        border-radius: 10px;
                        border: 2px solid ${color};
                        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                    ">${bin.fill_level}%</div>
                </div>
            `,
            iconSize: [40, 40],
            iconAnchor: [20, 40]
        })
    }).addTo(map);

    // Popup content
    const binTypeText = {
        'general': 'ทั่วไป',
        'recycle': 'รีไซเคิล',
        'organic': 'อินทรีย์',
        'hazardous': 'อันตราย'
    };

    const statusText = {
        'active': 'ใช้งานได้',
        'full': 'เต็มแล้ว',
        'maintenance': 'ซ่อมบำรุง',
        'inactive': 'ไม่ใช้งาน'
    };

    const popupContent = `
        <div style="min-width: 200px;">
            <h4 style="margin: 0 0 10px 0; color: ${color};">
                <i class="fa-solid ${binIcon}"></i> ${bin.name}
            </h4>
            <p style="margin: 5px 0; color: #666;">
                <i class="fa-solid fa-location-dot"></i> ${bin.location_name || 'ไม่ระบุสถานที่'}
            </p>
            <div style="margin: 10px 0;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span>ประเภท:</span>
                    <strong>${binTypeText[bin.bin_type] || bin.bin_type}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span>ระดับขยะ:</span>
                    <strong style="color: ${color};">${bin.fill_level}%</strong>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span>สถานะ:</span>
                    <strong>${statusText[bin.status] || bin.status}</strong>
                </div>
            </div>
            <div style="width: 100%; height: 8px; background: #e5e7eb; border-radius: 10px; overflow: hidden; margin-top: 10px;">
                <div style="width: ${bin.fill_level}%; height: 100%; background: ${color}; transition: width 0.3s;"></div>
            </div>
        </div>
    `;

    marker.bindPopup(popupContent);
    marker.binData = bin; // เก็บข้อมูลไว้ใน marker
    smartBinMarkers.push(marker);
}

// Update existing marker or add new one
function updateSmartBinMarker(binData) {
    // หา marker ที่มี id ตรงกัน
    const existingMarker = smartBinMarkers.find(m => m.binData && m.binData.id === binData.id);
    
    if (existingMarker) {
        // อัปเดต marker ที่มีอยู่
        map.removeLayer(existingMarker);
        const index = smartBinMarkers.indexOf(existingMarker);
        smartBinMarkers.splice(index, 1);
    }
    
    // เพิ่ม marker ใหม่
    addSmartBinMarker(binData);
    
    console.log(`Smart bin ${binData.name} updated on map`);
}

// WebSocket for Real-time Updates
function connectSmartBinWebSocket() {
    const wsUrl = `ws://${location.host}/ws`;
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
        console.log('[SmartBin-WS] Connected for real-time updates');
    };
    
    ws.onmessage = (event) => {
        try {
            const msg = JSON.parse(event.data);
            
            // รับข้อมูล smart bin update
            if (msg.type === 'smartbin_update') {
                updateSmartBinMarker(msg.data);
            }
            // รับข้อมูล smart bin ใหม่
            else if (msg.type === 'smartbin_new') {
                addSmartBinMarker(msg.data);
            }
            // รับข้อมูลลบ smart bin
            else if (msg.type === 'smartbin_delete') {
                const marker = smartBinMarkers.find(m => m.binData && m.binData.id === msg.data.id);
                if (marker) {
                    map.removeLayer(marker);
                    const index = smartBinMarkers.indexOf(marker);
                    smartBinMarkers.splice(index, 1);
                    console.log(`Smart bin #${msg.data.id} removed from map`);
                }
            }
        } catch (e) {
            console.warn('[SmartBin-WS] Parse error', e);
        }
    };
    
    ws.onclose = () => {
        console.log('[SmartBin-WS] Disconnected. Reconnecting in 5s...');
        setTimeout(connectSmartBinWebSocket, 5000);
    };
    
    ws.onerror = (err) => {
        console.error('[SmartBin-WS] Error', err);
    };
}

// เริ่มต้น WebSocket connection
setTimeout(() => {
    connectSmartBinWebSocket();
}, 2000);

// Refresh smart bins every 30 seconds (backup)
setInterval(loadSmartBins, 30000);
