import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, verifyAuth } from '../../../_supabase';

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

    // Check environment variable for video URL (format: VIDEO_URL_drone-001)
    const envVideoUrl = process.env[`VIDEO_URL_${droneId}`] || 
                        process.env[`VIDEO_URL_${droneId.replace(/-/g, '_')}`];

    // Priority: Database > Environment Variable > Default MJPEG feed
    let streamUrl = drone?.camera_stream_url || envVideoUrl;
    let streamType = 'http';
    
    // If no URL specified, use Jetson MJPEG feed (always available, non-censored)
    if (!streamUrl) {
      const JETSON_IP = process.env.JETSON_IP || '172.24.237.66';
      const JETSON_PORT = process.env.JETSON_PORT || '5000';
      streamUrl = `http://${JETSON_IP}:${JETSON_PORT}/video_feed`;
      streamType = 'mjpeg';
    }
    // If RTSP, try to convert to HTTP HLS (assuming Jetson converts it)
    else if (streamUrl.startsWith('rtsp://')) {
      const rtspMatch = streamUrl.match(/rtsp:\/\/([^:]+):(\d+)\/(.+)/);
      if (rtspMatch) {
        const [, host, , path] = rtspMatch;
        // Try HLS conversion first
        streamUrl = `http://${host}:5000/hls/${path}.m3u8`;
        streamType = 'hls';
      }
    }
    // If it's the MJPEG feed endpoint
    else if (streamUrl.includes('/video_feed')) {
      streamType = 'mjpeg';
    }
    // Determine type from URL
    else if (streamUrl.includes('.m3u8')) {
      streamType = 'hls';
    } else if (streamUrl.startsWith('rtsp://')) {
      streamType = 'rtsp';
    }

    res.json({
      droneId,
      streamUrl,
      type: streamType,
      status: drone?.is_active ? 'active' : 'inactive',
    });
  } catch (error: any) {
    console.error('[API] Error fetching video stream:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch video stream' });
  }
}

