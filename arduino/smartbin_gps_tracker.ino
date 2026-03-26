/*
 * Smart Bin GPS Tracker with ATGM336H-5N
 * สำหรับส่งข้อมูลตำแหน่ง GPS ไปยัง Backend Server
 * 
 * Hardware:
 * - ESP32
 * - GPS Module ATGM336H-5N
 * - Ultrasonic Sensor HC-SR04 (วัดระดับขยะ)
 * 
 * การต่อสาย:
 * GPS Module:
 *   VCC → 3.3V
 *   GND → GND
 *   TX  → GPIO 16 (RX2)
 *   RX  → GPIO 17 (TX2)
 * 
 * Ultrasonic Sensor:
 *   VCC  → 5V
 *   GND  → GND
 *   TRIG → GPIO 5
 *   ECHO → GPIO 18
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <TinyGPS++.h>

// ===== ตั้งค่า WiFi =====
const char* ssid = "YOUR_WIFI_NAME";        // ชื่อ WiFi
const char* password = "YOUR_WIFI_PASSWORD"; // รหัส WiFi

// ===== ตั้งค่า Server =====
const char* serverUrl = "http://192.168.1.100:3000/api/gps/update"; // เปลี่ยนเป็น IP ของคอมพิวเตอร์

// ===== ตั้งค่าถังขยะ =====
const int BIN_ID = 1;                       // รหัสถังขยะ (เปลี่ยนตามถังที่ติดตั้ง)
const String BIN_NAME = "ถังขยะ #001";     // ชื่อถังขยะ
const String LOCATION_NAME = "ลานพญาศรีสัตตนาคราช"; // ชื่อสถานที่

// ===== ตั้งค่า GPS =====
TinyGPSPlus gps;
HardwareSerial GPS_Serial(2); // ใช้ Serial2 (RX=16, TX=17)

// ===== ตั้งค่า Ultrasonic Sensor =====
const int TRIG_PIN = 5;
const int ECHO_PIN = 18;
const int BIN_HEIGHT = 100; // ความสูงถังขยะ (cm)

// ===== ตัวแปรสถานะ =====
unsigned long lastSendTime = 0;
const unsigned long SEND_INTERVAL = 5000; // ส่งข้อมูลทุก 5 วินาที
bool wifiConnected = false;

void setup() {
  Serial.begin(115200);
  GPS_Serial.begin(9600, SERIAL_8N1, 16, 17); // RX=16, TX=17
  
  // ตั้งค่า Ultrasonic
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  
  Serial.println("\n=================================");
  Serial.println("Smart Bin GPS Tracker");
  Serial.println("=================================");
  
  // เชื่อมต่อ WiFi
  connectWiFi();
}

void loop() {
  // อ่านข้อมูล GPS
  while (GPS_Serial.available() > 0) {
    gps.encode(GPS_Serial.read());
  }
  
  // ตรวจสอบว่าได้ตำแหน่ง GPS แล้ว
  if (gps.location.isUpdated()) {
    unsigned long currentTime = millis();
    
    // ส่งข้อมูลทุก 5 วินาที
    if (currentTime - lastSendTime >= SEND_INTERVAL) {
      lastSendTime = currentTime;
      
      // อ่านข้อมูล
      double latitude = gps.location.lat();
      double longitude = gps.location.lng();
      int fillLevel = readFillLevel();
      int satellites = gps.satellites.value();
      double speed = gps.speed.kmph();
      
      // แสดงข้อมูลใน Serial Monitor
      printGPSData(latitude, longitude, fillLevel, satellites, speed);
      
      // ส่งข้อมูลไปยัง Server
      if (wifiConnected) {
        sendDataToServer(latitude, longitude, fillLevel, satellites, speed);
      }
    }
  }
  
  // แสดงสถานะรอ GPS
  if (millis() > 5000 && gps.charsProcessed() < 10) {
    Serial.println("⚠️ ไม่พบสัญญาณ GPS - ตรวจสอบการต่อสาย");
    delay(1000);
  }
}

// ===== ฟังก์ชันเชื่อมต่อ WiFi =====
void connectWiFi() {
  Serial.print("🔌 กำลังเชื่อมต่อ WiFi: ");
  Serial.println(ssid);
  
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    Serial.println("\n✅ เชื่อมต่อ WiFi สำเร็จ!");
    Serial.print("📡 IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    wifiConnected = false;
    Serial.println("\n❌ เชื่อมต่อ WiFi ไม่สำเร็จ");
  }
}

// ===== ฟังก์ชันอ่านระดับขยะ =====
int readFillLevel() {
  // ส่งสัญญาณ Ultrasonic
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  
  // อ่านระยะทาง
  long duration = pulseIn(ECHO_PIN, HIGH);
  int distance = duration * 0.034 / 2; // แปลงเป็น cm
  
  // คำนวณเปอร์เซ็นต์
  int fillLevel = 100 - ((distance * 100) / BIN_HEIGHT);
  
  // จำกัดค่า 0-100
  if (fillLevel < 0) fillLevel = 0;
  if (fillLevel > 100) fillLevel = 100;
  
  return fillLevel;
}

// ===== ฟังก์ชันแสดงข้อมูล GPS =====
void printGPSData(double lat, double lng, int fill, int sats, double spd) {
  Serial.println("\n─────────────────────────────────");
  Serial.print("📍 ตำแหน่ง: ");
  Serial.print(lat, 8);
  Serial.print(", ");
  Serial.println(lng, 8);
  Serial.print("🗑️  ระดับขยะ: ");
  Serial.print(fill);
  Serial.println("%");
  Serial.print("🛰️  ดาวเทียม: ");
  Serial.println(sats);
  Serial.print("🚗 ความเร็ว: ");
  Serial.print(spd);
  Serial.println(" km/h");
  Serial.println("─────────────────────────────────");
}

// ===== ฟังก์ชันส่งข้อมูลไปยัง Server =====
void sendDataToServer(double lat, double lng, int fill, int sats, double spd) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi ไม่ได้เชื่อมต่อ");
    connectWiFi();
    return;
  }
  
  HTTPClient http;
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");
  
  // สร้าง JSON
  String jsonData = "{";
  jsonData += "\"bin_id\":" + String(BIN_ID) + ",";
  jsonData += "\"bin_name\":\"" + BIN_NAME + "\",";
  jsonData += "\"lat\":" + String(lat, 8) + ",";
  jsonData += "\"lng\":" + String(lng, 8) + ",";
  jsonData += "\"fill_level\":" + String(fill) + ",";
  jsonData += "\"location_name\":\"" + LOCATION_NAME + "\",";
  jsonData += "\"satellites\":" + String(sats) + ",";
  jsonData += "\"speed\":" + String(spd, 2);
  jsonData += "}";
  
  Serial.println("📤 ส่งข้อมูล: " + jsonData);
  
  int httpResponseCode = http.POST(jsonData);
  
  if (httpResponseCode > 0) {
    Serial.print("✅ ส่งสำเร็จ - Response code: ");
    Serial.println(httpResponseCode);
    String response = http.getString();
    Serial.println("📥 Response: " + response);
  } else {
    Serial.print("❌ ส่งไม่สำเร็จ - Error: ");
    Serial.println(httpResponseCode);
  }
  
  http.end();
}
