require('dotenv').config();
const express  = require('express');
const path     = require('path');
const cors     = require('cors');
const morgan   = require('morgan');
const http     = require('http');
const { WebSocketServer } = require('ws');

const app = express();

// --- LOGGING MIDDLEWARE ---
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url} - ${req.ip}`);
    next();
});

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// --- ROUTES ---
const pm25Routes        = require('./routes/pm25');
const eventRoutes       = require('./routes/event');
const checkinRoutes     = require('./routes/checkin');
const userRoutes        = require('./routes/user');
const placeRoutes       = require('./routes/place');
const crowdRoutes       = require('./routes/crowd');
const statsRoutes       = require('./routes/stats');
const trafficRoutes     = require('./routes/traffic');
const waterRoutes       = require('./routes/water');
const weatherRoutes     = require('./routes/weather');
const wasteRoutes       = require('./routes/waste');
const electricityRoutes = require('./routes/electricity');
const programRoutes     = require('./routes/program');
const reviewRoutes      = require('./routes/review');
const binsRoutes        = require('./routes/bins');
const gpsRoutes         = require('./routes/gps');
const supabaseBinsRoutes = require('./routes/supabase-bins');
const smartbinRoutes    = require('./routes/smartbin');

app.use('/api/pm25',             pm25Routes);
app.use('/api/event',            eventRoutes);
app.use('/api/checkin',          checkinRoutes);
app.use('/api/user',             userRoutes);
app.use('/api/place',            placeRoutes);
app.use('/api/crowd',            crowdRoutes);
app.use('/api/stats',            statsRoutes);
app.use('/api/traffic',          trafficRoutes);
app.use('/api/water',            waterRoutes);
app.use('/api/weather',          weatherRoutes);
app.use('/api/city/waste',       wasteRoutes);
app.use('/api/city/electricity', electricityRoutes);
app.use('/api/program',          programRoutes);
app.use('/api/review',           reviewRoutes);
app.use('/api/bins',             binsRoutes);
app.use('/api/gps',              gpsRoutes);
app.use('/api/supabase-bins',    supabaseBinsRoutes);
app.use('/api/smartbin',         smartbinRoutes);

// Client config keys
app.get('/api/config/client-keys', (req, res) => {
    res.json({
        longdoKey:     process.env.LONGDO_MAP_KEY    || null,
        googleMapsKey: process.env.GOOGLE_MAPS_API_KEY || null
    });
});

// LINE Chatbot Webhook
app.post('/api/line/webhook', async (req, res) => {
    res.status(200).json({ status: 'ok' });
    const events = req.body.events || [];
    const token  = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    if (!token) return;

    for (const event of events) {
        if (event.type !== 'message' || event.message.type !== 'text') continue;
        const text       = event.message.text.trim().toLowerCase();
        const replyToken = event.replyToken;
        let replyText    = '';

        if (text.includes('ถัง') || text.includes('ขยะ') || text.includes('bin')) {
            try {
                const { cityPool } = require('./config/db');
                const [bins] = await cityPool.query(
                    'SELECT bin_name, bin_type, fill_level, status, location_name, lat, lng FROM waste_bins ORDER BY fill_level DESC LIMIT 5'
                );
                if (bins.length === 0) {
                    replyText = '📦 ยังไม่มีข้อมูลถังขยะในระบบ';
                } else {
                    const typeMap   = { plastic: 'พลาสติก', glass: 'แก้ว', paper: 'กระดาษ', can: 'กระป๋อง' };
                    const statusMap = { full: '🔴 เต็ม', almost_full: '🟡 ใกล้เต็ม', normal: '🟢 ปกติ', empty: '⚪ ว่าง' };
                    replyText = '🗑️ สถานะถังขยะ (เรียงตามปริมาณ)\n\n';
                    bins.forEach(b => {
                        replyText += `${statusMap[b.status] || b.status} ${b.bin_name}\n`;
                        replyText += `  ประเภท: ${typeMap[b.bin_type] || b.bin_type}\n`;
                        replyText += `  ปริมาณ: ${b.fill_level}%\n`;
                        replyText += `  ตำแหน่ง: ${b.location_name || '-'}\n`;
                        replyText += `  GPS: ${b.lat}, ${b.lng}\n\n`;
                    });
                }
            } catch (e) {
                replyText = '⚠️ ไม่สามารถดึงข้อมูลถังขยะได้ในขณะนี้';
            }
        } else if (text.includes('เต็ม') || text.includes('full')) {
            try {
                const { cityPool } = require('./config/db');
                const [bins] = await cityPool.query(
                    "SELECT bin_name, fill_level, location_name, lat, lng FROM waste_bins WHERE status IN ('full','almost_full') ORDER BY fill_level DESC"
                );
                if (bins.length === 0) {
                    replyText = '✅ ไม่มีถังขยะที่เต็มหรือใกล้เต็มในขณะนี้';
                } else {
                    replyText = `⚠️ พบถังขยะที่ต้องเก็บ ${bins.length} ถัง\n\n`;
                    bins.forEach(b => {
                        replyText += `🔴 ${b.bin_name} — ${b.fill_level}%\n📍 ${b.location_name}\nGPS: ${b.lat}, ${b.lng}\n\n`;
                    });
                }
            } catch (e) {
                replyText = '⚠️ ไม่สามารถดึงข้อมูลได้';
            }
        } else {
            replyText = '🤖 สวัสดีครับ! ระบบถังขยะอัจฉริยะนครพนม\n\nพิมพ์:\n• "ถังขยะ" — ดูสถานะทั้งหมด\n• "เต็ม" — ดูถังที่ต้องเก็บ';
        }

        if (replyText) {
            await fetch('https://api.line.me/v2/bot/message/reply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ replyToken, messages: [{ type: 'text', text: replyText }] })
            }).catch(e => console.error('LINE reply error:', e.message));
        }
    }
});

// Static files
app.use('/admin-dashboard', express.static(path.join(__dirname, '../admin-dashboard')));
app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', version: '1.0.3-gps', timestamp: new Date() });
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// --- HTTP server + WebSocket ---
const server = http.createServer(app);
const wss    = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws, req) => {
    console.log(`[WS] Client connected: ${req.socket.remoteAddress}`);

    // ส่งตำแหน่ง GPS ล่าสุดทันทีที่ browser เชื่อมต่อ
    fetch(`http://localhost:${PORT}/api/gps/latest`)
        .then(r => r.json())
        .then(devices => {
            devices.forEach(d => {
                ws.send(JSON.stringify({ type: 'gps_update', data: d }));
            });
        }).catch(() => {});

    ws.on('close', () => console.log('[WS] Client disconnected'));
});

// ส่ง WebSocket server เข้าไปใน GPS route และ SmartBin route
gpsRoutes.setWebSocketServer(wss);
smartbinRoutes.setWebSocketServer(wss);

// เก็บ wsClients ไว้ใน global เพื่อให้ API routes อื่นๆ ใช้ได้
global.wsClients = [];
wss.on('connection', (ws) => {
    global.wsClients.push(ws);
    ws.on('close', () => {
        global.wsClients = global.wsClients.filter(client => client !== ws);
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`================================================`);
    console.log(`🚀 SmartMap Server (GPS Edition) running!`);
    console.log(`🏠 Local:    http://localhost:${PORT}`);
    console.log(`🛰️  GPS WS:  ws://localhost:${PORT}/ws`);
    console.log(`🗑️  SmartBin API: http://localhost:${PORT}/api/smartbin`);
    console.log(`================================================`);
});
