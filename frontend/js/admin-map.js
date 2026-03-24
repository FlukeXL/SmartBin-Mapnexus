// frontend/js/admin-map.js

document.addEventListener('DOMContentLoaded', function() {
    var mapContainer = document.getElementById('admin-map');
    if (!mapContainer) return;

    // If Google Maps key is set, initAdminGoogleMap will handle the map via callback
    // We still init Leaflet as fallback — it will be replaced if Google Maps loads
    var adminMap = L.map('admin-map', {
        zoomControl: false
    }).setView([17.4085, 104.7760], 15);

    // Expose so initDashboard and renderTrafficList can use the map
    window._leafletAdminMap = adminMap;
    window.adminMap = adminMap;

    L.control.zoom({ position: 'bottomright' }).addTo(adminMap);

    var currentTileLayer = null;
    var twinLayers = L.layerGroup();
    var trafficLayer = null;
    
    const tileStyles = {
        normal: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' // CartoDB Dark Matter
    };

    function setMapStyle(mode) {
        if (currentTileLayer) adminMap.removeLayer(currentTileLayer);
        currentTileLayer = L.tileLayer(tileStyles[mode], {
            attribution: '&copy; OpenStreetMap &copy; CartoDB',
            maxZoom: 20
        }).addTo(adminMap);
        
        const mapEl = document.getElementById('admin-map');
        if (mode === 'dark') mapEl.classList.add('tilted');
        else mapEl.classList.remove('tilted');
    }
    setMapStyle('normal');

    // --- REAL-TIME LONGDO TRAFFIC LAYER ---
    // If a key is provided, we can show the REAL traffic lines
    function initTrafficLayer(key) {
        if (!key || key === 'YOUR_LONGDO_MAP_KEY_HERE') return;
        
        // Longdo Tile Layer for Traffic
        trafficLayer = L.tileLayer('https://ms.longdo.com/mmmap/tile.php?layer=traffic&key=' + key + '&x={x}&y={y}&z={z}', {
            maxZoom: 18,
            opacity: 0.7,
            zIndex: 1000
        }).addTo(adminMap);
        
        console.log("Real-time Longdo Traffic Layer Enabled");
    }

    // Try to get key from a hidden data attribute on the map container
    const longdoKey = mapContainer.getAttribute('data-key');
    initTrafficLayer(longdoKey);

    // --- AUTHENTIC DATA: START/END POINTS FOR REAL ROADS ---
    const roadDefinitions = {
        "ถนนสุนทรวิจิตร (ริมโขง)": { start: [17.4190, 104.7820], end: [17.3985, 104.7915] },
        "ถนนนิตโย (ขาเข้าเมือง)": { start: [17.4080, 104.7700], end: [17.4069, 104.7845] },
        "ถนนอภิบาลบัญชา": { start: [17.4100, 104.7840], end: [17.3980, 104.7920] },
        "ถนนชยางกูร": { start: [17.4121, 104.7867], end: [17.4450, 104.7700] }
    };

    // Traffic polyline layer
    var trafficPolylines = L.layerGroup().addTo(adminMap);

    // Store layer references for manual investigation
    var adminRouteControl = null;
    var adminManualPoints = [];
    var adminTempMarkers = [];

    // Map Click Listener
    adminMap.on('click', handleAdminMapClick);

    function handleAdminMapClick(e) {
        const hint = document.getElementById('admin-route-hint');
        const hintText = document.getElementById('admin-hint-text');
        const clearBtn = document.getElementById('clear-admin-map-btn');

        if (adminManualPoints.length === 0) {
            // Clear previous
            clearAdminRoute();
            
            // Add Start Marker
            const startMarker = L.marker(e.latlng, {
                icon: L.divIcon({
                    className: 'manual-pin-start',
                    html: '<i class="fa-solid fa-circle-dot" style="color:var(--success-color); font-size:1.2rem;"></i>',
                    iconAnchor: [10, 10]
                })
            }).addTo(adminMap).bindPopup("จุดเริ่มตรวจสอบ").openPopup();
            
            adminTempMarkers.push(startMarker);
            adminManualPoints.push(e.latlng);

            // Update Hint
            hintText.innerText = "เลือกจุดสิ้นสุดเพื่อคำนวณเส้นทาง";
            clearBtn.style.display = 'flex';

        } else if (adminManualPoints.length === 1) {
            // Add End Marker
            const endMarker = L.marker(e.latlng, {
                icon: L.divIcon({
                    className: 'manual-pin-end',
                    html: '<i class="fa-solid fa-location-crosshairs" style="color:var(--accent-color); font-size:1.2rem;"></i>',
                    iconAnchor: [10, 10]
                })
            }).addTo(adminMap).bindPopup("จุดจบการตรวจสอบ").openPopup();

            adminTempMarkers.push(endMarker);
            adminManualPoints.push(e.latlng);

            // Render Route
            renderAdminRoute(adminManualPoints[0], adminManualPoints[1]);

            // Hide Hint
            hint.style.display = 'none';
        }
    }

    function renderAdminRoute(start, end) {
        if (adminRouteControl) adminMap.removeControl(adminRouteControl);

        adminRouteControl = L.Routing.control({
            waypoints: [start, end],
            show: false,
            addWaypoints: false,
            lineOptions: { 
                styles: [{
                    color: '#2D3748', // Neutral dark for admin investigation
                    opacity: 0.8, 
                    weight: 8 
                }] 
            }
        }).addTo(adminMap);

        adminMap.fitBounds(L.latLngBounds(start, end), { padding: [40, 40] });
    }

    // Assign to window for HTML access
    window.clearAdminRoute = function() {
        if (adminRouteControl) adminMap.removeControl(adminRouteControl);
        adminTempMarkers.forEach(m => adminMap.removeLayer(m));
        adminTempMarkers = [];
        adminManualPoints = [];
        adminRouteControl = null;
        
        document.getElementById('admin-route-hint').style.display = 'block';
        document.getElementById('admin-hint-text').innerText = "คลิกบนแผนที่เพื่อเริ่มตรวจสอบเส้นทาง";
        document.getElementById('clear-admin-map-btn').style.display = 'none';
    };

    // --- FUTURE HUD LOGIC (10 YEARS FUTURE) ---
    const twinData = [
        { name: "ท่าอากาศยานนครพนม", type: "transport", pos: [17.3837, 104.6433], color: "#00f2ff", icon: "fa-plane" },
        { name: "สะพานมิตรภาพ 3", type: "transport", pos: [17.4850, 104.7550], color: "#10b981", icon: "fa-bridge" },
        { name: "ลานพญาศรีสัตตนาคราช", type: "crowd", pos: [17.4101, 104.7905], color: "#bd00ff", icon: "fa-users" },
        { name: "โครงข่ายไฟฟ้า PTT", type: "energy", pos: [17.4150, 104.7780], color: "#ffcc00", icon: "fa-bolt" },
        { name: "ท่าเรือท่องเที่ยวนครพนม", type: "transport", pos: [17.4020, 104.7930], color: "#ef4444", icon: "fa-ship" }
    ];

    window.setMapMode = function(mode) {
        const btnNorm = document.getElementById('twin-toggle-norm');
        const btnAdv = document.getElementById('twin-toggle-adv');
        
        if (mode === 'advanced') {
            btnNorm.classList.remove('active');
            btnAdv.classList.add('active');
            setMapStyle('dark');
            renderTwinMarkers();
            adminMap.setView([17.4085, 104.7760], 14);
        } else {
            btnNorm.classList.add('active');
            btnAdv.classList.remove('active');
            setMapStyle('normal');
            twinLayers.clearLayers();
            adminMap.setView([17.4085, 104.7760], 15);
        }
    };

    function renderTwinMarkers() {
        twinLayers.clearLayers();
        twinData.forEach(d => {
            const icon = L.divIcon({
                className: 'twin-marker-wrapper',
                html: `
                    <div class="twin-marker-future">
                        <div class="marker-scan-ring" style="--glow-color: ${d.color}"></div>
                        <div class="marker-scan-ring" style="--glow-color: ${d.color}"></div>
                        <div class="marker-dot-core" style="--glow-color: ${d.color}"></div>
                        <div class="marker-terminal-label" style="--glow-color: ${d.color}">
                            <span><i class="fa-solid ${d.icon}"></i> ${d.name}</span>
                            <span class="coord">${d.pos[0].toFixed(4)}, ${d.pos[1].toFixed(4)}</span>
                        </div>
                    </div>
                `,
                iconSize: [40, 40],
                iconAnchor: [20, 20]
            });
            L.marker(d.pos, { icon }).addTo(twinLayers);
        });
        twinLayers.addTo(adminMap);

        // Add Ultra-Thin Holographic Flow Lines
        const flowPaths = [
            { path: [twinData[0].pos, [17.4100, 104.7800]], color: '#00f2ff' },
            { path: [twinData[1].pos, [17.4200, 104.7850]], color: '#00f2ff' },
            { path: [twinData[3].pos, twinData[2].pos], color: '#00ff88' }
        ];

        flowPaths.forEach((f) => {
            // High-fidelity Neon Glow Effect
            
            // 1. Broad Outer Glow
            L.polyline(f.path, {
                color: f.color,
                weight: 8,
                opacity: 0.15,
                lineJoin: 'round'
            }).addTo(twinLayers);

            // 2. Medium Neon Pulse
            const poly = L.polyline(f.path, {
                color: f.color,
                weight: 4,
                dashArray: '12, 18',
                opacity: 0.6,
                lineJoin: 'round'
            }).addTo(twinLayers);
            
            // 3. Bright Inner Core
            L.polyline(f.path, {
                color: '#fff',
                weight: 1,
                opacity: 0.8,
                lineJoin: 'round'
            }).addTo(twinLayers);

            let offset = 0;
            setInterval(() => {
                offset = (offset + 1) % 30;
                poly.setStyle({ dashOffset: -offset });
            }, 35);
        });
        // Add Nakhon Phanom Municipality Boundary (Future Style)
        const cityBoundary = [
            [17.4350, 104.7650], [17.4420, 104.7800], [17.4250, 104.7950],
            [17.4050, 104.8050], [17.3850, 104.7950], [17.3750, 104.7700],
            [17.3950, 104.7600], [17.4150, 104.7620]
        ];
        L.polygon(cityBoundary, {
            color: 'rgba(0, 242, 255, 0.5)',
            fillColor: 'rgba(0, 242, 255, 0.05)',
            weight: 2,
            dashArray: '5, 5'
        }).addTo(twinLayers);
    }

    // Fix map sizing issues
    setTimeout(() => { if(window.adminMap) window.adminMap.invalidateSize(); }, 500);

    // --- SMART CITY TRAFFIC OVERLAY ---
    // พิกัดถนนจริงในนครพนม ตรวจสอบจาก OpenStreetMap
    // แม่น้ำโขงอยู่ที่ lng ~104.795+ ถนนในเมืองอยู่ที่ lng 104.770-104.790
    const ROAD_PATHS = {
        'sunthon-wichit': {
            name: 'ถนนสุนทรวิจิตร (ริมโขง)',
            // ถนนริมโขงฝั่งไทย วิ่งขนานแม่น้ำ N→S ห่างจากริมน้ำประมาณ 200-300m
            path: [
                [17.4210, 104.7785],
                [17.4175, 104.7790],
                [17.4140, 104.7793],
                [17.4105, 104.7795],
                [17.4070, 104.7798],
                [17.4035, 104.7800],
                [17.4000, 104.7802]
            ]
        },
        'nittayo': {
            name: 'ถนนนิตโย (ขาเข้าเมือง)',
            // ถนนนิตโย วิ่ง W→E เข้าเมือง (ถนนหลักจากสนามบิน)
            path: [
                [17.4068, 104.7620],
                [17.4068, 104.7660],
                [17.4068, 104.7700],
                [17.4068, 104.7730],
                [17.4068, 104.7760],
                [17.4068, 104.7790]
            ]
        },
        'aphai': {
            name: 'ถนนอภิบาลบัญชา',
            // ถนนอภิบาลบัญชา วิ่ง N→S ผ่านใจกลางเมือง
            path: [
                [17.4150, 104.7760],
                [17.4120, 104.7760],
                [17.4090, 104.7760],
                [17.4060, 104.7760],
                [17.4030, 104.7760],
                [17.4000, 104.7760]
            ]
        },
        'chayangkun': {
            name: 'ถนนชยางกูร',
            // ถนนชยางกูร วิ่ง S→N ออกนอกเมืองทางเหนือ
            path: [
                [17.4068, 104.7760],
                [17.4150, 104.7745],
                [17.4230, 104.7730],
                [17.4320, 104.7715],
                [17.4420, 104.7700]
            ]
        }
    };

    window.highlightCongestedRoads = function(roads) {
        trafficPolylines.clearLayers();
        if (!roads || roads.length === 0) return;

        roads.forEach(road => {
            const def = ROAD_PATHS[road.id];
            if (!def) return;

            const color = road.color || (road.level > 75 ? '#ef4444' : road.level > 45 ? '#f59e0b' : '#10b981');
            const weight = road.level > 75 ? 7 : road.level > 45 ? 5 : 4;

            // Outer glow
            L.polyline(def.path, {
                color: color,
                weight: weight + 6,
                opacity: 0.15,
                lineJoin: 'round',
                lineCap: 'round'
            }).addTo(trafficPolylines);

            // Main road line
            const poly = L.polyline(def.path, {
                color: color,
                weight: weight,
                opacity: 0.85,
                lineJoin: 'round',
                lineCap: 'round'
            }).addTo(trafficPolylines);

            // Tooltip
            poly.bindTooltip(`
                <div style="font-family: 'Sarabun', sans-serif; padding: 4px 2px;">
                    <b style="color:${color};">${road.name}</b><br>
                    <span style="font-size:0.85rem;">ความหนาแน่น: <b>${road.level}%</b></span><br>
                    <span style="font-size:0.8rem; color:#64748b;">${road.status}</span>
                </div>
            `, { sticky: true, className: 'smart-city-tooltip' });
        });
    };

    // Auto-fetch traffic and draw on map
    async function fetchAndDrawTraffic() {
        try {
            const res = await fetch('/api/traffic/status');
            const response = await res.json();
            const roads = Array.isArray(response) ? response : (response.roads || []);
            if (roads.length > 0) window.highlightCongestedRoads(roads);
        } catch (e) { /* silent */ }
    }

    fetchAndDrawTraffic();
    setInterval(fetchAndDrawTraffic, 30000);
});
