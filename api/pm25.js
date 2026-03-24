export default function handler(req, res) {
  const mockData = {
    station: "Nakhon Phanom City Hall",
    timestamp: new Date().toISOString(),
    aqi: Math.floor(Math.random() * 80) + 15,
    pm25: parseFloat((Math.random() * 40 + 5).toFixed(2)),
    status: "Good",
    recommendation: "คุณภาพอากาศดีเยี่ยม เหมาะกับการทำกิจกรรมกลางแจ้ง"
  };
  res.status(200).json(mockData);
}
