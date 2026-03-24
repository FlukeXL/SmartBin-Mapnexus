const express = require('express');
const router = express.Router();
const { cityPool: pool } = require('../config/db');
require('dotenv').config();

// ===== Smart Waste Bin API =====
// GPS Module: ATGM336H-5N (GNSS) — ส่งตำแหน่ง lat/lng
// Sensor: Ultrasonic — วัดระยะทางจากเซ็นเซอร์ถึงผิวขยะ เพื่อคำนวณ fill_level %
// ข้อมูลจังหวัดนครพนมเท่านั้น

const LINE_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
const LINE_GROUP_ID = process.env.LINE_NOTIFY_GROUP_ID || '';

// Helper: Calculate fill level from ultrasonic distance
function calculateFillLevel(distanceCm, binHeightCm) {
    if (distanceCm >= binHeightCm) return 0;
    if (distanceCm <= 0) return 100;
    return Math.round(((binHeightCm - distanceCm) / binHeightCm) * 100);
}

// Helper: Determine status from fill level
function getStatus(fillLevel) {
    if (fillLevel >= 90) return 'full';
    if (fillLevel >= 70) return 'almost_full';
    if (fillLevel <= 10) return 'empty';
    return 'normal';
}

// Helper: Status label in Thai
function getStatusLabel(status) {
    const labels = {
        'empty': 'ว่าง',
        'normal': 'ปกติ',
        'almost_full': 'ใกล้เต็ม',
        'full': 'เต็มแล้ว'
    };
    return labels[status] || status;
}

// Helper: Bin type label in Thai
function getBinTypeLabel(type) {
    const labels = {
        'plastic': 'พลาสติก',
        'glass': 'แก้ว',
        'paper': 'กระดาษ',
        'can': 'กระป๋อง'
    };
    return labels[type] || type;
}

// Helper: Send LINE notification
async function sendLineNotification(bin, newStatus) {
    if (!LINE_ACCESS_TOKEN) {
        console.warn('LINE_CHANNEL_ACCESS_TOKEN not configured. Skipping notification.');
        return false;
    }

    const statusLabel = getStatusLabel(newStatus);
    const typeLabel = getBinTypeLabel(bin.bin_type);
    const icon = newStatus === 'full' ? '🔴' : newStatus === 'almost_full' ? '🟡' : '🟢';

    // LINE Flex Message
    const flexMessage = {
        type: 'flex',
        altText: `แจ้งเตือนถังขยะ: ${bin.bin_name} - ${statusLabel}`,
        contents: {
            type: 'bubble',
            size: 'kilo',
            header: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'text',
                        text: `${icon} แจ้งเตือนถังขยะอัจฉริยะ`,
                        weight: 'bold',
                        size: 'md',
                        color: newStatus === 'full' ? '#ef4444' : '#f59e0b'
                    }
                ],
                backgroundColor: newStatus === 'full' ? '#fff1f2' : '#fffbeb',
                paddingAll: '15px'
            },
            body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    {
                        type: 'text',
                        text: `ถัง: ${bin.bin_name}`,
                        weight: 'bold',
                        size: 'lg',
                        margin: 'md'
                    },
                    {
                        type: 'box',
                        layout: 'vertical',
                        margin: 'lg',
                        spacing: 'sm',
                        contents: [
                            { type: 'box', layout: 'baseline', spacing: 'sm', contents: [
                                { type: 'text', text: 'ประเภท:', color: '#aaaaaa', size: 'sm', flex: 3 },
                                { type: 'text', text: typeLabel, wrap: true, size: 'sm', flex: 5 }
                            ]},
                            { type: 'box', layout: 'baseline', spacing: 'sm', contents: [
                                { type: 'text', text: 'สถานะ:', color: '#aaaaaa', size: 'sm', flex: 3 },
                                { type: 'text', text: statusLabel, wrap: true, size: 'sm', flex: 5,
                                  color: newStatus === 'full' ? '#ef4444' : '#f59e0b', weight: 'bold' }
                            ]},
                            { type: 'box', layout: 'baseline', spacing: 'sm', contents: [
                                { type: 'text', text: 'ปริมาณ:', color: '#aaaaaa', size: 'sm', flex: 3 },
                                { type: 'text', text: `${bin.fill_level}%`, wrap: true, size: 'sm', flex: 5 }
                            ]},
                            { type: 'box', layout: 'baseline', spacing: 'sm', contents: [
                                { type: 'text', text: 'ตำแหน่ง:', color: '#aaaaaa', size: 'sm', flex: 3 },
                                { type: 'text', text: bin.location_name || `${bin.lat}, ${bin.lng}`, wrap: true, size: 'sm', flex: 5 }
                            ]}
                        ]
                    }
                ]
            },
            footer: {
                type: 'box',
                layout: 'vertical',
                spacing: 'sm',
                contents: [
                    {
                        type: 'text',
                        text: `GPS: ${bin.lat}, ${bin.lng} (${bin.gps_module || 'ATGM336H-5N'})`,
                        size: 'xxs',
                        color: '#aaaaaa',
                        align: 'center'
                    },
                    {
                        type: 'text',
                        text: `อัปเดต: ${new Date().toLocaleString('th-TH')}`,
                        size: 'xxs',
                        color: '#aaaaaa', 
                        align: 'center'
                    }
                ],
                paddingAll: '10px'
            }
        }
    };

    try {
        const targetId = LINE_GROUP_ID;
        if (!targetId) {
            console.warn('LINE_NOTIFY_GROUP_ID not configured.');
            return false;
        }

        const response = await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${LINE_ACCESS_TOKEN}`
            },
            body: JSON.stringify({
                to: targetId,
                messages: [flexMessage]
            })
        });

        if (response.ok) {
            console.log(`LINE notification sent for ${bin.bin_name}: ${statusLabel}`);
            // Log to database
            try {
                await pool.query(
                    'INSERT INTO bin_notifications (bin_id, notification_type, message) VALUES (?, ?, ?)',
                    [bin.id, newStatus, `${bin.bin_name} (${typeLabel}): ${statusLabel} - ${bin.fill_level}%`]
                );
            } catch (e) { console.error('Notification log failed:', e.message); }
            return true;
        } else {
            console.error('LINE API error:', await response.text());
            return false;
        }
    } catch (e) {
        console.error('LINE notification error:', e.message);
        return false;
    }
}

// ===== API Routes =====

// GET /api/bins — Get all bins with fill levels and GPS
router.get('/', async (req, res) => {
    try {
        const [bins] = await pool.query(
            'SELECT * FROM waste_bins ORDER BY location_name, bin_type'
        );
        
        // Add Thai labels
        const enriched = bins.map(bin => ({
            ...bin,
            statusLabel: getStatusLabel(bin.status),
            typeLabel: getBinTypeLabel(bin.bin_type),
            fillColor: bin.status === 'full' ? '#ef4444' : 
                       bin.status === 'almost_full' ? '#f59e0b' : 
                       bin.status === 'empty' ? '#94a3b8' : '#10b981'
        }));
        
        res.json(enriched);
    } catch (e) {
        console.error('Bins fetch error:', e.message);
        // Fallback to demo data if DB not available
        res.json(getDemoBins());
    }
});

// GET /api/bins/stats — Summary statistics
router.get('/stats', async (req, res) => {
    try {
        const [bins] = await pool.query('SELECT * FROM waste_bins');
        
        const stats = {
            total: bins.length,
            full: bins.filter(b => b.status === 'full').length,
            almostFull: bins.filter(b => b.status === 'almost_full').length,
            normal: bins.filter(b => b.status === 'normal').length,
            empty: bins.filter(b => b.status === 'empty').length,
            avgFillLevel: bins.length > 0 ? Math.round(bins.reduce((s, b) => s + b.fill_level, 0) / bins.length) : 0,
            byType: {
                plastic: { count: 0, avgFill: 0, bins: [] },
                glass: { count: 0, avgFill: 0, bins: [] },
                paper: { count: 0, avgFill: 0, bins: [] },
                can: { count: 0, avgFill: 0, bins: [] }
            }
        };

        ['plastic', 'glass', 'paper', 'can'].forEach(type => {
            const typeBins = bins.filter(b => b.bin_type === type);
            stats.byType[type].count = typeBins.length;
            stats.byType[type].avgFill = typeBins.length > 0 
                ? Math.round(typeBins.reduce((s, b) => s + b.fill_level, 0) / typeBins.length) 
                : 0;
            stats.byType[type].bins = typeBins.map(b => ({
                id: b.id, name: b.bin_name, fill: b.fill_level, status: b.status,
                location: b.location_name
            }));
        });

        res.json(stats);
    } catch (e) {
        console.error('Bins stats error:', e.message);
        res.json(getDemoStats());
    }
});

// GET /api/bins/notifications — Recent notifications
router.get('/notifications', async (req, res) => {
    try {
        const [notifications] = await pool.query(
            `SELECT bn.*, wb.bin_name, wb.bin_type, wb.location_name 
             FROM bin_notifications bn 
             JOIN waste_bins wb ON bn.bin_id = wb.id 
             ORDER BY bn.sent_at DESC LIMIT 20`
        );
        res.json(notifications);
    } catch (e) {
        console.error('Notifications fetch error:', e.message);
        res.json([]);
    }
});

// POST /api/bins/update — Receive sensor data from IoT device
router.post('/update', async (req, res) => {
    try {
        const { bin_id, ultrasonic_distance_cm, lat, lng } = req.body;
        
        if (!bin_id || ultrasonic_distance_cm === undefined) {
            return res.status(400).json({ error: 'bin_id and ultrasonic_distance_cm required' });
        }

        // Get current bin data
        const [bins] = await pool.query('SELECT * FROM waste_bins WHERE id = ?', [bin_id]);
        if (bins.length === 0) {
            return res.status(404).json({ error: 'Bin not found' });
        }

        const bin = bins[0];
        const binHeight = bin.bin_height_cm;
        const fillLevel = calculateFillLevel(ultrasonic_distance_cm, binHeight);
        const newStatus = getStatus(fillLevel);
        const oldStatus = bin.status;

        // Update bin data
        const updateFields = {
            ultrasonic_distance_cm,
            fill_level: fillLevel,
            status: newStatus,
            last_updated: new Date()
        };

        // Update GPS if provided (from ATGM336H-5N module)
        if (lat && lng) {
            updateFields.lat = lat;
            updateFields.lng = lng;
        }

        await pool.query(
            'UPDATE waste_bins SET ? WHERE id = ?',
            [updateFields, bin_id]
        );

        // Send LINE notification if status changed to critical
        let notified = false;
        if (newStatus !== oldStatus && (newStatus === 'full' || newStatus === 'almost_full')) {
            const updatedBin = { ...bin, fill_level: fillLevel, ...updateFields };
            notified = await sendLineNotification(updatedBin, newStatus);
            
            // Update last notified
            if (notified) {
                await pool.query('UPDATE waste_bins SET last_notified_at = NOW() WHERE id = ?', [bin_id]);
            }
        }

        res.json({
            success: true,
            bin_id,
            fill_level: fillLevel,
            status: newStatus,
            statusLabel: getStatusLabel(newStatus),
            line_notified: notified
        });
    } catch (e) {
        console.error('Bin update error:', e.message);
        res.status(500).json({ error: 'Failed to update bin' });
    }
});

// POST /api/bins/notify — Manual LINE notification trigger
router.post('/notify', async (req, res) => {
    try {
        const { bin_id } = req.body;
        
        const [bins] = await pool.query('SELECT * FROM waste_bins WHERE id = ?', [bin_id]);
        if (bins.length === 0) {
            return res.status(404).json({ error: 'Bin not found' });
        }

        const bin = bins[0];
        const sent = await sendLineNotification(bin, bin.status);
        
        res.json({ success: sent, message: sent ? 'Notification sent via LINE' : 'LINE not configured or send failed' });
    } catch (e) {
        console.error('Manual notify error:', e.message);
        res.status(500).json({ error: 'Failed to send notification' });
    }
});

// ===== Demo Data Fallback =====
function getDemoBins() {
    const locations = [
        { name: 'ลานพญาศรีสัตตนาคราช', lat: 17.404396, lng: 104.793134 },
        { name: 'ถนนคนเดินริมโขง', lat: 17.405200, lng: 104.789800 },
        { name: 'ตลาดอินโดจีน', lat: 17.408100, lng: 104.785500 },
        { name: 'ศาลากลาง จ.นครพนม', lat: 17.399500, lng: 104.784200 }
    ];
    const types = ['plastic', 'glass', 'paper', 'can'];
    let id = 1;
    const bins = [];
    
    locations.forEach(loc => {
        types.forEach((type, ti) => {
            const fill = Math.round(Math.random() * 100);
            const status = getStatus(fill);
            bins.push({
                id: id++,
                bin_name: `BIN-NKP-${String(id - 1).padStart(3, '0')}`,
                bin_type: type,
                lat: loc.lat + (ti * 0.0001),
                lng: loc.lng + (ti * 0.0001),
                fill_level: fill,
                gps_module: 'ATGM336H-5N',
                ultrasonic_distance_cm: Math.round(80 * (1 - fill / 100)),
                bin_height_cm: 80,
                status: status,
                statusLabel: getStatusLabel(status),
                typeLabel: getBinTypeLabel(type),
                fillColor: status === 'full' ? '#ef4444' : status === 'almost_full' ? '#f59e0b' : status === 'empty' ? '#94a3b8' : '#10b981',
                location_name: loc.name,
                last_updated: new Date().toISOString()
            });
        });
    });
    return bins;
}

function getDemoStats() {
    const bins = getDemoBins();
    return {
        total: bins.length,
        full: bins.filter(b => b.status === 'full').length,
        almostFull: bins.filter(b => b.status === 'almost_full').length,
        normal: bins.filter(b => b.status === 'normal').length,
        empty: bins.filter(b => b.status === 'empty').length,
        avgFillLevel: Math.round(bins.reduce((s, b) => s + b.fill_level, 0) / bins.length),
        byType: {
            plastic: { count: 4, avgFill: Math.round(bins.filter(b => b.bin_type === 'plastic').reduce((s, b) => s + b.fill_level, 0) / 4), bins: [] },
            glass: { count: 4, avgFill: Math.round(bins.filter(b => b.bin_type === 'glass').reduce((s, b) => s + b.fill_level, 0) / 4), bins: [] },
            paper: { count: 4, avgFill: Math.round(bins.filter(b => b.bin_type === 'paper').reduce((s, b) => s + b.fill_level, 0) / 4), bins: [] },
            can: { count: 4, avgFill: Math.round(bins.filter(b => b.bin_type === 'can').reduce((s, b) => s + b.fill_level, 0) / 4), bins: [] }
        }
    };
}

module.exports = router;
