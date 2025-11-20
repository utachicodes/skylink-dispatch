import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../_supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET', 'OPTIONS']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get latest tracking data for all active drones
    const { data: drones, error: dronesError } = await supabase
      .from('drones')
      .select('*')
      .eq('is_active', true);

    if (dronesError) throw dronesError;

    // Get latest tracking data for each drone
    const telemetryFrames = await Promise.all(
      (drones || []).map(async (drone) => {
        const { data: tracking } = await supabase
          .from('drone_tracking')
          .select('*')
          .eq('drone_id', drone.id)
          .order('timestamp', { ascending: false })
          .limit(1)
          .single();

        if (!tracking) {
          // Return default telemetry if no tracking data
          return {
            droneId: drone.id,
            battery: drone.battery_level || 100,
            latitude: drone.current_lat ? Number(drone.current_lat) : 14.7167,
            longitude: drone.current_lng ? Number(drone.current_lng) : -17.4677,
            altitude: 0,
            speed: 0,
            heading: 0,
            signalQuality: drone.gps_signal ? 95 : 0,
            updatedAt: drone.updated_at || new Date().toISOString(),
            status: 'idle',
          };
        }

        return {
          droneId: drone.id,
          battery: tracking.battery_level || drone.battery_level || 100,
          latitude: Number(tracking.latitude),
          longitude: Number(tracking.longitude),
          altitude: tracking.altitude ? Number(tracking.altitude) : 0,
          speed: tracking.speed ? Number(tracking.speed) : 0,
          heading: 0, // Calculate from previous position if needed
          signalQuality: drone.gps_signal ? 95 : 0,
          updatedAt: tracking.timestamp || new Date().toISOString(),
          status: 'active',
        };
      })
    );

    res.json(telemetryFrames);
  } catch (error: any) {
    console.error('[API] Error fetching telemetry:', error);
    // Return empty array on error to prevent frontend crashes
    res.json([]);
  }
}

