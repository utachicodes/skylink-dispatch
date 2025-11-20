import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, verifyAuth } from './_supabase';

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

    const { droneId, type, payload } = req.body;

    if (!droneId || !type) {
      return res.status(400).json({ error: "droneId and type are required" });
    }

    // Verify drone exists
    const { data: drone, error: droneError } = await supabase
      .from('drones')
      .select('*')
      .eq('id', droneId)
      .single();

    if (droneError || !drone) {
      return res.status(404).json({ error: "Drone not found" });
    }

    // Log the command
    await supabase.from('logs').insert({
      log_type: 'command',
      message: `Command ${type} sent to drone ${droneId}`,
      user_id: userId,
      drone_id: droneId,
      severity: type === 'PAUSE' || type === 'RETURN_TO_BASE' ? 'warning' : 'info',
    });

    // Handle different command types
    switch (type) {
      case 'PAUSE':
        // Update drone status or delivery status
        await supabase
          .from('deliveries')
          .update({ status: 'confirmed' })
          .eq('drone_id', droneId)
          .in('status', ['in_flight']);
        break;

      case 'RESUME':
        // Resume flight
        await supabase
          .from('deliveries')
          .update({ status: 'in_flight' })
          .eq('drone_id', droneId)
          .eq('status', 'confirmed');
        break;

      case 'RETURN_TO_BASE':
        // Update delivery to return status
        await supabase
          .from('deliveries')
          .update({ status: 'cancelled' })
          .eq('drone_id', droneId)
          .in('status', ['in_flight', 'confirmed']);
        break;

      case 'LAND':
        // Land drone and mark delivery as arrived
        await supabase
          .from('deliveries')
          .update({ status: 'arrived' })
          .eq('drone_id', droneId)
          .in('status', ['in_flight']);
        break;

      case 'CUSTOM':
        // Handle custom commands (manual override, etc.)
        if (payload?.mode === 'MANUAL_OVERRIDE') {
          // Log manual control
          await supabase.from('logs').insert({
            log_type: 'manual_control',
            message: `Manual override active for drone ${droneId}`,
            user_id: userId,
            drone_id: droneId,
            severity: 'warning',
          });
        }
        break;
    }

    res.json({ 
      status: "accepted",
      command: type,
      droneId,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[API] Error processing command:', error);
    res.status(500).json({ error: error.message || 'Failed to process command' });
  }
}

