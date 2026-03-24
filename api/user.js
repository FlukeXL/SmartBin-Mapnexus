export default function handler(req, res) {
  res.status(200).json({ 
    id: "user_123", 
    name: "นักสำรวจนครพนม", 
    level: 5, 
    xp: 650, 
    next_level_xp: 1000 
  });
}
