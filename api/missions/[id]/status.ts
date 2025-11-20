import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, verifyAuth } from '../../_supabase';

// Map mission status to delivery status
function mapStatusToDeliveryStatus(status: string): 'pending' | 'confirmed' | 'in_flight' | 'arrived' | 'delivered' | 'cancelled' {
  switch (status) {
    case 'pending': return 'pending';
    case 'assigned': return 'confirmed';
    case 'in-flight': return 'in_flight';
    case 'completed': return 'delivered';
    case 'failed': return 'cancelled';
    default: return 'pending';
  }
}

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

    const { id } = req.query;
    const { status } = req.body;

    if (typeof id !== 'string') {
      return res.status(400).json({ error: "Invalid mission ID" });
    }

    if (!status) {
      return res.status(400).json({ error: "status is required" });
    }

    const deliveryStatus = mapStatusToDeliveryStatus(status);
    
    const updateData: any = {
      status: deliveryStatus,
      updated_at: new Date().toISOString(),
    };

    // If completed, set completed_at
    if (deliveryStatus === 'delivered') {
      updateData.completed_at = new Date().toISOString();
    }

    // Update delivery status in Supabase
    const { data, error } = await supabase
      .from('deliveries')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: "mission not found" });
    }

    // If mission is completed and has an operator, add points
    if (deliveryStatus === 'delivered' && data.operator_id) {
      try {
        // Get delivery points cost
        const pointsCost = data.points_cost || 100;
        
        // Add points to operator's profile
        await supabase.rpc('add_points', {
          _user_id: data.operator_id,
          _points: pointsCost,
        });

        // Log the earnings
        await supabase.from('logs').insert({
          log_type: 'earnings',
          message: `Operator ${data.operator_id} earned ${pointsCost} points for delivery ${id}`,
          user_id: data.operator_id,
          delivery_id: id,
          severity: 'info',
        });

        console.log(`[Mission ${id}] Operator ${data.operator_id} earned ${pointsCost} points`);
      } catch (error) {
        console.error("[Mission] Failed to process earnings", error);
      }
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
      status: status,
      operatorId: data.operator_id || undefined,
    };

    res.json(mission);
  } catch (error: any) {
    console.error('[API] Error updating mission status:', error);
    res.status(500).json({ error: error.message || 'Failed to update mission status' });
  }
}

