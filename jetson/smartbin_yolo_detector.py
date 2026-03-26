#!/usr/bin/env python3
"""
Smart Bin - YOLOv11m-seg Waste Detection System
สำหรับ Jetson Nano
ตรวจจับขยะ 4 ประเภท: plastic, metal, glass, paper
"""

import cv2
import numpy as np
import serial
import time
import requests
from datetime import datetime
import tensorrt as trt
import pycuda.driver as cuda
import pycuda.autoinit

# ===== การตั้งค่า =====
CAMERA_ID = 0  # กล้อง Rapoo (ปรับตาม USB port)
SERIAL_PORT = '/dev/ttyTHS0'  # UART1 (Pin 8, 10) ไปยัง ESP32
SERIAL_BAUD = 115200
MODEL_PATH = 'models/best.engine'  # TensorRT Engine
CONFIDENCE_THRESHOLD = 0.5
BIN_ID = 1
BIN_NAME = "ถังขยะอัจฉริยะ #001"

# หมายเหตุ: 
# - Jetson Pin 8 (TXD) → ESP32 GPIO 25 (RX)
# - Jetson Pin 10 (RXD) → ESP32 GPIO 26 (TX)
# - Jetson Pin 6 (GND) → ESP32 GND
# - Ultrasonic Sensor (60cm) อยู่ที่ ESP32
# - Jetson ทำหน้าที่ตรวจจับขยะและส่งคำสั่งเปิดฝาเท่านั้น

# ประเภทขยะ
WASTE_CLASSES = {
    0: 'plastic',
    1: 'metal', 
    2: 'glass',
    3: 'paper'
}

# สีสำหรับแสดงผล
COLORS = {
    'plastic': (0, 255, 255),    # เหลือง
    'metal': (128, 128, 128),    # เทา
    'glass': (0, 255, 0),        # เขียว
    'paper': (255, 255, 255)     # ขาว
}

# ===== คลาส TensorRT Inference =====
class TRTInference:
    def __init__(self, engine_path):
        self.logger = trt.Logger(trt.Logger.WARNING)
        self.runtime = trt.Runtime(self.logger)
        
        # โหลด Engine
        with open(engine_path, 'rb') as f:
            self.engine = self.runtime.deserialize_cuda_engine(f.read())
        
        self.context = self.engine.create_execution_context()
        
        # จัดสรรหน่วยความจำ
        self.inputs = []
        self.outputs = []
        self.bindings = []
        
        for binding in self.engine:
            size = trt.volume(self.engine.get_binding_shape(binding))
            dtype = trt.nptype(self.engine.get_binding_dtype(binding))
            
            # จัดสรรหน่วยความจำ
            host_mem = cuda.pagelocked_empty(size, dtype)
            device_mem = cuda.mem_alloc(host_mem.nbytes)
            
            self.bindings.append(int(device_mem))
            
            if self.engine.binding_is_input(binding):
                self.inputs.append({'host': host_mem, 'device': device_mem})
            else:
                self.outputs.append({'host': host_mem, 'device': device_mem})
    
    def infer(self, image):
        # Preprocessing
        input_image = cv2.resize(image, (640, 640))
        input_image = input_image.transpose(2, 0, 1)  # HWC -> CHW
        input_image = input_image.astype(np.float32) / 255.0
        input_image = np.expand_dims(input_image, axis=0)
        
        # Copy input to device
        np.copyto(self.inputs[0]['host'], input_image.ravel())
        cuda.memcpy_htod(self.inputs[0]['device'], self.inputs[0]['host'])
        
        # Run inference
        self.context.execute_v2(bindings=self.bindings)
        
        # Copy output to host
        cuda.memcpy_dtoh(self.outputs[0]['host'], self.outputs[0]['device'])
        
        return self.outputs[0]['host']

# ===== คลาสหลัก Smart Bin =====
class SmartBinDetector:
    def __init__(self):
        print("🚀 เริ่มต้นระบบ Smart Bin...")
        
        # เปิดกล้อง
        self.cap = cv2.VideoCapture(CAMERA_ID)
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
        
        if not self.cap.isOpened():
            raise Exception("❌ ไม่สามารถเปิดกล้องได้")
        
        print("✅ เปิดกล้อง Rapoo สำเร็จ")
        
        # เชื่อมต่อ Serial กับ ESP32
        try:
            self.serial = serial.Serial(SERIAL_PORT, SERIAL_BAUD, timeout=1)
            time.sleep(2)  # รอให้ Serial พร้อม
            print("✅ เชื่อมต่อ ESP32 สำเร็จ")
        except Exception as e:
            print(f"⚠️ ไม่สามารถเชื่อมต่อ ESP32: {e}")
            self.serial = None
        
        # โหลด TensorRT Model
        print("📦 กำลังโหลด YOLOv11m-seg TensorRT Engine...")
        self.model = TRTInference(MODEL_PATH)
        print("✅ โหลด Model สำเร็จ")
        
        # สถิติ
        self.detection_count = {
            'plastic': 0,
            'metal': 0,
            'glass': 0,
            'paper': 0
        }
        
        self.last_detection = None
        self.last_send_time = 0
    
    def process_detections(self, outputs, frame):
        """ประมวลผลการตรวจจับ"""
        detections = []
        
        # Parse YOLO output (ปรับตามโครงสร้าง output ของ model)
        # สมมติว่า output เป็น [batch, num_detections, 6]
        # [x, y, w, h, confidence, class_id]
        
        for detection in outputs:
            confidence = detection[4]
            if confidence > CONFIDENCE_THRESHOLD:
                class_id = int(detection[5])
                if class_id in WASTE_CLASSES:
                    x, y, w, h = detection[:4]
                    waste_type = WASTE_CLASSES[class_id]
                    
                    detections.append({
                        'type': waste_type,
                        'confidence': confidence,
                        'bbox': (x, y, w, h)
                    })
                    
                    # วาดกรอบ
                    color = COLORS[waste_type]
                    cv2.rectangle(frame, (int(x), int(y)), 
                                (int(x+w), int(y+h)), color, 2)
                    
                    # ใส่ข้อความ
                    label = f"{waste_type}: {confidence:.2f}"
                    cv2.putText(frame, label, (int(x), int(y)-10),
                              cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
        
        return detections, frame
    
    def send_to_esp32(self, waste_type):
        """ส่งคำสั่งไปยัง ESP32 เพื่อเปิดฝา"""
        if self.serial is None:
            return
        
        try:
            # ส่งคำสั่งเป็น JSON
            command = f"OPEN:{waste_type}\n"
            self.serial.write(command.encode())
            print(f"📤 ส่งคำสั่งไปยัง ESP32: {command.strip()}")
            
            # รอ response
            time.sleep(0.1)
            if self.serial.in_waiting > 0:
                response = self.serial.readline().decode().strip()
                print(f"📥 Response จาก ESP32: {response}")
        
        except Exception as e:
            print(f"❌ Error ส่งข้อมูลไปยัง ESP32: {e}")
    
    def run(self):
        """รันระบบหลัก"""
        print("\n" + "="*50)
        print("🗑️  Smart Bin Detection System เริ่มทำงาน")
        print("="*50)
        print("กด 'q' เพื่อออก\n")
        
        frame_count = 0
        fps_start_time = time.time()
        fps = 0
        
        while True:
            ret, frame = self.cap.read()
            if not ret:
                print("❌ ไม่สามารถอ่านภาพจากกล้องได้")
                break
            
            # Inference
            outputs = self.model.infer(frame)
            
            # ประมวลผลการตรวจจับ
            detections, frame = self.process_detections(outputs, frame)
            
            # ถ้าตรวจพบขยะ
            if detections:
                # เลือกขยะที่มี confidence สูงสุด
                best_detection = max(detections, key=lambda x: x['confidence'])
                waste_type = best_detection['type']
                
                # ถ้าเป็นขยะประเภทใหม่ หรือผ่านไป 3 วินาที
                current_time = time.time()
                if (self.last_detection != waste_type or 
                    current_time - self.last_send_time > 3):
                    
                    print(f"\n🎯 ตรวจพบ: {waste_type.upper()} "
                          f"(Confidence: {best_detection['confidence']:.2%})")
                    
                    # ส่งคำสั่งไปยัง ESP32
                    self.send_to_esp32(waste_type)
                    
                    # อัพเดทสถิติ
                    self.detection_count[waste_type] += 1
                    self.last_detection = waste_type
                    self.last_send_time = current_time
            
            # คำนวณ FPS
            frame_count += 1
            if frame_count >= 30:
                fps = 30 / (time.time() - fps_start_time)
                fps_start_time = time.time()
                frame_count = 0
            
            # แสดงข้อมูลบนหน้าจอ
            cv2.putText(frame, f"FPS: {fps:.1f}", (10, 30),
                       cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
            
            # แสดงสถิติ
            y_offset = 70
            for waste_type, count in self.detection_count.items():
                text = f"{waste_type}: {count}"
                cv2.putText(frame, text, (10, y_offset),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.6, 
                           COLORS[waste_type], 2)
                y_offset += 30
            
            # แสดงผล
            cv2.imshow('Smart Bin - Waste Detection', frame)
            
            # กด 'q' เพื่อออก
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
        
        # ปิดการทำงาน
        self.cleanup()
    
    def cleanup(self):
        """ปิดการทำงาน"""
        print("\n🛑 ปิดระบบ...")
        self.cap.release()
        if self.serial:
            self.serial.close()
        cv2.destroyAllWindows()
        print("✅ ปิดระบบเรียบร้อย")

# ===== Main =====
if __name__ == "__main__":
    try:
        detector = SmartBinDetector()
        detector.run()
    except KeyboardInterrupt:
        print("\n⚠️ ถูกยกเลิกโดยผู้ใช้")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
