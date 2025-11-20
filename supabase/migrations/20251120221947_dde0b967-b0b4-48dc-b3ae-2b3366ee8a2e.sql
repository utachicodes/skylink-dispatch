-- Fix logs table RLS policy to prevent unrestricted inserts
DROP POLICY IF EXISTS "System can insert logs" ON public.logs;

-- Only allow service role or admins to insert logs
CREATE POLICY "Only admins can insert logs"
ON public.logs
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Add policy for service role (bypasses RLS anyway, but explicit is good)
CREATE POLICY "Service role can insert logs"
ON public.logs
FOR INSERT
TO service_role
WITH CHECK (true);

-- Ensure profiles table phone numbers are properly protected
-- (Current policy is correct but let's be explicit about what fields are accessible)

-- Add index on user_roles for better performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_lookup ON public.user_roles(user_id, role);