const SmartBin = require('../backend/models/SmartBin');

// WebSocket clients storage (ถ้ามีใน server.js)
let wsClients = [];

// ฟังก์ชันสำหรับ broadcast ข้อมูลไปยัง WebSocket clients
function broadcastSmartBinUpdate(type, data) {
    if (global.wsClients && global.wsClients.length > 0) {
        const message = JSON.stringify({ type, data });
        global.wsClients.forEach(client => {
            if (client.readyState === 1) { // WebSocket.OPEN
                client.send(message);
            }
        });
    }
}

export default async function handler(req, res) {
    if (req.method === 'GET') {
        try {
            const { id } = req.query;
            
            if (id) {
                const bin = await SmartBin.getById(id);
                if (!bin) {
                    return res.status(404).json({ error: 'Smart bin not found' });
                }
                return res.status(200).json(bin);
            }
            
            const bins = await SmartBin.getActive();
            res.status(200).json(bins);
        } catch (error) {
            console.error('Error fetching smart bins:', error);
            res.status(500).json({ error: 'Failed to fetch smart bins' });
        }
    } else if (req.method === 'POST') {
        try {
            const bin = await SmartBin.add(req.body);
            
            // Broadcast ไปยัง WebSocket clients
            broadcastSmartBinUpdate('smartbin_new', bin);
            
            res.status(201).json(bin);
        } catch (error) {
            console.error('Error creating smart bin:', error);
            res.status(500).json({ error: 'Failed to create smart bin' });
        }
    } else if (req.method === 'PUT') {
        try {
            const { id } = req.query;
            if (!id) {
                return res.status(400).json({ error: 'ID is required' });
            }
            
            const bin = await SmartBin.update(id, req.body);
            
            // Broadcast ไปยัง WebSocket clients
            broadcastSmartBinUpdate('smartbin_update', bin);
            
            res.status(200).json(bin);
        } catch (error) {
            console.error('Error updating smart bin:', error);
            res.status(500).json({ error: 'Failed to update smart bin' });
        }
    } else if (req.method === 'DELETE') {
        try {
            const { id } = req.query;
            if (!id) {
                return res.status(400).json({ error: 'ID is required' });
            }
            
            await SmartBin.delete(id);
            
            // Broadcast ไปยัง WebSocket clients
            broadcastSmartBinUpdate('smartbin_delete', { id });
            
            res.status(200).json({ success: true });
        } catch (error) {
            console.error('Error deleting smart bin:', error);
            res.status(500).json({ error: 'Failed to delete smart bin' });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}
