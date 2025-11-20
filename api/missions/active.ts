import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    try {
      // Get active deliveries (pending, confirmed, in_flight)
      const { data, error } = await supabase
        .from('deliveries')
        .select('*')
        .in('status', ['pending', 'confirmed', 'in_flight'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform deliveries to mission format
      const missions = (data || []).map(delivery => ({
        id: delivery.id,
        clientName: delivery.client_id || 'Unknown',
        pickup: delivery.pickup_location,
        dropoff: delivery.dropoff_location,
        priority: delivery.status === 'pending' ? 'standard' : 
                  delivery.status === 'confirmed' ? 'express' : 'critical',
        packageDetails: delivery.package_note || '',
        etaMinutes: delivery.estimated_time || 30,
        createdAt: delivery.created_at,
        status: delivery.status === 'pending' ? 'pending' :
                delivery.status === 'confirmed' ? 'assigned' :
                delivery.status === 'in_flight' ? 'in-flight' : 'pending',
        operatorId: delivery.operator_id || undefined,
      }));

      res.json(missions);
    } catch (error: any) {
      console.error('[API] Error fetching active missions:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch active missions' });
    }
    return;
  }

  res.setHeader('Allow', ['GET', 'OPTIONS']);
  res.status(405).json({ error: 'Method not allowed' });
}

