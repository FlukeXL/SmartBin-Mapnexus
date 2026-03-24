const express = require('express');
const router = express.Router();
const { cityPool: pool } = require('../config/db');

/**
 * หลักการคาดการณ์จราจร (AI Traffic Prediction)
 * =========================================
 * วิธีที่ใช้: Time-Series Pattern Matching + Weighted Historical Average
 *
 * 1. ดึงข้อมูลจริงจาก DB (ตาราง traffic_logs) — บันทึกทุกครั้งที่มีการ update
 * 2. คำนวณ "ค่าเฉลี่ยถ่วงน้ำหนัก" ของ congestion level ในช่วงเวลาเดียวกัน
 *    ย้อนหลัง 7 วัน (น้ำหนักวันล่าสุดมากกว่า)
 * 3. ปรับด้วย "Peak Hour Factor":
 *    - เช้า 07:00-09:00 → ×1.4
 *    - กลางวัน 11:00-13:00 → ×1.2
 *    - เย็น 16:00-19:00 → ×1.5
 *    - กลางคืน 22:00-05:00 → ×0.2
 * 4. ถ้าไม่มีข้อมูลใน DB → ใช้ baseline จาก peak hour factor เท่านั้น
 * 5. ผลลัพธ์: congestion % + สถานะ + คำเตือน AI ว่าถนนไหนจะติดใน 1 ชม.
 */

const ROADS = [
    {
        id: 'sunthon-wichit',
        name: 'ถนนสุนทรวิจิตร (ริมโขง)',
        hotspots: ['ลานพญานาค', 'หอนาฬิกา'],
        lat: 17.4100, lon: 104.7860,
        // จุดเริ่ม-ปลายสำหรับ polyline บนแผนที่
        path: [[17.4190, 104.7820], [17.4100, 104.7860], [17.3985, 104.7915]]
    },
    {
        id: 'nittayo',
        name: 'ถนนนิตโย (ขาเข้าเมือง)',
        hotspots: ['สี่แยกเฟื่องนคร', 'หนองญาติ'],
        lat: 17.4000, lon: 104.7750,
        path: [[17.4080, 104.7700], [17.4000, 104.7750], [17.4069, 104.7845]]
    },
    {
        id: 'aphai',
        name: 'ถนนอภิบาลบัญชา',
        hotspots: ['ตลาดสดเทศบาล', 'ศาลากลาง'],
        lat: 17.4050, lon: 104.7850,
        path: [[17.4100, 104.7840], [17.4050, 104.7850], [17.3980, 104.7920]]
    },
    {
        id: 'chayangkun',
        name: 'ถนนชยางกูร',
        hotspots: ['แม็คโคร', 'บิ๊กซี'],
        lat: 17.4200, lon: 104.7800,
        path: [[17.4121, 104.7867], [17.4200, 104.7800], [17.4450, 104.7700]]
    }
];

// Peak Hour Factor — อิงจากสถิติจราจรจริงในเมืองขนาดกลาง
function getPeakFactor(hour) {
    if (hour >= 7 && hour <= 9) return { factor: 1.4, label: 'ชั่วโมงเร่งด่วนเช้า' };
    if (hour >= 11 && hour <= 13) return { factor: 1.2, label: 'ช่วงพักเที่ยง' };
    if (hour >= 16 && hour <= 19) return { factor: 1.5, label: 'ชั่วโมงเร่งด่วนเย็น' };
    if (hour >= 22 || hour <= 5) return { factor: 0.2, label: 'ดึก/เช้ามืด' };
    return { factor: 0.6, label: 'ปกติ' };
}

// Baseline congestion ต่อถนน (อิงจากลักษณะถนนจริง)
const ROAD_BASELINE = {
    'sunthon-wichit': 35, // ริมโขง มีนักท่องเที่ยว
    'nittayo': 40,        // ถนนหลักเข้าเมือง
    'aphai': 30,          // ผ่านตลาด
    'chayangkun': 25      // ชานเมือง
};

// ดึงข้อมูลจริงจาก DB + คำนวณ weighted average
async function getRealTrafficLevel(roadId, targetHour) {
    try {
        // ดึงข้อมูลย้อนหลัง 7 วัน ในช่วงเวลาเดียวกัน (±1 ชม.)
        const [rows] = await pool.query(`
            SELECT congestion_level, recorded_at,
                   DATEDIFF(NOW(), recorded_at) as days_ago
            FROM traffic_logs
            WHERE road_id = ?
              AND HOUR(recorded_at) BETWEEN ? AND ?
              AND recorded_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            ORDER BY recorded_at DESC
            LIMIT 50
        `, [roadId, Math.max(0, targetHour - 1), Math.min(23, targetHour + 1)]);

        if (rows.length === 0) return null;

        // Weighted average: วันล่าสุดมีน้ำหนักมากกว่า (exponential decay)
        let weightedSum = 0;
        let totalWeight = 0;
        rows.forEach(row => {
            const weight = Math.pow(0.8, row.days_ago); // decay 20% ต่อวัน
            weightedSum += row.congestion_level * weight;
            totalWeight += weight;
        });

        return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : null;
    } catch (e) {
        return null; // DB ไม่พร้อม → ใช้ baseline
    }
}

// บันทึกข้อมูลจราจรลง DB
async function logTrafficData(roadId, level) {
    try {
        await pool.query(
            'INSERT INTO traffic_logs (road_id, congestion_level) VALUES (?, ?)',
            [roadId, level]
        );
    } catch (e) { /* ไม่ block response */ }
}

// GET /api/traffic/status — สถานะปัจจุบัน + พยากรณ์ 1 ชม.
router.get('/status', async (req, res) => {
    const now = new Date();
    const currentHour = now.getHours();
    const nextHour = (currentHour + 1) % 24;
    const { factor: currentFactor } = getPeakFactor(currentHour);
    const { factor: nextFactor, label: nextLabel } = getPeakFactor(nextHour);

    const results = await Promise.all(ROADS.map(async (road) => {
        const baseline = ROAD_BASELINE[road.id] || 30;

        // ลองดึงข้อมูลจริงจาก DB ก่อน
        const realLevel = await getRealTrafficLevel(road.id, currentHour);
        const level = realLevel !== null
            ? Math.min(100, Math.round(realLevel * (currentFactor / 1.5)))
            : Math.min(100, Math.round(baseline * currentFactor));

        // พยากรณ์ 1 ชม.ข้างหน้า
        const nextRealLevel = await getRealTrafficLevel(road.id, nextHour);
        const nextLevel = nextRealLevel !== null
            ? Math.min(100, Math.round(nextRealLevel * (nextFactor / 1.5)))
            : Math.min(100, Math.round(baseline * nextFactor));

        const status = level > 75 ? 'ติดขัดหนาแน่น' : level > 45 ? 'ชะลอตัว' : 'ไหลลื่นปกติ';
        const color = level > 75 ? '#ef4444' : level > 45 ? '#f59e0b' : '#10b981';

        // AI คาดการณ์
        let aiPrediction = '';
        if (nextLevel > level + 20) {
            aiPrediction = `⚠️ คาดว่าจะ${nextLevel > 75 ? 'ติดขัดหนาแน่น' : 'ชะลอตัว'}ใน 1 ชม. (${nextLabel})`;
        } else if (nextLevel < level - 20) {
            aiPrediction = `✅ คาดว่าจราจรจะระบายตัวดีขึ้นใน 1 ชม.`;
        } else {
            aiPrediction = `→ สถานการณ์คงที่ใน 1 ชม. (${nextLabel})`;
        }

        // บันทึกลง DB (async, ไม่ block)
        logTrafficData(road.id, level);

        return {
            ...road,
            level,
            nextLevel,
            status,
            color,
            isRealTime: realLevel !== null,
            dataSource: realLevel !== null ? 'SQL Historical + Peak Factor' : 'Peak Hour Baseline',
            aiPrediction,
            nextHourLabel: nextLabel,
            lastUpdate: now.toISOString()
        };
    }));

    // AI สรุปภาพรวม — ชี้ถนนที่จะติดหนักที่สุด
    const worstNext = results.reduce((a, b) => b.nextLevel > a.nextLevel ? b : a);
    const congestedNow = results.filter(r => r.level > 75);
    const willCongest = results.filter(r => r.nextLevel > 75 && r.level <= 75);

    results.forEach(r => {
        r.isWorstNext = r.id === worstNext.id;
    });

    res.json({
        roads: results,
        aiSummary: {
            congestedNow: congestedNow.map(r => r.name),
            willCongestIn1h: willCongest.map(r => r.name),
            worstRoadNext1h: worstNext.name,
            worstLevelNext1h: worstNext.nextLevel,
            overallStatus: congestedNow.length > 2 ? 'วิกฤต' : congestedNow.length > 0 ? 'หนาแน่น' : 'ปกติ',
            recommendation: willCongest.length > 0
                ? `แนะนำหลีกเลี่ยง ${willCongest.map(r => r.name).join(', ')} ในอีก 1 ชม.`
                : 'การจราจรโดยรวมอยู่ในเกณฑ์ปกติ'
        }
    });
});

// GET /api/traffic/forecast — พยากรณ์ 24 ชม.
router.get('/forecast', async (req, res) => {
    const now = new Date();
    const forecast = [];

    for (let i = 1; i <= 24; i++) {
        const forecastDate = new Date(now.getTime() + i * 3600000);
        const hour = forecastDate.getHours();
        const { factor, label } = getPeakFactor(hour);

        // คำนวณ avg จากทุกถนน
        const avgBaseline = Object.values(ROAD_BASELINE).reduce((a, b) => a + b, 0) / ROADS.length;
        const level = Math.min(100, Math.round(avgBaseline * factor));

        forecast.push({
            time: forecastDate.toISOString(),
            hour,
            level,
            label,
            status: level > 75 ? 'ติดขัด' : level > 45 ? 'ชะลอตัว' : 'ไหลลื่น'
        });
    }

    res.json(forecast);
});

module.exports = router;
