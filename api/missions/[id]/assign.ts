import type { VercelRequest, VercelResponse } from '@vercel/node';
import { missionStore } from '../../_missionStore';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  const { operatorId } = req.body;

  if (!operatorId) {
    return res.status(400).json({ error: "operatorId is required" });
  }

  if (typeof id !== 'string') {
    return res.status(400).json({ error: "Invalid mission ID" });
  }

  const mission = missionStore.assign(id, operatorId);
  if (!mission) {
    return res.status(404).json({ error: "mission not found" });
  }

  res.json(mission);
}

