import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Command endpoint - accepts but doesn't process
  // Commands will be handled by your separate server
  res.json({ status: "accepted (commands handled by separate server)" });
}

