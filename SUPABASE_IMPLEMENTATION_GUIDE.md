# 🚀 คู่มือการใช้งาน Supabase สำหรับระบบถังขยะอัจฉริยะ

คู่มือนี้จะแนะนำวิธีการตั้งค่า Supabase เพื่อเก็บพิกัดถังขยะและรูปภาพ

---

## 📋 สิ่งที่ต้องเตรียม

1. บัญชี Supabase (สมัครฟรีที่ https://supabase.com)
2. Node.js และ npm ติดตั้งแล้ว
3. รูปภาพถังขยะ (สำหรับแต่ละถัง)

---

## 🎯 STEP 1: สร้าง Supabase Project

### 1.1 สร้าง Project ใหม่
1. เข้าสู่ https://supabase.com/dashboard
2. คลิก **"New Project"**
3. กรอกข้อมูล:
   - **Name**: `nakhonphanom-smartcity`
   - **Database Password**: สร้างรหัสผ่านที่แข็งแรง (เก็บไว้ดี!)
   - **Region**: เลือก **Singapore** (ใกล้ไทยที่สุด)
4. คลิก **"Create new project"**
5. รอประมาณ 2-3 นาที

### 1.2 เก็บ API Keys
หลังจาก Project สร้างเสร็จ:
1. ไปที่ **Settings** → **API**
2. คัดลอกค่าเหล่านี้:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGc...` (ยาวมาก)
   - **service_role key**: `eyJhbGc...` (ยาวมาก - ใช้สำหรับ Backend)

---

## 🗄️ STEP 2: สร้าง Database Table

### 2.1 เปิด SQL Editor
1. ไปที่ **SQL Editor** ในเมนูด้านซ้าย
2. คลิก **"New query"**

### 2.2 สร้างตาราง waste_bins
คัดลอกและรัน SQL นี้:

```sql
-- สร้างตาราง waste_bins
CREATE TABLE waste_bins (
  id SERIAL PRIMARY KEY,
  bin_name VARCHAR(100) NOT NULL,
  bin_type VARCHAR(20) DEFAULT 'general' CHECK (bin_type IN ('plastic', 'glass', 'paper', 'can', 'general')),
  lat DECIMAL(10,8),
  lng DECIMAL(11,8),
  fill_level INTEGER DEFAULT 0 CHECK (fill_level >= 0 AND fill_level <= 100),
  status VARCHAR(20) DEFAULT 'empty' CHECK (status IN ('empty', 'normal', 'almost_full', 'full')),
  location_name VARCHAR(150),
  gps_module VARCHAR(50) DEFAULT 'ATGM336H-5N',
  image_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- สร้าง Index สำหรับค้นหาเร็วขึ้น
CREATE INDEX idx_waste_bins_location ON waste_bins(lat, lng);
CREATE INDEX idx_waste_bins_status ON waste_bins(status);

-- เปิดใช้งาน Row Level Security (RLS)
ALTER TABLE waste_bins ENABLE ROW LEVEL SECURITY;

-- Policy: อนุญาตให้ทุกคนอ่านข้อมูล
CREATE POLICY "Allow public read access" 
ON waste_bins FOR SELECT 
USING (true);

-- Policy: อนุญาตให้ทุกคนเพิ่มข้อมูล (สำหรับ Smart Bin ส่งข้อมูล)
CREATE POLICY "Allow public insert" 
ON waste_bins FOR INSERT 
WITH CHECK (true);

-- Policy: อนุญาตให้ทุกคนอัปเดตข้อมูล
CREATE POLICY "Allow public update" 
ON waste_bins FOR UPDATE 
USING (true);
```

### 2.3 ตรวจสอบตาราง
1. ไปที่ **Table Editor**
2. คุณจะเห็นตาราง `waste_bins` ปรากฏขึ้น

---

## 📦 STEP 3: สร้าง Storage Bucket

### 3.1 สร้าง Bucket สำหรับเก็บรูปถังขยะ
1. ไปที่ **Storage** ในเมนูด้านซ้าย
2. คลิก **"New bucket"**
3. กรอกข้อมูล:
   - **Name**: `waste-bin-images`
   - **Public bucket**: ✅ เปิด (เพื่อให้แสดงรูปบนแผนที่ได้)
4. คลิก **"Create bucket"**

### 3.2 ตั้งค่า Storage Policies
1. คลิกที่ bucket `waste-bin-images`
2. ไปที่แท็บ **Policies**
3. คลิก **"New policy"**

**Policy 1: อนุญาตให้ทุกคนอ่านรูป**
```sql
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'waste-bin-images' );
```

**Policy 2: อนุญาตให้ทุกคนอัปโหลดรูป**
```sql
CREATE POLICY "Public Upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'waste-bin-images' );
```

### 3.3 อัปโหลดรูป Default
1. คลิกที่ bucket `waste-bin-images`
2. สร้างโฟลเดอร์ `default`
3. อัปโหลดรูปถังขยะ 5 แบบ:
   - `plastic-bin.png` (ถังพลาสติก - สีน้ำเงิน)
   - `glass-bin.png` (ถังแก้ว - สีเขียว)
   - `paper-bin.png` (ถังกระดาษ - สีเหลือง)
   - `can-bin.png` (ถังกระป๋อง - สีแดง)
   - `general-bin.png` (ถังทั่วไป - สีเทา)

---

## 💻 STEP 4: ติดตั้ง Supabase Client

### 4.1 ติดตั้ง Package
```bash
npm install @supabase/supabase-js
```

### 4.2 สร้างไฟล์ Config
สร้างไฟล์ `backend/config/supabase.js`:

```javascript
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = { supabase };
```

### 4.3 เพิ่ม Environment Variables
แก้ไขไฟล์ `.env`:

```env
# Supabase Configuration
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_KEY=eyJhbGc...
```

---

## 🔧 STEP 5: สร้าง API Routes สำหรับ Supabase

### 5.1 สร้าง Route สำหรับจัดการถังขยะ
สร้างไฟล์ `backend/routes/supabase-bins.js`:

```javascript
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { supabase } = require('../config/supabase');

// ตั้งค่า multer สำหรับอัปโหลดรูป
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// GET /api/supabase-bins - ดึงข้อมูลถังขยะทั้งหมด
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('waste_bins')
      .select('*')
      .order('id', { ascending: true });

    if (error) throw error;

    // ถ้าไม่มีรูป ใช้รูป default
    const binsWithImages = data.map(bin => {
      if (!bin.image_url) {
        const defaultImages = {
          plastic: 'default/plastic-bin.png',
          glass: 'default/glass-bin.png',
          paper: 'default/paper-bin.png',
          can: 'default/can-bin.png',
          general: 'default/general-bin.png'
        };
        const defaultPath = defaultImages[bin.bin_type] || defaultImages.general;
        const { data: urlData } = supabase.storage
          .from('waste-bin-images')
          .getPublicUrl(defaultPath);
        bin.image_url = urlData.publicUrl;
      }
      return bin;
    });

    res.json(binsWithImages);
  } catch (error) {
    console.error('Error fetching bins:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/supabase-bins/:id - ดึงข้อมูลถังขยะ 1 ถัง
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('waste_bins')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Bin not found' });

    // ถ้าไม่มีรูป ใช้รูป default
    if (!data.image_url) {
      const defaultImages = {
        plastic: 'default/plastic-bin.png',
        glass: 'default/glass-bin.png',
        paper: 'default/paper-bin.png',
        can: 'default/can-bin.png',
        general: 'default/general-bin.png'
      };
      const defaultPath = defaultImages[data.bin_type] || defaultImages.general;
      const { data: urlData } = supabase.storage
        .from('waste-bin-images')
        .getPublicUrl(defaultPath);
      data.image_url = urlData.publicUrl;
    }

    res.json(data);
  } catch (error) {
    console.error('Error fetching bin:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/supabase-bins - เพิ่มถังขยะใหม่
router.post('/', async (req, res) => {
  try {
    const { bin_name, bin_type, lat, lng, fill_level, status, location_name, gps_module } = req.body;

    const { data, error } = await supabase
      .from('waste_bins')
      .insert([{
        bin_name,
        bin_type: bin_type || 'general',
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        fill_level: parseInt(fill_level) || 0,
        status: status || 'empty',
        location_name,
        gps_module: gps_module || 'ATGM336H-5N'
      }])
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error creating bin:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/supabase-bins/:id - อัปเดตข้อมูลถังขยะ
router.put('/:id', async (req, res) => {
  try {
    const { bin_name, bin_type, lat, lng, fill_level, status, location_name } = req.body;

    const updateData = {};
    if (bin_name) updateData.bin_name = bin_name;
    if (bin_type) updateData.bin_type = bin_type;
    if (lat) updateData.lat = parseFloat(lat);
    if (lng) updateData.lng = parseFloat(lng);
    if (fill_level !== undefined) updateData.fill_level = parseInt(fill_level);
    if (status) updateData.status = status;
    if (location_name) updateData.location_name = location_name;
    updateData.last_update = new Date().toISOString();

    const { data, error } = await supabase
      .from('waste_bins')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error updating bin:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/supabase-bins/:id/upload-image - อัปโหลดรูปถังขยะ
router.post('/:id/upload-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const binId = req.params.id;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `bins/${binId}/${timestamp}.jpg`;

    // อัปโหลดไปยัง Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('waste-bin-images')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (uploadError) throw uploadError;

    // สร้าง public URL
    const { data: urlData } = supabase.storage
      .from('waste-bin-images')
      .getPublicUrl(fileName);

    const imageUrl = urlData.publicUrl;

    // อัปเดต database
    const { data: binData, error: updateError } = await supabase
      .from('waste_bins')
      .update({ 
        image_url: imageUrl,
        last_update: new Date().toISOString()
      })
      .eq('id', binId)
      .select()
      .single();

    if (updateError) throw updateError;

    res.json({ 
      success: true, 
      image_url: imageUrl,
      data: binData 
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/supabase-bins/:id - ลบถังขยะ
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('waste_bins')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;

    res.json({ success: true, message: 'Bin deleted successfully' });
  } catch (error) {
    console.error('Error deleting bin:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

### 5.2 เพิ่ม Route ใน server.js
แก้ไขไฟล์ `backend/server.js`:

```javascript
// เพิ่มบรรทัดนี้ใกล้ๆ กับ routes อื่นๆ
const supabaseBinsRoutes = require('./routes/supabase-bins');

// เพิ่มบรรทัดนี้ใกล้ๆ กับ app.use อื่นๆ
app.use('/api/supabase-bins', supabaseBinsRoutes);
```

### 5.3 ติดตั้ง multer
```bash
npm install multer
```

---

## 🗺️ STEP 6: แสดงถังขยะบนแผนที่

### 6.1 สร้างฟังก์ชันดึงข้อมูลจาก Supabase
เพิ่มใน `frontend/admin-dashboard.html`:

```javascript
// ดึงข้อมูลถังขยะจาก Supabase
async function fetchBinsFromSupabase() {
    try {
        const res = await fetch('/api/supabase-bins');
        const bins = await res.json();
        
        if (!window.binsMap) return;
        
        // ลบ markers เก่า
        if (window.binsMarkers) {
            window.binsMarkers.forEach(m => window.binsMap.removeLayer(m));
        }
        window.binsMarkers = [];
        
        // เพิ่ม markers ใหม่พร้อมรูปภาพ
        bins.forEach(bin => {
            const fillColor = bin.fill_level >= 90 ? '#ef4444' : 
                             bin.fill_level >= 70 ? '#f59e0b' : '#10b981';
            
            // ใช้รูปจาก Supabase Storage
            const marker = L.marker([bin.lat, bin.lng], {
                icon: L.icon({
                    iconUrl: bin.image_url,
                    iconSize: [40, 40],
                    iconAnchor: [20, 40],
                    popupAnchor: [0, -40],
                    className: 'bin-marker-icon'
                })
            }).addTo(window.binsMap);
            
            marker.bindPopup(`
                <div style="text-align: center; min-width: 200px;">
                    <img src="${bin.image_url}" 
                         style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px; margin-bottom: 10px;">
                    <h4 style="margin: 0 0 10px 0; color: ${fillColor};">
                        <i class="fa-solid fa-trash-can"></i> ${bin.bin_name}
                    </h4>
                    <div style="text-align: left; font-size: 0.85rem;">
                        <p style="margin: 5px 0;"><strong>ประเภท:</strong> ${bin.bin_type}</p>
                        <p style="margin: 5px 0;"><strong>ปริมาณ:</strong> 
                            <span style="color: ${fillColor}; font-weight: 700;">${bin.fill_level}%</span>
                        </p>
                        <p style="margin: 5px 0;"><strong>สถานะ:</strong> ${bin.status}</p>
                        <p style="margin: 5px 0;"><strong>ตำแหน่ง:</strong> ${bin.location_name || '-'}</p>
                        <p style="margin: 5px 0; font-size: 0.75rem; color: #64748b;">
                            GPS: ${bin.lat}, ${bin.lng}
                        </p>
                    </div>
                </div>
            `);
            
            window.binsMarkers.push(marker);
        });
        
        addGPSLog(`✅ โหลดข้อมูล ${bins.length} ถังจาก Supabase`, 'success');
        
    } catch (error) {
        console.error('Error fetching bins from Supabase:', error);
        addGPSLog(`❌ ไม่สามารถโหลดข้อมูลจาก Supabase: ${error.message}`, 'error');
    }
}
```

### 6.2 เรียกใช้ฟังก์ชันเมื่อเปิดหน้า
```javascript
// เพิ่มใน showAdminSection
if (sectionId === 'waste-bins') {
    setTimeout(() => {
        if (!gpsWebSocket || gpsWebSocket.readyState !== WebSocket.OPEN) {
            initGPSWebSocket();
        }
        getUserLocation();
        fetchBinsFromSupabase(); // เพิ่มบรรทัดนี้
    }, 500);
}
```

---

## 📤 STEP 7: อัปโหลดรูปถังขยะ

### 7.1 เพิ่มฟอร์มอัปโหลดรูป
เพิ่มใน admin dashboard:

```html
<div style="margin-top: 1rem;">
    <h4 style="font-size: 0.9rem; margin-bottom: 10px;">
        <i class="fa-solid fa-camera"></i> อัปโหลดรูปถังขยะ
    </h4>
    <input type="file" id="bin-image-upload" accept="image/*" 
           style="margin-bottom: 10px;">
    <input type="number" id="bin-id-for-upload" placeholder="Bin ID" 
           style="width: 100px; margin-bottom: 10px;">
    <button onclick="uploadBinImage()" 
            style="padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer;">
        <i class="fa-solid fa-upload"></i> อัปโหลด
    </button>
</div>
```

### 7.2 เพิ่มฟังก์ชันอัปโหลด
```javascript
async function uploadBinImage() {
    const fileInput = document.getElementById('bin-image-upload');
    const binIdInput = document.getElementById('bin-id-for-upload');
    
    if (!fileInput.files[0]) {
        addGPSLog('❌ กรุณาเลือกรูปภาพ', 'error');
        return;
    }
    
    if (!binIdInput.value) {
        addGPSLog('❌ กรุณาระบุ Bin ID', 'error');
        return;
    }
    
    const formData = new FormData();
    formData.append('image', fileInput.files[0]);
    
    try {
        addGPSLog('📤 กำลังอัปโหลดรูปภาพ...', 'info');
        
        const res = await fetch(`/api/supabase-bins/${binIdInput.value}/upload-image`, {
            method: 'POST',
            body: formData
        });
        
        const data = await res.json();
        
        if (res.ok) {
            addGPSLog(`✅ อัปโหลดรูปสำเร็จ! Bin ID: ${binIdInput.value}`, 'success');
            fileInput.value = '';
            binIdInput.value = '';
            
            // Refresh แผนที่
            setTimeout(() => fetchBinsFromSupabase(), 500);
        } else {
            addGPSLog(`❌ อัปโหลดล้มเหลว: ${data.error}`, 'error');
        }
    } catch (error) {
        addGPSLog(`❌ เกิดข้อผิดพลาด: ${error.message}`, 'error');
    }
}
```

---

## ✅ STEP 8: ทดสอบระบบ

### 8.1 เพิ่มถังขยะทดสอบ
```bash
curl -X POST http://localhost:3000/api/supabase-bins \
  -H "Content-Type: application/json" \
  -d '{
    "bin_name": "ถังทดสอบ #1",
    "bin_type": "plastic",
    "lat": 17.4101,
    "lng": 104.7790,
    "fill_level": 75,
    "status": "almost_full",
    "location_name": "ลานพญานาค"
  }'
```

### 8.2 ตรวจสอบบน Dashboard
1. เปิด `http://localhost:3000/admin-dashboard.html?section=waste-bins`
2. คุณจะเห็นถังขยะปรากฏบนแผนที่
3. คลิกที่ marker เพื่อดูรายละเอียด

---

## 🎉 สำเร็จ!

ตอนนี้คุณมีระบบที่:
- ✅ เก็บพิกัดถังขยะใน Supabase Database
- ✅ เก็บรูปภาพใน Supabase Storage Bucket
- ✅ แสดงรูปถังขยะบนแผนที่
- ✅ อัปโหลดรูปใหม่ได้
- ✅ อัปเดตข้อมูลแบบ Realtime

---

## 📚 เอกสารเพิ่มเติม

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Storage Guide](https://supabase.com/docs/guides/storage)
- [Leaflet.js Documentation](https://leafletjs.com/reference.html)

---

**สร้างโดย:** Kiro AI Assistant  
**วันที่:** 2026-03-24  
**เวอร์ชัน:** 1.0
