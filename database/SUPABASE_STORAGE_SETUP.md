# 📸 Supabase Storage Setup - Waste Bin Images

คู่มือการตั้งค่า Supabase Storage สำหรับเก็บรูปภาพถังขยะ

---

## 🪣 สร้าง Storage Bucket

### 1. เข้าสู่ Supabase Dashboard
1. ไปที่ Project ของคุณ
2. คลิก **Storage** ในเมนูด้านซ้าย
3. คลิก **New Bucket**

### 2. ตั้งค่า Bucket
```
Bucket Name: waste-bin-images
Public: ✅ Yes (เพื่อให้แสดงรูปบนแผนที่ได้)
File Size Limit: 5 MB
Allowed MIME types: image/jpeg, image/png, image/webp
```

---

## 🔐 ตั้งค่า Storage Policies

### Policy 1: อนุญาตให้ทุกคนอ่านรูป (Public Read)
```sql
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'waste-bin-images' );
```

### Policy 2: อนุญาตให้ Admin อัปโหลดรูป
```sql
CREATE POLICY "Admin can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'waste-bin-images' 
  AND auth.role() = 'authenticated'
);
```

### Policy 3: อนุญาตให้ Admin ลบรูป
```sql
CREATE POLICY "Admin can delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'waste-bin-images'
  AND auth.role() = 'authenticated'
);
```

---

## 📁 โครงสร้างไฟล์

```
waste-bin-images/
├── bins/
│   ├── 101/
│   │   ├── 2026-03-24_10-30-00.jpg
│   │   └── 2026-03-24_15-45-00.jpg
│   ├── 102/
│   │   └── 2026-03-24_11-20-00.jpg
│   └── 103/
│       └── 2026-03-24_09-15-00.jpg
└── default/
    ├── plastic-bin.png
    ├── glass-bin.png
    ├── paper-bin.png
    ├── can-bin.png
    └── general-bin.png
```

---

## 🖼️ รูปภาพ Default สำหรับแต่ละประเภทถัง

อัปโหลดรูปเหล่านี้ไปที่ `waste-bin-images/default/`:

1. **plastic-bin.png** - ถังพลาสติก (สีน้ำเงิน)
2. **glass-bin.png** - ถังแก้ว (สีเขียว)
3. **paper-bin.png** - ถังกระดาษ (สีเหลือง)
4. **can-bin.png** - ถังกระป๋อง (สีแดง)
5. **general-bin.png** - ถังทั่วไป (สีเทา)

---

## 🔗 URL Format

### รูปที่อัปโหลด
```
https://[project-id].supabase.co/storage/v1/object/public/waste-bin-images/bins/101/2026-03-24_10-30-00.jpg
```

### รูป Default
```
https://[project-id].supabase.co/storage/v1/object/public/waste-bin-images/default/plastic-bin.png
```

---

## 💾 บันทึก URL ลง Database

เมื่ออัปโหลดรูปสำเร็จ ให้บันทึก URL ลงในตาราง `waste_bins`:

```sql
UPDATE waste_bins 
SET image_url = 'https://[project-id].supabase.co/storage/v1/object/public/waste-bin-images/bins/101/2026-03-24_10-30-00.jpg'
WHERE id = 101;
```

---

## 📝 ตัวอย่างการใช้งาน

### 1. อัปโหลดรูปผ่าน JavaScript
```javascript
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function uploadBinImage(binId, file) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `bins/${binId}/${timestamp}.jpg`;
  
  const { data, error } = await supabase.storage
    .from('waste-bin-images')
    .upload(fileName, file, {
      contentType: 'image/jpeg',
      upsert: false
    });
  
  if (error) {
    console.error('Upload error:', error);
    return null;
  }
  
  // สร้าง public URL
  const { data: urlData } = supabase.storage
    .from('waste-bin-images')
    .getPublicUrl(fileName);
  
  return urlData.publicUrl;
}
```

### 2. อัปเดต Database
```javascript
async function updateBinImage(binId, imageUrl) {
  const { data, error } = await supabase
    .from('waste_bins')
    .update({ image_url: imageUrl })
    .eq('id', binId);
  
  if (error) {
    console.error('Update error:', error);
    return false;
  }
  
  return true;
}
```

### 3. ดึงรูปมาแสดง
```javascript
async function getBinWithImage(binId) {
  const { data, error } = await supabase
    .from('waste_bins')
    .select('*')
    .eq('id', binId)
    .single();
  
  if (error) {
    console.error('Fetch error:', error);
    return null;
  }
  
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
  
  return data;
}
```

---

## 🗺️ แสดงรูปบนแผนที่ Leaflet

```javascript
function addBinMarkerWithImage(bin) {
  const marker = L.marker([bin.lat, bin.lng], {
    icon: L.icon({
      iconUrl: bin.image_url,
      iconSize: [40, 40],
      iconAnchor: [20, 40],
      popupAnchor: [0, -40]
    })
  }).addTo(map);
  
  marker.bindPopup(`
    <div style="text-align: center;">
      <img src="${bin.image_url}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px; margin-bottom: 10px;">
      <h4>${bin.bin_name}</h4>
      <p>ปริมาณ: ${bin.fill_level}%</p>
      <p>สถานะ: ${bin.status}</p>
    </div>
  `);
  
  return marker;
}
```

---

## 🎨 ขนาดรูปที่แนะนำ

- **Marker Icon**: 40x40 px (PNG with transparency)
- **Popup Image**: 200x200 px (JPEG/PNG)
- **Detail Image**: 800x800 px (JPEG)

---

## 🔄 การอัปเดตรูปอัตโนมัติ

เมื่อถังขยะส่งข้อมูล GPS มา สามารถส่งรูปมาพร้อมกันได้:

```javascript
// ESP32 ส่งข้อมูล + รูป
const formData = new FormData();
formData.append('bin_id', 101);
formData.append('lat', 17.4101);
formData.append('lng', 104.7790);
formData.append('fill_level', 85);
formData.append('image', imageFile); // รูปจากกล้อง

fetch('/api/gps/update-with-image', {
  method: 'POST',
  body: formData
});
```

---

## ⚡ Performance Tips

1. **ใช้ CDN**: Supabase Storage มี CDN built-in
2. **Optimize Images**: ลดขนาดรูปก่อนอัปโหลด
3. **Cache**: ใช้ browser cache สำหรับรูป default
4. **Lazy Loading**: โหลดรูปเมื่อจำเป็นเท่านั้น

---

## 🔒 Security Best Practices

1. ✅ ตั้งค่า File Size Limit
2. ✅ จำกัด MIME types
3. ✅ ใช้ RLS Policies
4. ✅ Validate file ก่อนอัปโหลด
5. ✅ Scan for malware (ถ้าเป็น production)

---

**สร้างโดย:** Kiro AI Assistant  
**วันที่:** 2026-03-24  
**เวอร์ชัน:** 1.0
