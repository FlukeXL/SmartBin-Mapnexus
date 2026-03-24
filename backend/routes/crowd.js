const express = require('express');
const router = express.Router();
const { cityPool } = require('../config/db');

const LOCATIONS = [
    { id: 'loc_01', name: 'ลานพญานาค', icon: 'fa-dragon', color: '#8b5cf6', lat: 17.4085, lng: 104.7895, baseline: 40 },
    { id: 'loc_02', name: 'ตลาดสดเทศบาล', icon: 'fa-store', color: '#f59e0b', lat: 17.4060, lng: 104.7860, baseline: 55 },
    { id: 'loc_03', name: 'วัดโอกาส', icon: 'fa-place-of-worship', color: '#10b981', lat: 17.4050, lng: 104.7870, baseline: 25 },
    { id: 'loc_04', name: 'ริมโขง (หน้าเทศบาล)', icon: 'fa-water', color: '#3b82f6', lat: 17.4100, lng: 104.7900, baseline: 35 },
    { id: 'loc_05', name: 'ศาลากลางจังหวัด', icon: 'fa-building-columns', color: '#ef4444', lat: 17.4070, lng: 104.7840, baseline: 20 },
    { id: 'loc_06', name: 'สนามกีฬากลาง', icon: 'fa-futbol', color: '#06b6d4', lat: 17.4120, lng: 104.7820, baseline: 30 }
];

function getPeakFactor(hour) {
    if (hour >= 7 && hour <= 9) return { factor: 1.4, label: 'ชั่วโมงเร่งด่วนเช้า' };
    if (hour >= 11 && hour <= 13) return { factor: 1.3, label: 'ช่วงพักเที่ยง' };
    if (hour >= 16 && hour <= 19) return { factor: 1.5, label: 'ชั่วโมงเร่งด่วนเย็น' };
    if (hour >= 22 || hour <= 5) return { factor: 0.15, label: 'ดึก/เช้ามืด' };
    return { factor: 0.7, label: 'ปกติ' };
}

async function getBinBoost(lat, lng) {
    try {
        const [bins] = await cityPool.query(
            'SELECT fill_level, status, (6371000 * ACOS(COS(RADIANS(?)) * COS(RADIANS(lat)) * COS(RADIANS(lng) - RADIANS(?)) + SIN(RADIANS(?)) * SIN(RADIANS(lat)))) AS distance_m FROM waste_bins HAVING distance_m < 500 ORDER BY distance_m ASC LIMIT 5',
            [lat, lng, lat]
        );
        if (bins.length === 0) return 0;
        let boost = 0;
        bins.forEach(function(b) {
            if (b.status === 'full') boost += 10;
            else if (b.status === 'almost_full') boost += 5;
            else if (b.fill_level > 60) boost += 3;
        });
        return Math.min(boost, 20);
    } catch (e) { return 0; }
}

router.get('/', async function(req, res) {
    var now = new Date();
    var currentHour = now.getHours();
    var nextHour = (currentHour + 1) % 24;
    var curPeak = getPeakFactor(currentHour);
    var nextPeak = getPeakFactor(nextHour);
    var curFactor = curPeak.factor;
    var nextFactor = nextPeak.factor;
    var nextLabel = nextPeak.label;

    var results = await Promise.all(LOCATIONS.map(async function(loc) {
        var binBoost = await getBinBoost(loc.lat, loc.lng);

        // คำนวณจาก baseline โดยตรง (ไม่ใช้ historical เพื่อป้องกัน feedback loop)
        var level = Math.min(100, Math.round(loc.baseline * curFactor) + binBoost);
        var nextLevel = Math.min(100, Math.round(loc.baseline * nextFactor) + binBoost);

        var status = level > 75 ? 'High' : level > 40 ? 'Moderate' : 'Low';
        var color = level > 75 ? '#ef4444' : level > 40 ? '#f59e0b' : '#10b981';

        var forecast1h = '';
        if (nextLevel > level + 15) {
            forecast1h = 'คาดว่าจะหนาแน่นขึ้นใน 1 ชม. (' + nextLevel + '% — ' + nextLabel + ')';
        } else if (nextLevel < level - 15) {
            forecast1h = 'คาดว่าจะเบาบางลงใน 1 ชม. (' + nextLevel + '% — ' + nextLabel + ')';
        } else {
            forecast1h = 'คงที่ใน 1 ชม. (' + nextLevel + '% — ' + nextLabel + ')';
        }

        cityPool.query('INSERT INTO crowd_logs (location_id, density_level) VALUES (?, ?)', [loc.id, level]).catch(function() {});

        return Object.assign({}, loc, { level: level, nextLevel: nextLevel, status: status, color: color, binBoost: binBoost, forecast1h: forecast1h, isManual: false });
    }));

    res.json(results);
});

router.post('/update', async function(req, res) {
    var id = req.body.id;
    var level = req.body.level;
    if (!id) return res.status(400).json({ success: false });
    try {
        await cityPool.query('INSERT INTO crowd_logs (location_id, density_level, is_manual) VALUES (?, ?, 1)', [id, parseInt(level) || 0]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

module.exports = router;