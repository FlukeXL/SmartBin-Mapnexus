/**
 * MapNexus Admin Google Maps Implementation
 * Real-time Traffic Layer + AI Congestion Predictions
 */

let googleMap;
let trafficLayer;
let congestionMarkers = [];

async function initAdminGoogleMap() {
    const mapContainer = document.getElementById('admin-map');
    if (!mapContainer) return;
    
    // If google is not loaded yet, skip (Leaflet fallback is already running)
    if (typeof google === 'undefined' || !google.maps) return;

    // Nakhon Phanom Coordinates
    const position = { lat: 17.4085, lng: 104.7860 };
    
    // Initialize Map
    googleMap = new google.maps.Map(mapContainer, {
        zoom: 15,
        center: position,
        mapId: 'MAPNEXUS_ADMIN_DARK',
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        styles: [
            {
                "featureType": "all",
                "elementType": "labels.text.fill",
                "stylers": [{ "color": "#7c93a3" }]
            },
            {
                "featureType": "administrative.locality",
                "elementType": "labels.text.fill",
                "stylers": [{ "color": "#2E1065" }]
            },
            {
                "featureType": "road",
                "elementType": "geometry",
                "stylers": [{ "color": "#ffffff" }]
            },
            {
                "featureType": "road.highway",
                "elementType": "geometry",
                "stylers": [{ "color": "#e5e7eb" }]
            }
        ]
    });

    // Add Traffic Layer (Real-time)
    trafficLayer = new google.maps.TrafficLayer();
    trafficLayer.setMap(googleMap);

    // Add AI Predicted Congestion Markers
    renderCongestionPoints();

    // Refresh Traffic every 2 minutes
    setInterval(() => {
        trafficLayer.setMap(null);
        trafficLayer.setMap(googleMap);
        console.log("Traffic Layer Refreshed");
    }, 120000);
}

function renderCongestionPoints() {
    if (!googleMap) return;
    // Clear existing
    congestionMarkers.forEach(m => m.setMap(null));
    congestionMarkers = [];

    const mockPoints = [
        { name: "แยกบายพาส (นิตโย)", pos: { lat: 17.4069, lng: 104.7845 }, level: "หนาแน่นสูง", trend: "เพิ่มขึ้น" },
        { name: "ถนนสุนทรวิจิตร (หอนาฬิกา)", pos: { lat: 17.4101, lng: 104.7905 }, level: "หนาแน่นปานกลาง", trend: "คงที่" }
    ];

    mockPoints.forEach(p => {
        const marker = new google.maps.Marker({
            position: p.pos,
            map: googleMap,
            title: p.name,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: p.level === "หนาแน่นสูง" ? "#ef4444" : "#f59e0b",
                fillOpacity: 1,
                strokeWeight: 4,
                strokeColor: "#fff",
                scale: 12
            }
        });

        const infoWindow = new google.maps.InfoWindow({
            content: `
                <div style="padding: 10px; font-family: 'Anuphan', sans-serif;">
                    <h4 style="margin: 0 0 5px 0; color: #2E1065;">${p.name}</h4>
                    <p style="margin: 0; font-size: 0.9rem;">สถานะ: <b>${p.level}</b></p>
                    <p style="margin: 0; font-size: 0.8rem; color: #64748B;">AI พยากรณ์: ${p.trend}</p>
                </div>
            `
        });

        marker.addListener("click", () => {
            infoWindow.open(googleMap, marker);
        });

        congestionMarkers.push(marker);
    });
}

// Global toggle for advanced mode (holographic/dark)
window.setMapMode = function(mode) {
    if (googleMap) {
        if (mode === 'advanced') {
            googleMap.setOptions({
                styles: [
                    { "elementType": "geometry", "stylers": [{ "color": "#1E1B4B" }] },
                    { "elementType": "labels.text.stroke", "stylers": [{ "color": "#1E1B4B" }] },
                    { "elementType": "labels.text.fill", "stylers": [{ "color": "#8B5CF6" }] },
                    { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#2E1065" }] },
                    { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#4C1D95" }] },
                    { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#0F172A" }] }
                ]
            });
        } else {
            googleMap.setOptions({ styles: [] });
        }
    }
    
    // Update buttons
    const btnNorm = document.getElementById('twin-toggle-norm');
    const btnAdv = document.getElementById('twin-toggle-adv');
    if (btnNorm && btnAdv) {
        if (mode === 'advanced') {
            btnNorm.classList.remove('active');
            btnAdv.classList.add('active');
        } else {
            btnNorm.classList.add('active');
            btnAdv.classList.remove('active');
        }
    }
};

// NOTE: initAdminGoogleMap is called via Google Maps API callback parameter
// Do NOT call it on DOMContentLoaded — it requires google.maps to be loaded first
