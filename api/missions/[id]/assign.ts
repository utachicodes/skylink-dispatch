import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, verifyAuth, getUserRole } from '../../_supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST', 'OPTIONS']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    const { userId, error: authError } = await verifyAuth(authHeader);
    
    if (authError || !userId) {
      return res.status(401).json({ error: authError || 'Unauthorized' });
    }

    // Verify user is an operator
    const role = await getUserRole(userId);
    if (role !== 'operator' && role !== 'admin') {
      return res.status(403).json({ error: 'Only operators can assign missions' });
    }

    const { id } = req.query;
    const { operatorId } = req.body;

    if (!operatorId) {
      return res.status(400).json({ error: "operatorId is required" });
    }

    if (typeof id !== 'string') {
      return res.status(400).json({ error: "Invalid mission ID" });
    }

    // Update delivery with operator assignment
    const { data, error } = await supabase
      .from('deliveries')
      .update({
        operator_id: operatorId,
        status: 'confirmed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: "mission not found" });
    }

    // Transform to mission format
    const mission = {
      id: data.id,
      clientName: data.client_id || 'Unknown',
      pickup: data.pickup_location,
      dropoff: data.dropoff_location,
      priority: 'standard',
      packageDetails: data.package_note || '',
      etaMinutes: data.estimated_time || 30,
      createdAt: data.created_at,
      status: 'assigned',
      operatorId: data.operator_id || undefined,
    };

    res.json(mission);
  } catch (error: any) {
    console.error('[API] Error assigning mission:', error);
    res.status(500).json({ error: error.message || 'Failed to assign mission' });
  }
}

