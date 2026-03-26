/**
 * backend/routes/supabase-bins.js
 * API Routes สำหรับจัดการถังขยะใน Supabase
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { supabase } = require('../config/supabase');

// ตั้งค่า multer สำหรับอัปโหลดรูป
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Middleware ตรวจสอบ Supabase
const checkSupabase = (req, res, next) => {
  if (!supabase) {
    return res.status(503).json({ 
      error: 'Supabase not configured',
      message: 'กรุณาตั้งค่า SUPABASE_URL และ SUPABASE_ANON_KEY ใน .env'
    });
  }
  next();
};

router.use(checkSupabase);

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
