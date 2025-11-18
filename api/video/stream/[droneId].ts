import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { droneId } = req.query;

  if (typeof droneId !== 'string') {
    return res.status(400).json({ error: "Invalid drone ID" });
  }

  // Return stream URL configuration
  const videoUrl = process.env[`VIDEO_URL_${droneId}`] || 
                   `rtsp://localhost:8554/${droneId}`;

  res.json({
    droneId,
    streamUrl: videoUrl,
    type: "rtsp",
    status: "active"
  });
}

