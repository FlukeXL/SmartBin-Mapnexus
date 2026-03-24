export default function handler(req, res) {
  res.status(200).json([
    { id: 1, title: "งานประเพณีไหลเรือไฟ", date: "2026-10-25", location: "ริมฝั่งโขง" },
    { id: 2, title: "เทศกาลปั่นจักรยานริมโขง", date: "2026-05-15", location: "หอนาฬิกาเวียดนามอนุสรณ์" }
  ]);
}
