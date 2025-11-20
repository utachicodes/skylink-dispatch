import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, verifyAuth } from '../../../_supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', ['GET', 'POST', 'OPTIONS']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    const { userId, error: authError } = await verifyAuth(authHeader);
    
    if (authError || !userId) {
      return res.status(401).json({ error: authError || 'Unauthorized' });
    }

    const { droneId } = req.query;

    if (typeof droneId !== 'string') {
      return res.status(400).json({ error: "Invalid drone ID" });
    }

    // Get drone info
    const { data: drone, error: droneError } = await supabase
      .from('drones')
      .select('*')
      .eq('id', droneId)
      .single();

    if (droneError || !drone) {
      return res.status(404).json({ error: "Drone not found" });
    }

    // Return WebRTC connection info
    // In a real implementation, this would negotiate WebRTC signaling
    res.json({
      droneId,
      webrtc: {
        signalingUrl: process.env.WEBRTC_SIGNALING_URL || 'wss://signaling.example.com',
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
        ],
      },
      status: drone.is_active ? 'active' : 'inactive',
    });
  } catch (error: any) {
    console.error('[API] Error fetching WebRTC info:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch WebRTC info' });
  }
}
