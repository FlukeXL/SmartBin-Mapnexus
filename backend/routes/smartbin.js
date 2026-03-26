const express = require('express');
const router = express.Router();
const SmartBin = require('../models/SmartBin');

// WebSocket clients storage
let wsClients = [];

// Set WebSocket server (called from server.js)
function setWebSocketServer(wss) {
    wss.on('connection', (ws) => {
        wsClients.push(ws);
        ws.on('close', () => {
            wsClients = wsClients.filter(client => client !== ws);
        });
    });
}

// Broadcast to all WebSocket clients
function broadcastToClients(message) {
    const data = JSON.stringify(message);
    wsClients.forEach(client => {
        if (client.readyState === 1) { // WebSocket.OPEN
            client.send(data);
        }
    });
}

// GET /api/smartbin - ดึงข้อมูลถังขยะทั้งหมด
router.get('/', async (req, res) => {
    try {
        const bins = await SmartBin.getActive();
        res.json(bins);
    } catch (error) {
        console.error('Error fetching smart bins:', error);
        res.status(500).json({ error: 'Failed to fetch smart bins' });
    }
});

// GET /api/smartbin/:id - ดึงข้อมูลถังขยะตาม ID
router.get('/:id', async (req, res) => {
    try {
        const bin = await SmartBin.getById(req.params.id);
        if (!bin) {
            return res.status(404).json({ error: 'Smart bin not found' });
        }
        res.json(bin);
    } catch (error) {
        console.error('Error fetching smart bin:', error);
        res.status(500).json({ error: 'Failed to fetch smart bin' });
    }
});

// POST /api/smartbin - เพิ่มถังขยะใหม่
router.post('/', async (req, res) => {
    try {
        const bin = await SmartBin.add(req.body);
        
        // Broadcast to WebSocket clients
        broadcastToClients({ type: 'smartbin_new', data: bin });
        
        res.status(201).json(bin);
    } catch (error) {
        console.error('Error creating smart bin:', error);
        res.status(500).json({ error: 'Failed to create smart bin' });
    }
});

// PUT /api/smartbin/:id - แก้ไขข้อมูลถังขยะ
router.put('/:id', async (req, res) => {
    try {
        const bin = await SmartBin.update(req.params.id, req.body);
        
        // Broadcast to WebSocket clients
        broadcastToClients({ type: 'smartbin_update', data: bin });
        
        res.json(bin);
    } catch (error) {
        console.error('Error updating smart bin:', error);
        res.status(500).json({ error: 'Failed to update smart bin' });
    }
});

// DELETE /api/smartbin/:id - ลบถังขยะ
router.delete('/:id', async (req, res) => {
    try {
        await SmartBin.delete(req.params.id);
        
        // Broadcast to WebSocket clients
        broadcastToClients({ type: 'smartbin_delete', data: { id: req.params.id } });
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting smart bin:', error);
        res.status(500).json({ error: 'Failed to delete smart bin' });
    }
});

// GET /api/smartbin/stats/summary - สถิติรวม
router.get('/stats/summary', async (req, res) => {
    try {
        const summary = await SmartBin.getSummary();
        res.json(summary || {});
    } catch (error) {
        console.error('Error fetching summary:', error);
        res.status(500).json({ error: 'Failed to fetch summary' });
    }
});

// GET /api/smartbin/need/collection - ถังที่ต้องเก็บด่วน
router.get('/need/collection', async (req, res) => {
    try {
        const bins = await SmartBin.getNeedCollection();
        res.json(bins);
    } catch (error) {
        console.error('Error fetching bins need collection:', error);
        res.status(500).json({ error: 'Failed to fetch bins' });
    }
});

module.exports = router;
module.exports.setWebSocketServer = setWebSocketServer;
