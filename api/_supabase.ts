import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for server-side use
// Priority: SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY (for serverless) > VITE_* (for client-side fallback)
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
// Use service role key for server-side operations (bypasses RLS)
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('[API] Supabase credentials not found. Some features may not work.');
  console.warn('[API] Required env vars: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Helper to verify authentication token
export async function verifyAuth(authHeader: string | null): Promise<{ userId: string | null; error: string | null }> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { userId: null, error: 'Missing or invalid authorization header' };
  }

  const token = authHeader.replace('Bearer ', '');
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return { userId: null, error: 'Invalid token' };
    }
    return { userId: user.id, error: null };
  } catch (error) {
    return { userId: null, error: 'Authentication failed' };
  }
}

// Helper to get user role
export async function getUserRole(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error || !data) return null;
    return data.role;
  } catch {
    return null;
  }
}

