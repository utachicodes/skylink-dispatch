import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAuth } from '../../_supabase';

// Stream.io token generation endpoint
// Stream.io is a video calling service - this endpoint generates secure tokens for users
export default async function handler(req: VercelRequest, res: VercelResponse) {
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

    const { role, deliveryId } = req.body;

    // Stream.io API key and secret from environment variables
    // Get these from https://getstream.io dashboard
    const STREAM_API_KEY = process.env.STREAM_API_KEY;
    const STREAM_API_SECRET = process.env.STREAM_API_SECRET;

    if (!STREAM_API_KEY || !STREAM_API_SECRET) {
      return res.status(500).json({ 
        error: 'Stream.io not configured. Add STREAM_API_KEY and STREAM_API_SECRET to Vercel environment variables.' 
      });
    }

    // Generate Stream token using Stream's server-side SDK
    // Install: npm install stream-chat
    try {
      // Dynamic import to avoid requiring it at build time if not installed
      const { StreamChat } = await import('stream-chat');
      const serverClient = StreamChat.getInstance(STREAM_API_KEY, STREAM_API_SECRET);
      const token = serverClient.createToken(userId);
      
      res.json({
        token,
        apiKey: STREAM_API_KEY,
        userId,
      });
    } catch (importError) {
      // If stream-chat is not installed, provide helpful error
      return res.status(500).json({
        error: 'Stream.io server SDK not installed. Run: npm install stream-chat',
        message: 'Install stream-chat package to generate tokens securely.',
      });
    }
  } catch (error: any) {
    console.error('[API] Error generating Stream token:', error);
    res.status(500).json({ error: error.message || 'Failed to generate token' });
  }
}

