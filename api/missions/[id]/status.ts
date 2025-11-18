import type { VercelRequest, VercelResponse } from '@vercel/node';
import { missionStore } from '../../_missionStore';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  const { status } = req.body;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: "Invalid mission ID" });
  }

  const mission = missionStore.updateStatus(id, status as any);
  if (!mission) {
    return res.status(404).json({ error: "mission not found" });
  }

  // If mission is completed and has an operator, calculate earnings
  if (status === "completed" && mission.operatorId) {
    try {
      const baseRate = 10.0;
      const sizeMultiplier = mission.packageDetails?.includes("large") ? 2.0 : 
                            mission.packageDetails?.includes("small") ? 1.0 : 1.5;
      const weightMatch = mission.packageDetails?.match(/(\d+(?:\.\d+)?)kg/);
      const weight = weightMatch ? parseFloat(weightMatch[1]) : 2;
      const weightMultiplier = Math.max(1.0, weight / 2.0);
      const amount = baseRate * sizeMultiplier * weightMultiplier;
      
      console.log(`[Mission ${id}] Earnings calculated: $${amount.toFixed(2)} for operator ${mission.operatorId}`);
    } catch (error) {
      console.error("[Mission] Failed to calculate earnings", error);
    }
  }

  res.json(mission);
}

