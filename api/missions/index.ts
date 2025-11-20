import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, verifyAuth } from '../_supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    try {
      // Get all deliveries (missions) from Supabase
      const { data, error } = await supabase
        .from('deliveries')
        .select('*')
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
                delivery.status === 'in_flight' ? 'in-flight' :
                delivery.status === 'delivered' ? 'completed' : 'failed',
        operatorId: delivery.operator_id || undefined,
      }));

      res.json(missions);
    } catch (error: any) {
      console.error('[API] Error fetching missions:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch missions' });
    }
    return;
  }

  if (req.method === 'POST') {
    try {
      const authHeader = req.headers.authorization;
      const { userId, error: authError } = await verifyAuth(authHeader);
      
      if (authError || !userId) {
        return res.status(401).json({ error: authError || 'Unauthorized' });
      }

      const payload = req.body;
      if (!payload.pickup || !payload.dropoff) {
        return res.status(400).json({ error: "pickup and dropoff are required" });
      }

      // Create delivery in Supabase
      const { data, error } = await supabase
        .from('deliveries')
        .insert({
          client_id: userId,
          pickup_location: payload.pickup,
          dropoff_location: payload.dropoff,
          pickup_lat: payload.pickupLat || 14.7167,
          pickup_lng: payload.pickupLng || -17.4677,
          dropoff_lat: payload.dropoffLat || 14.7167,
          dropoff_lng: payload.dropoffLng || -17.4677,
          package_note: payload.packageDetails || '',
          status: 'pending',
          estimated_time: payload.etaMinutes || 30,
        })
        .select()
        .single();

      if (error) throw error;

      // Transform to mission format
      const mission = {
        id: data.id,
        clientName: data.client_id,
        pickup: data.pickup_location,
        dropoff: data.dropoff_location,
        priority: payload.priority || 'standard',
        packageDetails: data.package_note || '',
        etaMinutes: data.estimated_time || 30,
        createdAt: data.created_at,
        status: 'pending',
      };

      res.status(201).json(mission);
    } catch (error: any) {
      console.error('[API] Error creating mission:', error);
      res.status(500).json({ error: error.message || 'Failed to create mission' });
    }
    return;
  }

  res.setHeader('Allow', ['GET', 'POST', 'OPTIONS']);
  res.status(405).json({ error: 'Method not allowed' });
}

