// frontend/js/admin-map.js
// แผนที่หลักสำหรับ Admin Dashboard - เวอร์ชันที่แน่นอนว่าจะทำงาน

console.log('✅ admin-map.js loaded');

// รอให้ DOM โหลดเสร็จ
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ DOM loaded, initializing map...');
    
    // ตรวจสอบว่ามี Leaflet หรือไม่
    if (typeof L === 'undefined') {
        console.error('❌ Leaflet library not loaded!');
        return;
    }
    
    // ตรวจสอบว่ามี container หรือไม่
    const mapContainer = document.getElementById('admin-map');
    if (!mapContainer) {
        console.error('❌ Map container #admin-map not found!');
        return;
    }
    
    console.log('✅ Map container found, creating map...');
    
    try {
        // สร้างแผนที่
        const adminMap = L.map('admin-map', {
            center: [17.4085, 104.7760],
            zoom: 14,
            zoomControl: true
        });
        
        console.log('✅ Map object created');
        
        // เพิ่ม OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19
        }).addTo(adminMap);
        
        console.log('✅ Tiles added to map');
        
        // เพิ่ม marker ตัวอย่าง
        L.marker([17.4085, 104.7760])
            .addTo(adminMap)
            .bindPopup('<b>นครพนม</b><br>ศูนย์กลางเมือง')
            .openPopup();
        
        console.log('✅ Marker added');
        
        // Expose globally
        window.adminMap = adminMap;
        window._leafletAdminMap = adminMap;
        
        // Fix map size หลังจากโหลดเสร็จ
        setTimeout(function() {
            adminMap.invalidateSize();
            console.log('✅ Map size fixed');
        }, 500);
        
        // เพิ่มฟังก์ชันสำหรับปุ่มต่างๆ
        window.setMapMode = function(mode) {
            console.log('Map mode:', mode);
            if (mode === 'advanced') {
                adminMap.setZoom(13);
            } else {
                adminMap.setZoom(14);
            }
        };
        
        window.clearAdminRoute = function() {
            console.log('Clear route');
        };
        
        console.log('✅✅✅ Map initialized successfully! ✅✅✅');
        
    } catch (error) {
        console.error('❌ Error creating map:', error);
    }
});

// Fallback: ถ้า DOM โหลดเสร็จแล้วก่อนที่ script จะรัน
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    console.log('⚠️ DOM already loaded, triggering event manually');
    setTimeout(function() {
        document.dispatchEvent(new Event('DOMContentLoaded'));
    }, 100);
}
