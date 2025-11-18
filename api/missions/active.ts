import type { VercelRequest, VercelResponse } from '@vercel/node';
import { missionStore } from '../_missionStore';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    res.json(missionStore.listActive());
    return;
  }

  res.setHeader('Allow', ['GET']);
  res.status(405).json({ error: 'Method not allowed' });
}

