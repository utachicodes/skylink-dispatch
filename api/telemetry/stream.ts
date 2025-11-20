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

  // Set up Server-Sent Events for streaming telemetry
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const droneId = req.query.droneId as string;

  // Set up Supabase realtime subscription
  const channel = supabase
    .channel(`telemetry-${droneId || 'all'}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'drone_tracking',
        filter: droneId ? `drone_id=eq.${droneId}` : undefined,
      },
      (payload) => {
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
      }
    )
    .subscribe();

  // Send initial data
  try {
    const { data } = await supabase
      .from('drone_tracking')
      .select('*')
      .eq('drone_id', droneId || '')
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (data) {
      res.write(`data: ${JSON.stringify({ new: data })}\n\n`);
    }
  } catch (error) {
    // Ignore errors for initial data
  }

  // Keep connection alive
  const keepAlive = setInterval(() => {
    res.write(': keepalive\n\n');
  }, 30000);

  // Cleanup on client disconnect
  req.on('close', () => {
    clearInterval(keepAlive);
    supabase.removeChannel(channel);
    res.end();
  });
}
