# 🗑️ Smart Bin - คู่มือการใช้งาน

## 📋 ไฟล์ที่ต้องมี

1. `run_smartbin.py` - โปรแกรมหลัก
2. `run.sh` - สคริปต์รันแบบปกติ
3. `run_docker.sh` - สคริปต์รัน Docker
4. `best.engine` - ไฟล์ Model (ต้องมี!)

---

## 🚀 วิธีที่ 1: รันแบบปกติ (แนะนำ)

### ขั้นตอน:

1. **คัดลอกไฟล์ทั้งหมดไปยัง Jetson Nano:**
   ```bash
   cd ~/Desktop/yolo_project
   ```

2. **วางไฟล์ best.engine:**
   ```bash
   # วางไฟล์ใน ~/Desktop/yolo_project/best.engine
   # หรือ ~/Desktop/yolo_project/models/best.engine
   ```

3. **ให้สิทธิ์รันสคริปต์:**
   ```bash
   chmod +x run.sh
   ```

4. **รันโปรแกรม:**
   ```bash
   ./run.sh
   ```

---

## 🐳 วิธีที่ 2: รัน Docker

### ขั้นตอน:

1. **ให้สิทธิ์รันสคริปต์:**
   ```bash
   chmod +x run_docker.sh
   ```

2. **รันโปรแกรม:**
   ```bash
   ./run_docker.sh
   ```

---

## 📦 วิธีที่ 3: รันด้วยคำสั่งเดียว

### รันแบบปกติ:
```bash
cd ~/Desktop/yolo_project
pip3 install pyserial
python3 run_smartbin.py
```

### รัน Docker:
```bash
docker run -it --rm \
  --runtime nvidia \
  --network host \
  --privileged \
  -v ~/Desktop/yolo_project:/workspace \
  -v /dev:/dev \
  -e DISPLAY=$DISPLAY \
  -v /tmp/.X11-unix:/tmp/.X11-unix \
  my_yolo_final:latest \
  bash -c "pip3 install pyserial && cd /workspace && python3 run_smartbin.py"
```

---

## 🔧 แก้ปัญหา

### ปัญหา: ไม่พบไฟล์ best.engine

**วิธีแก้:**
```bash
# ค้นหาไฟล์
find ~ -name "best.engine"

# คัดลอกไฟล์
cp /path/to/best.engine ~/Desktop/yolo_project/
```

### ปัญหา: Serial ไม่เชื่อมต่อ

**วิธีแก้:**
```bash
# ตรวจสอบ Serial Port
ls -l /dev/ttyTHS* /dev/ttyUSB*

# ตั้งค่าสิทธิ์
sudo chmod 666 /dev/ttyTHS0
sudo chmod 666 /dev/ttyTHS1
```

### ปัญหา: กล้องไม่เปิด

**วิธีแก้:**
```bash
# ตรวจสอบกล้อง
ls -l /dev/video*

# ทดสอบกล้อง
v4l2-ctl --list-devices
```

---

## 📋 คำสั่งที่ใช้ในโปรแกรม

- กด `q` = ออกจากโปรแกรม
- กด `s` = บันทึกภาพ

---

## ✅ ตรวจสอบว่าทำงานถูกต้อง

เมื่อรันโปรแกรมควรเห็น:
```
✅ พบไฟล์: /path/to/best.engine
✅ โหลด Model สำเร็จ
✅ จัดสรรหน่วยความจำสำเร็จ
✅ เปิดกล้องสำเร็จ
✅ เชื่อมต่อ ESP32 สำเร็จที่: /dev/ttyTHS1
🚀 ระบบเริ่มทำงาน
```

---

## 📞 ติดปัญหา?

1. ตรวจสอบว่าไฟล์ best.engine อยู่ในตำแหน่งที่ถูกต้อง
2. ตรวจสอบว่า TensorRT ทำงานได้ (รันนอก Docker)
3. ตรวจสอบว่า Serial Port เชื่อมต่อถูกต้อง
4. ตรวจสอบว่ากล้องทำงานได้
