import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.json({
    service: "SkyLink Core API",
    status: "running",
    version: "1.0.0",
    timestamp: new Date().toISOString()
  });
}

