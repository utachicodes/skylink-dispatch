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

  // WebRTC signaling endpoint (simplified)
  res.json({
    droneId,
    sdpOffer: null,
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" }
    ]
  });
}

