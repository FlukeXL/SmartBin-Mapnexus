export default function handler(req, res) {
  res.status(200).json({ status: "success", message: "Check-in successful", xp_gained: 50 });
}
