import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // SSE endpoint - returns empty stream
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Cache-Control', 'no-cache');
  
  // Send initial empty data
  res.write(`data: ${JSON.stringify([])}\n\n`);
  
  // Keep connection alive
  const interval = setInterval(() => {
    res.write(`: keepalive\n\n`);
  }, 30000);
  
  req.on('close', () => {
    clearInterval(interval);
  });
}

