/**
 * backend/routes/gps.js
 * รับ GPS จาก ESP32 (ATGM336H-5N) แล้ว broadcast ผ่าน WebSocket ไป browser
 *
 * Endpoints:
 *   POST /api/gps/update            — ESP32 ส่งพิกัด GPS มาที่นี่ (Smart Bin หรือ Tracker ทั่วไป)
 *   GET  /api/gps/latest            — ดึงตำแหน่งล่าสุดของทุก device (in-memory + DB)
 *   GET  /api/gps/latest/:device_id — ดึงเฉพาะ device นั้น (in-memory)
 *   GET  /api/gps/:binId            — ดึงข้อมูลถังจาก DB (Smart Bin เท่านั้น)
 */

const express  = require('express');
const router   = express.Router();
const { cityPool } = require('../config/db');

/* ─────────────────────────────────────────────────────────────
   [เพิ่มใหม่] SECTION A: IN-MEMORY STORE
   เก็บ GPS ล่าสุดของแต่ละ device ไว้ใน memory
   → ตอบสนองเร็ว ไม่ต้อง query DB ทุกครั้ง
   → ข้อมูลหายเมื่อ server restart (ปกติสำหรับ GPS realtime)
───────────────────────────────────────────────────────────── */
const latestGPS = {}; // { device_id: { ...gpsData } }


/* ─────────────────────────────────────────────────────────────
   SECTION B: WEBSOCKET SETUP
   รับ WebSocket server จาก server.js ผ่าน setWebSocketServer()
───────────────────────────────────────────────────────────── */
let wsServer = null;

// [เพิ่มใหม่] export แบบ named function (ใช้ได้ทั้ง router.setWebSocketServer และ module.exports.setWebSocketServer)
function setWebSocketServer(wss) {
    wsServer = wss;
}

function broadcast(data) {
    if (!wsServer) return;
    const msg = JSON.stringify(data);
    wsServer.clients.forEach(client => {
        if (client.readyState === 1) client.send(msg); // 1 = OPEN
    });
}


/* ─────────────────────────────────────────────────────────────
   SECTION C: POST /api/gps/update
   รับจาก ESP32 — รองรับ 2 รูปแบบ:

   [รูปแบบ 1 — GPS Tracker ทั่วไป] (เพิ่มใหม่)
     Body: { device_id, lat, lng, speed, alt, sats, hdop, ts }
     → บันทึกใน latestGPS (memory เท่านั้น)

   [รูปแบบ 2 — Smart Bin] (เดิม)
     Body: { bin_id, bin_name, lat, lng, fill_level, status, location_name }
     → บันทึกใน latestGPS + upsert ลง waste_bins DB

   ทั้งสองรูปแบบ broadcast WebSocket ไป browser ทันที
───────────────────────────────────────────────────────────── */
router.post('/update', async (req, res) => {
    const body = req.body;

    // ตรวจ lat/lng ขั้นต่ำ
    if (!body.lat || !body.lng || isNaN(body.lat) || isNaN(body.lng)) {
        return res.status(400).json({ error: 'Invalid lat/lng' });
    }

    const lat = parseFloat(body.lat);
    const lng = parseFloat(body.lng);

    /* ── [เพิ่มใหม่] รูปแบบ 1: GPS Tracker (มี device_id, speed, sats) ── */
    if (body.device_id !== undefined || body.speed !== undefined) {
        const gpsData = {
            device_id: body.device_id || 'unknown',
            lat,
            lng,
            speed: parseFloat(body.speed) || 0,
            alt:   parseFloat(body.alt)   || 0,
            sats:  parseInt(body.sats)    || 0,
            hdop:  parseFloat(body.hdop)  || 99,
            timestamp: new Date().toISOString()
        };

        latestGPS[gpsData.device_id] = gpsData; // บันทึก memory
        broadcast({ type: 'gps_update', data: gpsData });

        console.log(`[GPS Tracker] ${gpsData.device_id}: ${gpsData.lat},${gpsData.lng} ${gpsData.speed}km/h ${gpsData.sats}sats`);
        return res.json({ ok: true });
    }

    /* ── รูปแบบ 2: Smart Bin (มี bin_id, fill_level) ── */
    const { bin_id, bin_name, fill_level, status, location_name } = body;

    if (!bin_id) {
        return res.status(400).json({ error: 'ต้องการ bin_id หรือ device_id' });
    }

    const fillLevel = parseInt(fill_level) || 0;
    const binStatus = status || (fillLevel >= 90 ? 'full' : fillLevel >= 70 ? 'almost_full' : fillLevel > 0 ? 'normal' : 'empty');

    try {
        // Upsert ลง waste_bins DB
        await cityPool.query(`
            INSERT INTO waste_bins (id, bin_name, lat, lng, fill_level, status, location_name, gps_module)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'ATGM336H-5N')
            ON DUPLICATE KEY UPDATE
                lat            = VALUES(lat),
                lng            = VALUES(lng),
                fill_level     = VALUES(fill_level),
                status         = VALUES(status),
                location_name  = COALESCE(VALUES(location_name), location_name),
                last_update    = CURRENT_TIMESTAMP
        `, [bin_id, bin_name || `Smart Bin #${bin_id}`, lat, lng, fillLevel, binStatus, location_name || null]);

        const deviceData = {
            device_id:     String(bin_id),   // [เพิ่มใหม่] ใส่ device_id ด้วยเพื่อให้ gps-tracker.js ใช้ได้
            bin_id, bin_name, lat, lng,
            fill_level:    fillLevel,
            status:        binStatus,
            location_name,
            timestamp:     new Date().toISOString()
        };

        latestGPS[String(bin_id)] = deviceData; // [เพิ่มใหม่] บันทึก memory ด้วย
        broadcast({ type: 'gps_update', data: deviceData });

        console.log(`[GPS SmartBin] bin#${bin_id}: ${lat},${lng} fill=${fillLevel}%`);
        res.json({ ok: true, data: deviceData });
    } catch (e) {
        console.error('[GPS] DB error:', e.message);
        res.status(500).json({ error: e.message });
    }
});


/* ─────────────────────────────────────────────────────────────
   [เพิ่มใหม่] SECTION D: GET /api/gps/latest
   ดึงตำแหน่งล่าสุดของทุก device จาก memory ก่อน
   ถ้า memory ว่าง (server เพิ่ง restart) → fallback ดึงจาก DB
───────────────────────────────────────────────────────────── */
router.get('/latest', async (req, res) => {
    // ถ้ามีข้อมูลใน memory → ตอบทันที
    const memData = Object.values(latestGPS);
    if (memData.length > 0) return res.json(memData);

    // fallback: ดึงจาก DB (กรณี server restart)
    try {
        const [rows] = await cityPool.query(`
            SELECT id as bin_id, bin_name, lat, lng, fill_level, status, location_name, last_update,
                   CAST(id AS CHAR) as device_id
            FROM waste_bins
            ORDER BY last_update DESC
        `);
        res.json(rows);
    } catch (e) {
        res.json([]); // ถ้า DB ก็ไม่มี → คืน array ว่าง
    }
});


/* ─────────────────────────────────────────────────────────────
   [เพิ่มใหม่] SECTION E: GET /api/gps/latest/:device_id
   ดึงเฉพาะ device นั้นจาก memory
───────────────────────────────────────────────────────────── */
router.get('/latest/:device_id', (req, res) => {
    const data = latestGPS[req.params.device_id];
    if (!data) return res.status(404).json({ error: 'Device not found' });
    res.json(data);
});


/* ─────────────────────────────────────────────────────────────
   SECTION F: GET /api/gps/:binId
   ดึงข้อมูลถังจาก DB (Smart Bin เท่านั้น)
   ต้องอยู่หลัง /latest/:device_id เพื่อไม่ให้ route ชนกัน
───────────────────────────────────────────────────────────── */
router.get('/:binId', async (req, res) => {
    try {
        const [rows] = await cityPool.query(
            'SELECT id as bin_id, bin_name, lat, lng, fill_level, status, location_name, last_update FROM waste_bins WHERE id = ?',
            [req.params.binId]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'ไม่พบถังขยะ' });
        res.json(rows[0]);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});


/* ─────────────────────────────────────────────────────────────
   SECTION G: EXPORTS
   [เพิ่มใหม่] export setWebSocketServer ทั้ง 2 วิธี
   เพื่อให้ server.js เรียกได้ทั้ง:
     gpsRoutes.setWebSocketServer(wss)   ← วิธีเดิม
     require('./routes/gps').setWebSocketServer(wss)  ← วิธีใหม่
───────────────────────────────────────────────────────────── */
module.exports = router;
module.exports.setWebSocketServer = setWebSocketServer;
