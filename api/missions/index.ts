import type { VercelRequest, VercelResponse } from '@vercel/node';
import { missionStore } from '../_missionStore';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    res.json(missionStore.listAll());
    return;
  }

  if (req.method === 'POST') {
    const payload = req.body;
    if (!payload.pickup || !payload.dropoff) {
      return res.status(400).json({ error: "pickup and dropoff are required" });
    }
    const mission = missionStore.create(payload);
    return res.status(201).json(mission);
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).json({ error: 'Method not allowed' });
}

