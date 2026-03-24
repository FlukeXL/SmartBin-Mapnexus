// backend/routes/event.js
const express = require('express');
const router = express.Router();

// Actual Nakhon Phanom Events Database (Mocking Source for Real-world data)
const CITY_EVENTS = [
    {
        id: "ev_01",
        name: "ถนนคนเดินนครพนม (ริมโขง)",
        description: "ตลาดนัดริมโขงสุดชิลล์ พบกับสินค้าพื้นเมืองและอาหารอร่อย",
        location: "ถนนสุนทรวิจิตร",
        days: [5, 6, 0], // Fri, Sat, Sun
        startTime: "17:00",
        endTime: "22:00",
        icon: "fa-person-walking-luggage",
        category: "market"
    },
    {
        id: "ev_02",
        name: "พิธีบวงสรวงองค์พญาศรีสัตตนาคราช",
        description: "พิธีอันศักดิ์สิทธิ์ริมฝั่งโขง เพื่อความเป็นสิริมงคล",
        location: "ลานพญาศรีสัตตนาคราช",
        days: [1, 2, 3, 4, 5, 6, 0], // Daily (Morning rituals)
        startTime: "07:00",
        endTime: "09:00",
        icon: "fa-hands-praying",
        category: "ceremony"
    },
    {
        id: "ev_03",
        name: "กิจกรรมปั่นจักรยานชายโขง",
        description: "เส้นทางจักรยานที่สวยที่สุดในไทย สัมผัสอากาศบริสุทธิ์ยามเช้า",
        location: "เส้นทางจักรยานริมโขง",
        days: [6, 0], // Sat, Sun
        startTime: "05:30",
        endTime: "08:30",
        icon: "fa-bicycle",
        category: "sports"
    },
    {
        id: "ev_04",
        name: "ตลาดยามเช้าเทศบาลเมืองนครพนม",
        description: "สัมผัสวิถีชีวิตชาวนครพนมและอาหารเช้าท้องถิ่น",
        location: "ตลาดสดเทศบาล",
        days: [1, 2, 3, 4, 5, 6, 0],
        startTime: "04:00",
        endTime: "10:00",
        icon: "fa-basket-shopping",
        category: "market"
    }
];

// Get Active Events based on current time
router.get('/active', (req, res) => {
    const now = new Date();
    const currentDay = now.getDay();
    // Use 24h format with leading zero for correct string comparison (HH:mm)
    const currentTime = now.getHours().toString().padStart(2, '0') + ":" + 
                        now.getMinutes().toString().padStart(2, '0');

    // Filter events that happen today and are currently active or upcoming
    const activeEvents = CITY_EVENTS.filter(event => {
        if (!event.days.includes(currentDay)) return false;
        
        // HH:mm string comparison now works correctly with padded hours
        return currentTime <= event.endTime;
    });

    res.json({
        status: "success",
        timestamp: now.toISOString(),
        count: activeEvents.length,
        events: activeEvents
    });
});

// Mock AI Route Generation Endpoint
router.post('/ai-route', (req, res) => {
    const { style } = req.body;
    const response = {
        status: "success",
        message: `Generated AI smart route for ${style} lifestyle.`,
        data: {
            theme: style,
            waypoints: [
                { name: "ลานพญาศรีสัตตนาคราช", lat: 17.4087, lng: 104.7876, description: "Start point" },
                { name: "โบสถ์นักบุญแอนนา", lat: 17.4190, lng: 104.7818, description: "Cultural stop" },
                { name: "ถนนคนเดิน", lat: 17.4045, lng: 104.7912, description: "Shopping/Dining" }
            ]
        }
    };
    res.json(response);
});

module.exports = router;
