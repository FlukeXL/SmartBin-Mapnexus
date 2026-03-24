export default function handler(req, res) {
  res.status(200).json([
    { id: 1, name: "ลานพญาศรีสัตตนาคราช", type: "Landmark", lat: 17.4045, lng: 104.7933 },
    { id: 2, name: "หอนาฬิกาเวียดนามอนุสรณ์", type: "History", lat: 17.4080, lng: 104.7870 }
  ]);
}
