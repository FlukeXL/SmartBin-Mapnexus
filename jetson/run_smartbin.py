#!/usr/bin/env python3
"""
Smart Bin - Production Ready
ใช้ TensorRT Engine (best.engine)
รองรับ Docker Container
"""

import cv2
import numpy as np
import time
import os
import sys

# ลอง import serial
try:
    import serial
    SERIAL_AVAILABLE = True
except ImportError:
    print("⚠️ pyserial ไม่ได้ติดตั้ง")
    SERIAL_AVAILABLE = False

# ลอง import TensorRT
try:
    import tensorrt as trt
    import pycuda.driver as cuda
    import pycuda.autoinit
    TENSORRT_AVAILABLE = True
except ImportError:
    print("⚠️ TensorRT ไม่พร้อม")
    TENSORRT_AVAILABLE = False

# ===== การตั้งค่า =====
CAMERA_ID = 0
SERIAL_PORTS = ['/dev/ttyTHS1', '/dev/ttyTHS0', '/dev/ttyUSB0', '/dev/ttyUSB1']
SERIAL_BAUD = 115200

# ค้นหาไฟล์ Model
MODEL_PATHS = [
    'best.engine',
    'models/best.engine',
    '/workspace/best.engine',
    '/workspace/models/best.engine',
    '/usr/src/app/best.engine',
    '/usr/src/app/models/best.engine'
]

CONFIDENCE_THRESHOLD = 0.5

# ประเภทขยะ
WASTE_CLASSES = {0: 'plastic', 1: 'metal', 2: 'glass', 3: 'paper'}
COLORS = {
    'plastic': (0, 255, 255),
    'metal': (128, 128, 128),
    'glass': (0, 255, 0),
    'paper': (255, 255, 255)
}

print("="*70)
print("🗑️  Smart Bin - YOLOv11m-seg Detection System")
print("="*70)
print()

# ค้นหาไฟล์ Model
MODEL_PATH = None
print("🔍 กำลังค้นหาไฟล์ Model...")
for path in MODEL_PATHS:
    if os.path.exists(path):
        MODEL_PATH = path
        print(f"✅ พบไฟล์: {os.path.abspath(path)}")
        break
    else:
        print(f"   ❌ ไม่พบ: {path}")

if MODEL_PATH is None:
    print("\n" + "="*70)
    print("❌ ไม่พบไฟล์ best.engine")
    print("="*70)
    print("\n💡 วางไฟล์ best.engine ในตำแหน่งใดตำแหน่งหนึ่ง:")
    for path in MODEL_PATHS[:4]:
        print(f"   - {path}")
    print("\n📋 ตัวอย่างคำสั่ง:")
    print("   mkdir -p models")
    print("   cp /path/to/your/best.engine models/")
    print("="*70)
    sys.exit(1)

# โหลด TensorRT Engine
if not TENSORRT_AVAILABLE:
    print("\n❌ TensorRT ไม่พร้อมใช้งาน")
    print("💡 ต้องรันบน Jetson Nano หรือใน Docker Container ที่มี TensorRT")
    sys.exit(1)

print(f"\n📦 กำลังโหลด TensorRT Engine...")

logger = trt.Logger(trt.Logger.WARNING)
runtime = trt.Runtime(logger)

try:
    with open(MODEL_PATH, 'rb') as f:
        engine = runtime.deserialize_cuda_engine(f.read())
    context = engine.create_execution_context()
    print("✅ โหลด Model สำเร็จ")
except Exception as e:
    print(f"❌ ไม่สามารถโหลด Model: {e}")
    sys.exit(1)

# จัดสรรหน่วยความจำ
inputs = []
outputs = []
bindings = []
stream = cuda.Stream()

for binding in engine:
    size = trt.volume(engine.get_binding_shape(binding))
    dtype = trt.nptype(engine.get_binding_dtype(binding))
    host_mem = cuda.pagelocked_empty(size, dtype)
    device_mem = cuda.mem_alloc(host_mem.nbytes)
    bindings.append(int(device_mem))
    
    if engine.binding_is_input(binding):
        inputs.append({'host': host_mem, 'device': device_mem})
    else:
        outputs.append({'host': host_mem, 'device': device_mem})

print("✅ จัดสรรหน่วยความจำสำเร็จ")

# เปิดกล้อง
print("\n📷 กำลังเปิดกล้อง...")
cap = cv2.VideoCapture(CAMERA_ID)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

if not cap.isOpened():
    print("❌ ไม่สามารถเปิดกล้องได้")
    print("💡 ตรวจสอบว่ากล้องเชื่อมต่ออยู่")
    sys.exit(1)

print("✅ เปิดกล้องสำเร็จ")

# เชื่อมต่อ Serial
ser = None
if SERIAL_AVAILABLE:
    print("\n🔌 กำลังเชื่อมต่อ Serial...")
    for port in SERIAL_PORTS:
        try:
            print(f"   ลอง: {port}")
            ser = serial.Serial(port, SERIAL_BAUD, timeout=1)
            time.sleep(2)
            print(f"✅ เชื่อมต่อ ESP32 สำเร็จที่: {port}")
            break
        except:
            continue

if ser is None:
    print("⚠️ ไม่พบ Serial Port")
    print("💡 ระบบจะทำงานโดยไม่มี Serial Communication")

print("\n" + "="*70)
print("🚀 ระบบเริ่มทำงาน")
print("="*70)
print("📋 คำสั่ง:")
print("   - กด 'q' = ออกจากโปรแกรม")
print("   - กด 's' = บันทึกภาพ")
print("="*70 + "\n")

# ตัวแปร
detection_count = {'plastic': 0, 'metal': 0, 'glass': 0, 'paper': 0}
last_detection = None
last_send_time = 0
frame_count = 0
fps_start = time.time()
fps = 0

try:
    while True:
        ret, frame = cap.read()
        if not ret:
            print("⚠️ ไม่สามารถอ่านภาพจากกล้อง")
            break
        
        # Preprocessing
        input_image = cv2.resize(frame, (640, 640))
        input_image = input_image.transpose(2, 0, 1)
        input_image = input_image.astype(np.float32) / 255.0
        input_image = np.expand_dims(input_image, axis=0)
        
        # Inference
        np.copyto(inputs[0]['host'], input_image.ravel())
        cuda.memcpy_htod_async(inputs[0]['device'], inputs[0]['host'], stream)
        context.execute_async_v2(bindings=bindings, stream_handle=stream.handle)
        cuda.memcpy_dtoh_async(outputs[0]['host'], outputs[0]['device'], stream)
        stream.synchronize()
        
        # Process detections
        output_data = outputs[0]['host'].reshape(-1, 6)  # [x, y, w, h, conf, class]
        
        detections = []
        for det in output_data:
            if len(det) >= 6:
                conf = det[4]
                if conf > CONFIDENCE_THRESHOLD:
                    class_id = int(det[5])
                    if class_id in WASTE_CLASSES:
                        x, y, w, h = det[:4]
                        waste_type = WASTE_CLASSES[class_id]
                        detections.append({
                            'type': waste_type,
                            'conf': conf,
                            'bbox': (x, y, w, h)
                        })
                        
                        # วาดกรอบ
                        color = COLORS[waste_type]
                        x1, y1 = int(x), int(y)
                        x2, y2 = int(x + w), int(y + h)
                        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                        
                        label = f"{waste_type}: {conf:.2f}"
                        cv2.putText(frame, label, (x1, y1-10),
                                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
        
        # ส่งคำสั่งไปยัง ESP32
        if detections and ser:
            best = max(detections, key=lambda x: x['conf'])
            waste_type = best['type']
            current_time = time.time()
            
            if (last_detection != waste_type or current_time - last_send_time > 3):
                print(f"\n🎯 ตรวจพบ: {waste_type.upper()} (Conf: {best['conf']:.2%})")
                
                try:
                    command = f"OPEN:{waste_type}\n"
                    ser.write(command.encode())
                    print(f"📤 ส่งคำสั่ง: {command.strip()}")
                    
                    time.sleep(0.1)
                    if ser.in_waiting > 0:
                        response = ser.readline().decode().strip()
                        print(f"📥 Response: {response}")
                except Exception as e:
                    print(f"❌ Serial Error: {e}")
                
                detection_count[waste_type] += 1
                last_detection = waste_type
                last_send_time = current_time
        
        # คำนวณ FPS
        frame_count += 1
        if frame_count >= 30:
            fps = 30 / (time.time() - fps_start)
            fps_start = time.time()
            frame_count = 0
        
        # แสดงข้อมูลบนหน้าจอ
        cv2.putText(frame, f"FPS: {fps:.1f}", (10, 30),
                   cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
        
        y_offset = 70
        for waste_type, count in detection_count.items():
            text = f"{waste_type}: {count}"
            cv2.putText(frame, text, (10, y_offset),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, COLORS[waste_type], 2)
            y_offset += 30
        
        serial_status = "Serial: OK" if ser else "Serial: OFF"
        color = (0, 255, 0) if ser else (0, 0, 255)
        cv2.putText(frame, serial_status, (10, frame.shape[0] - 20),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
        
        cv2.imshow('Smart Bin - Detection', frame)
        
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            break
        elif key == ord('s'):
            filename = f"capture_{int(time.time())}.jpg"
            cv2.imwrite(filename, frame)
            print(f"💾 บันทึกภาพ: {filename}")

except KeyboardInterrupt:
    print("\n⚠️ ถูกยกเลิกโดยผู้ใช้")
except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback
    traceback.print_exc()
finally:
    print("\n🛑 ปิดระบบ...")
    cap.release()
    if ser:
        ser.close()
    cv2.destroyAllWindows()
    print("✅ ปิดระบบเรียบร้อย")
