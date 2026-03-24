/* ===================================================
   frontend/js/gps-tracker.js
   แสดง GPS จาก ATGM336H-5N บน Leaflet map แบบ Realtime

   วิธีใช้:
     ใส่ใน map.html ต่อจาก <script src="js/map.js">
     <script src="js/gps-tracker.js"></script>

   ต้องการ:
     - Leaflet.js โหลดก่อนหน้า (มีอยู่แล้วใน map.html)
     - backend/server.js รัน WebSocket ที่ path /ws
     - backend/routes/gps.js รับ POST /api/gps/update จาก Smart Bin
   =================================================== */

(function () {

    /* ─────────────────────────────────────────────
       SECTION 1: CONFIG
       ค่าตั้งต้นที่ปรับได้
    ───────────────────────────────────────────── */
    const WS_URL        = `ws://${location.host}/ws`; // WebSocket URL (ตาม server.js path: '/ws')
    const TRAIL_MAX_PTS = 50;   // เก็บเส้นทางย้อนหลังกี่จุด (จุดเก่าสุดจะถูกลบออก)
    const RECONNECT_MS  = 4000; // reconnect อัตโนมัติถ้า WS หลุด (ms)


    /* ─────────────────────────────────────────────
       SECTION 2: STATE
       ตัวแปรเก็บสถานะ Leaflet objects แยกตาม bin_id
    ───────────────────────────────────────────── */
    // { bin_id: { marker: L.Marker, polyline: L.Polyline, trail: [[lat,lng],...] } }
    const gpsTracks = {};

    let gpsPanel; // DOM element ของ panel แสดงสถานะ GPS
    let ws;       // WebSocket instance


    /* ─────────────────────────────────────────────
       SECTION 3: UI PANEL
       สร้าง panel แสดงสถานะ GPS ที่มุมล่างซ้ายของแผนที่
       append เข้า #map-container (ต้องมีใน map.html)
    ───────────────────────────────────────────── */
    function createGPSPanel() {
        gpsPanel = document.createElement('div');
        gpsPanel.id = 'gps-live-panel';
        gpsPanel.style.cssText = `
            position: absolute;
            bottom: 20px;
            left: 20px;
            z-index: 1000;
            background: rgba(255,255,255,0.92);
            border: 1px solid rgba(26,54,93,0.15);
            border-radius: 14px;
            padding: 12px 16px;
            font-family: var(--font-body, Sarabun, sans-serif);
            font-size: 0.8rem;
            color: #1a365d;
            min-width: 200px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.1);
            backdrop-filter: blur(8px);
            pointer-events: none;
        `;
        gpsPanel.innerHTML = `
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                <span id="gps-ws-dot" style="
                    width:8px;height:8px;border-radius:50%;
                    background:#ef4444;flex-shrink:0;
                    transition:background 0.3s;
                "></span>
                <span style="font-weight:600;font-size:0.85rem;">
                    <i class="fa-solid fa-satellite-dish" style="color:#1a365d;margin-right:4px;"></i>
                    GPS Tracker
                </span>
            </div>
            <div id="gps-devices-list">
                <span style="color:#888;">รอสัญญาณ GPS...</span>
            </div>
        `;

        // append เข้า #map-container ซึ่งมี position:relative อยู่แล้วใน map.html
        const mapContainer = document.getElementById('map-container');
        if (mapContainer) mapContainer.appendChild(gpsPanel);
    }


    /* ─────────────────────────────────────────────
       SECTION 4: PANEL UPDATE
       อัปเดตข้อมูลใน panel ทุกครั้งที่ได้รับ GPS update
       รองรับหลาย device พร้อมกัน (แต่ละ bin_id = 1 row)
    ───────────────────────────────────────────── */
    function updatePanel(binId, data) {
        const list = document.getElementById('gps-devices-list');
        if (!list) return;

        let row = document.getElementById('gps-row-' + binId);
        if (!row) {
            row = document.createElement('div');
            row.id = 'gps-row-' + binId;
            row.style.cssText = 'margin-bottom:6px; padding-bottom:6px; border-bottom:1px solid rgba(0,0,0,0.05);';
            list.innerHTML = ''; // ลบ "รอสัญญาณ GPS..."
            list.appendChild(row);
        }

        // สีตาม fill_level
        const fill = data.fill_level || 0;
        const fillColor = fill >= 90 ? '#ef4444' : fill >= 70 ? '#f59e0b' : '#10b981';
        const statusIcon = fill >= 90 ? '🔴' : fill >= 70 ? '🟡' : '🟢';

        row.innerHTML = `
            <div style="font-weight:600;color:#1a365d;">
                🗑️ ${data.bin_name || 'Smart Bin #' + binId}
            </div>
            <div style="color:#475569;margin-top:2px;">
                📍 ${Number(data.lat).toFixed(6)}, ${Number(data.lng).toFixed(6)}
            </div>
            <div style="display:flex;gap:8px;margin-top:4px;flex-wrap:wrap;">
                <span>${statusIcon} ปริมาณ: <b style="color:${fillColor};">${fill}%</b></span>
                ${data.location_name ? `<span>📌 ${data.location_name}</span>` : ''}
            </div>
        `;
    }


    /* ─────────────────────────────────────────────
       SECTION 5: MARKER
       สร้าง animated GPS marker ด้วย CSS divIcon
       ใช้สีฟ้า (#2563eb) แบบ pulsing dot
    ───────────────────────────────────────────── */
    function createGPSMarker(lat, lng, binId, binName) {
        // inject CSS keyframe ครั้งเดียว
        if (!document.getElementById('gps-pulse-style')) {
            const s = document.createElement('style');
            s.id = 'gps-pulse-style';
            s.textContent = `
                @keyframes gps-pulse {
                    0%,100% { box-shadow: 0 0 0 3px rgba(37,99,235,0.35); }
                    50%      { box-shadow: 0 0 0 8px rgba(37,99,235,0.12); }
                }
            `;
            document.head.appendChild(s);
        }

        const icon = L.divIcon({
            html: `<div style="
                width:18px;height:18px;border-radius:50%;
                background:#2563eb;border:3px solid white;
                box-shadow:0 0 0 3px rgba(37,99,235,0.35);
                animation:gps-pulse 2s ease-in-out infinite;
                cursor:pointer;
            "></div>`,
            className: '',
            iconSize: [18, 18],
            iconAnchor: [9, 9],
            popupAnchor: [0, -12]
        });

        const marker = L.marker([lat, lng], { icon, zIndexOffset: 1000 });
        marker.bindPopup(`
            <b>🗑️ ${binName || 'Smart Bin #' + binId}</b><br>
            <span id="popup-gps-${binId}">กำลังอัพเดท...</span>
        `);
        return marker;
    }


    /* ─────────────────────────────────────────────
       SECTION 6: TRACK UPDATE
       อัปเดตหรือสร้าง marker + polyline trail
       เรียกทุกครั้งที่ได้รับ WebSocket message type: 'gps_update'
    ───────────────────────────────────────────── */
    function updateOrCreateTrack(data) {
        // รอให้ map (จาก map.js) พร้อมก่อน
        if (typeof map === 'undefined' || !map) return;

        const id = String(data.bin_id);

        if (!gpsTracks[id]) {
            // สร้างครั้งแรก: marker + polyline trail
            const marker = createGPSMarker(data.lat, data.lng, id, data.bin_name).addTo(map);
            const polyline = L.polyline([], {
                color: '#2563eb',
                weight: 3,
                opacity: 0.55,
                dashArray: '6 4'
            }).addTo(map);

            gpsTracks[id] = { marker, polyline, trail: [] };
        }

        const track = gpsTracks[id];

        // อัปเดตตำแหน่ง marker
        track.marker.setLatLng([data.lat, data.lng]);

        // อัปเดต popup content ถ้าเปิดอยู่
        const popupEl = document.getElementById('popup-gps-' + id);
        if (popupEl) {
            const fill = data.fill_level || 0;
            const fillColor = fill >= 90 ? '#ef4444' : fill >= 70 ? '#f59e0b' : '#10b981';
            popupEl.innerHTML = `
                ${Number(data.lat).toFixed(6)}, ${Number(data.lng).toFixed(6)}<br>
                ปริมาณขยะ: <b style="color:${fillColor};">${fill}%</b>
                ${data.location_name ? `<br>📌 ${data.location_name}` : ''}
            `;
        }

        // เพิ่มจุดใน trail
        track.trail.push([data.lat, data.lng]);
        if (track.trail.length > TRAIL_MAX_PTS) track.trail.shift(); // ลบจุดเก่าสุด
        track.polyline.setLatLngs(track.trail);

        // อัปเดต side panel
        updatePanel(id, data);
    }


    /* ─────────────────────────────────────────────
       SECTION 7: WEBSOCKET
       เชื่อมต่อ ws://<host>/ws (path ตาม server.js)
       reconnect อัตโนมัติถ้าหลุด
    ───────────────────────────────────────────── */
    function connectWS() {
        ws = new WebSocket(WS_URL);

        ws.onopen = () => {
            console.log('[GPS-WS] Connected to', WS_URL);
            const dot = document.getElementById('gps-ws-dot');
            if (dot) dot.style.background = '#16a34a'; // เขียว = เชื่อมต่อแล้ว
        };

        ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                // รับเฉพาะ type: 'gps_update' จาก backend/routes/gps.js
                if (msg.type === 'gps_update') {
                    updateOrCreateTrack(msg.data);
                }
            } catch (e) {
                console.warn('[GPS-WS] Parse error', e);
            }
        };

        ws.onclose = () => {
            console.log('[GPS-WS] Disconnected. Retry in', RECONNECT_MS, 'ms');
            const dot = document.getElementById('gps-ws-dot');
            if (dot) dot.style.background = '#ef4444'; // แดง = หลุด
            setTimeout(connectWS, RECONNECT_MS); // reconnect อัตโนมัติ
        };

        ws.onerror = (err) => {
            console.error('[GPS-WS] Error', err);
        };
    }


    /* ─────────────────────────────────────────────
       SECTION 8: INIT
       รอ map.js init เสร็จก่อน (map.js ใช้ setTimeout 1200ms)
       จึงรอ 1500ms ก่อนเริ่ม GPS tracker
    ───────────────────────────────────────────── */
    setTimeout(() => {
        createGPSPanel(); // สร้าง UI panel
        connectWS();      // เชื่อมต่อ WebSocket
    }, 1500);

})();
