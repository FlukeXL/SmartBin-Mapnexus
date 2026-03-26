/*
 * Smart Bin - ESP32 Complete System
 * รับคำสั่งจาก Jetson Nano + ควบคุม Servo + อ่าน GPS + Ultrasonic
 * ส่งข้อมูลไปยัง Backend Server แบบ Real-time
 * 
 * Hardware:
 * - ESP32
 * - GPS Module ATGM336H-5N
 * - Ultrasonic Sensor HC-SR04
 * - Servo Motor (4 ตัว สำหรับแต่ละประเภทขยะ)
 * - Jetson Nano (เชื่อมต่อผ่าน UART)
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <TinyGPS++.h>
#include <ESP32Servo.h>

// ===== WiFi Configuration =====
const char* ssid = "YOUR_WIFI_NAME";        // เปลี่ยนเป็นชื่อ WiFi ของคุณ
const char* password = "YOUR_WIFI_PASSWORD"; // เปลี่ยนเป็นรหัส WiFi ของคุณ

// ===== Server Configuration =====
const char* serverUrl = "http://192.168.1.100:3000/api/smartbin/1"; // เปลี่ยน IP เป็นของคุณ

// ===== Bin Configuration =====
const int BIN_ID = 1;
const String BIN_NAME = "ถังขยะอัจฉริยะ #001";
const String LOCATION_NAME = "ลานพญาศรีสัตตนาคราช";

// ===== GPS Configuration =====
TinyGPSPlus gps;
HardwareSerial GPS_Serial(2); // Serial2 (RX=16, TX=17)

// ===== Ultrasonic Configuration =====
const int TRIG_PIN = 5;
const int ECHO_PIN = 18;
const int BIN_HEIGHT = 60; // ความสูงถัง (cm) - ระยะ Detect 60cm

// ===== Servo Configuration =====
Servo servoPlastic;  // Servo สำหรับ Plastic
Servo servoMetal;    // Servo สำหรับ Metal
Servo servoGlass;    // Servo สำหรับ Glass
Servo servoPaper;    // Servo สำหรับ Paper

const int SERVO_PLASTIC_PIN = 12;
const int SERVO_METAL_PIN = 13;
const int SERVO_GLASS_PIN = 14;
const int SERVO_PAPER_PIN = 27;

const int SERVO_OPEN_ANGLE = 180;  // มุมเปิด (180 องศา - เปิดเต็มที่)
const int SERVO_CLOSE_ANGLE = 0;   // มุมปิด (0 องศา)
const int SERVO_OPEN_TIME = 3000;  // เวลาเปิด (ms)

// ===== Jetson Communication =====
HardwareSerial Jetson_Serial(1); // Serial1 (RX=25, TX=26)

// ===== Variables =====
unsigned long lastGPSSendTime = 0;
const unsigned long GPS_SEND_INTERVAL = 5000; // ส่ง GPS ทุก 5 วินาที

double currentLat = 0.0;
double currentLng = 0.0;
int currentFillLevel = 0;
int satelliteCount = 0;

// สถิติการทิ้งขยะ
int wasteCount[4] = {0, 0, 0, 0}; // plastic, metal, glass, paper

bool wifiConnected = false;

void setup() {
  Serial.begin(115200);
  GPS_Serial.begin(9600, SERIAL_8N1, 16, 17);
  Jetson_Serial.begin(115200, SERIAL_8N1, 25, 26);
  
  Serial.println("\n========================================");
  Serial.println("🗑️  Smart Bin ESP32 - Complete System");
  Serial.println("========================================\n");
  
  // ตั้งค่า Ultrasonic
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  
  // ตั้งค่า Servo
  servoPlastic.attach(SERVO_PLASTIC_PIN);
  servoMetal.attach(SERVO_METAL_PIN);
  servoGlass.attach(SERVO_GLASS_PIN);
  servoPaper.attach(SERVO_PAPER_PIN);
  
  // ปิดฝาทั้งหมด
  closeAllServos();
  
  // เชื่อมต่อ WiFi
  connectWiFi();
  
  Serial.println("✅ ระบบพร้อมทำงาน\n");
  Serial.println("📍 Ultrasonic: วัดระยะ 60cm");
  Serial.println("📍 GPS: รอสัญญาณดาวเทียม...\n");
}

void loop() {
  // 1. อ่านข้อมูล GPS
  while (GPS_Serial.available() > 0) {
    gps.encode(GPS_Serial.read());
  }
  
  // 2. รับคำสั่งจาก Jetson Nano
  if (Jetson_Serial.available() > 0) {
    String command = Jetson_Serial.readStringUntil('\n');
    command.trim();
    handleJetsonCommand(command);
  }
  
  // 3. ส่งข้อมูล GPS แบบ Real-time
  if (gps.location.isUpdated()) {
    currentLat = gps.location.lat();
    currentLng = gps.location.lng();
    satelliteCount = gps.satellites.value();
    
    unsigned long currentTime = millis();
    if (currentTime - lastGPSSendTime >= GPS_SEND_INTERVAL) {
      lastGPSSendTime = currentTime;
      
      // อ่านระดับขยะจาก Ultrasonic
      currentFillLevel = readFillLevel();
      
      // แสดงข้อมูล GPS และระดับขยะ
      printGPSData();
      
      // ส่งข้อมูลไปยัง Server
      sendDataToServer();
    }
  }
  
  // 4. ตรวจสอบสถานะ GPS
  if (millis() > 5000 && gps.charsProcessed() < 10) {
    Serial.println("⚠️ ไม่พบสัญญาณ GPS - ตรวจสอบการต่อสาย");
    delay(2000);
  }
  
  // 5. แสดงจำนวนดาวเทียมและระดับขยะ
  static unsigned long lastStatusPrint = 0;
  if (millis() - lastStatusPrint > 3000) {
    lastStatusPrint = millis();
    if (gps.satellites.isValid()) {
      Serial.print("🛰️  ดาวเทียม: ");
      Serial.print(gps.satellites.value());
      Serial.print(" ดวง | ");
    }
    Serial.print("🗑️  ระดับขยะ: ");
    Serial.print(readFillLevel());
    Serial.println("%");
  }
}

// ===== ฟังก์ชันจัดการคำสั่งจาก Jetson =====
void handleJetsonCommand(String command) {
  Serial.println("📥 รับคำสั่งจาก Jetson: " + command);
  
  // คำสั่งรูปแบบ: OPEN:plastic, OPEN:metal, OPEN:glass, OPEN:paper
  if (command.startsWith("OPEN:")) {
    String wasteType = command.substring(5);
    wasteType.toLowerCase();
    
    if (wasteType == "plastic") {
      openServo(servoPlastic, "Plastic");
      wasteCount[0]++;
    }
    else if (wasteType == "metal") {
      openServo(servoMetal, "Metal");
      wasteCount[1]++;
    }
    else if (wasteType == "glass") {
      openServo(servoGlass, "Glass");
      wasteCount[2]++;
    }
    else if (wasteType == "paper") {
      openServo(servoPaper, "Paper");
      wasteCount[3]++;
    }
    else {
      Serial.println("❌ ประเภทขยะไม่ถูกต้อง: " + wasteType);
      Jetson_Serial.println("ERROR:INVALID_TYPE");
      return;
    }
    
    // ส่ง response กลับไปยัง Jetson
    Jetson_Serial.println("OK:" + wasteType);
    
    // ส่งข้อมูลอัพเดทไปยัง Server ทันที
    sendDataToServer();
  }
}

// ===== ฟังก์ชันเปิด Servo =====
void openServo(Servo &servo, String type) {
  Serial.println("🚪 เปิดฝา: " + type);
  
  // เปิดฝา
  servo.write(SERVO_OPEN_ANGLE);
  delay(SERVO_OPEN_TIME);
  
  // ปิดฝา
  servo.write(SERVO_CLOSE_ANGLE);
  
  Serial.println("✅ ปิดฝา: " + type);
}

// ===== ฟังก์ชันปิดฝาทั้งหมด =====
void closeAllServos() {
  servoPlastic.write(SERVO_CLOSE_ANGLE);
  servoMetal.write(SERVO_CLOSE_ANGLE);
  servoGlass.write(SERVO_CLOSE_ANGLE);
  servoPaper.write(SERVO_CLOSE_ANGLE);
  Serial.println("🔒 ปิดฝาทั้งหมด");
}

// ===== ฟังก์ชันอ่านระดับขยะ =====
int readFillLevel() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  
  long duration = pulseIn(ECHO_PIN, HIGH);
  int distance = duration * 0.034 / 2;
  
  int fillLevel = 100 - ((distance * 100) / BIN_HEIGHT);
  
  if (fillLevel < 0) fillLevel = 0;
  if (fillLevel > 100) fillLevel = 100;
  
  return fillLevel;
}

// ===== ฟังก์ชันเชื่อมต่อ WiFi =====
void connectWiFi() {
  Serial.print("🔌 เชื่อมต่อ WiFi: ");
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
  Serial.println();
}

// ===== ฟังก์ชันแสดงข้อมูล GPS =====
void printGPSData() {
  Serial.println("╔════════════════════════════════════════╗");
  Serial.println("║         📍 ข้อมูลระบบ                  ║");
  Serial.println("╠════════════════════════════════════════╣");
  
  Serial.print("║ Latitude:  ");
  Serial.print(currentLat, 8);
  Serial.println("        ║");
  
  Serial.print("║ Longitude: ");
  Serial.print(currentLng, 8);
  Serial.println("        ║");
  
  Serial.print("║ ดาวเทียม:  ");
  Serial.print(satelliteCount);
  Serial.println(" ดวง                      ║");
  
  Serial.print("║ ระดับขยะ: ");
  Serial.print(currentFillLevel);
  Serial.println("%                       ║");
  
  Serial.print("║ ความเร็ว:  ");
  Serial.print(gps.speed.kmph(), 1);
  Serial.println(" km/h                 ║");
  
  Serial.println("╚════════════════════════════════════════╝\n");
}

// ===== ฟังก์ชันส่งข้อมูลไปยัง Server =====
void sendDataToServer() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi ไม่ได้เชื่อมต่อ");
    connectWiFi();
    return;
  }
  
  HTTPClient http;
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");
  
  // สร้าง JSON สำหรับ PUT request
  String jsonData = "{";
  jsonData += "\"latitude\":" + String(currentLat, 8) + ",";
  jsonData += "\"longitude\":" + String(currentLng, 8) + ",";
  jsonData += "\"fill_level\":" + String(currentFillLevel) + ",";
  jsonData += "\"status\":\"active\",";
  jsonData += "\"temperature\":32.5,";
  jsonData += "\"battery_level\":95";
  jsonData += "}";
  
  Serial.println("📤 ส่งข้อมูลไป Server...");
  Serial.println("   " + jsonData);
  
  int httpResponseCode = http.PUT(jsonData);
  
  if (httpResponseCode > 0) {
    Serial.print("✅ ส่งสำเร็จ! Response Code: ");
    Serial.println(httpResponseCode);
    
    if (httpResponseCode == 200) {
      String response = http.getString();
      Serial.println("📥 Response: " + response);
    }
  } else {
    Serial.print("❌ ส่งไม่สำเร็จ! Error Code: ");
    Serial.println(httpResponseCode);
    Serial.println("   ตรวจสอบ:");
    Serial.println("   - Server รันอยู่หรือไม่");
    Serial.println("   - IP Address ถูกต้องหรือไม่");
  }
  
  http.end();
  Serial.println("─────────────────────────────────────────\n");
}
