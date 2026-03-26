const MapMockup = require('../backend/models/MapMockup');

export default async function handler(req, res) {
    if (req.method === 'GET') {
        try {
            const mockup = await MapMockup.getActive();
            
            if (!mockup) {
                // Fallback mockup if database is empty
                return res.status(200).json({
                    id: 0,
                    title: 'ตัวอย่างแผนที่อัจฉริยะ',
                    description: 'ระบบแผนที่ดิจิทัลสำหรับนครพนม',
                    icon: 'fa-map-location-dot',
                    features: [
                        { icon: 'fa-route', text: 'นำทางเส้นทางอัจฉริยะ' },
                        { icon: 'fa-traffic-light', text: 'ข้อมูลจราจรแบบเรียลไทม์' },
                        { icon: 'fa-location-dot', text: 'สถานที่ท่องเที่ยวยอดนิยม' }
                    ],
                    is_active: 1
                });
            }
            
            res.status(200).json(mockup);
        } catch (error) {
            console.error('Error fetching mockup:', error);
            res.status(500).json({ error: 'Failed to fetch mockup' });
        }
    } else if (req.method === 'POST') {
        try {
            const mockup = await MapMockup.add(req.body);
            res.status(201).json(mockup);
        } catch (error) {
            console.error('Error creating mockup:', error);
            res.status(500).json({ error: 'Failed to create mockup' });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}
