export default function handler(req, res) {
  res.status(200).json({ 
    location: "ลานพญาศรีสัตตนาคราช", 
    crowd_level: "Moderate", 
    count: Math.floor(Math.random() * 200) + 50 
  });
}
