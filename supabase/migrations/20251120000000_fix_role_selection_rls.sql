-- Function to allow users to set their own role
-- This bypasses RLS by using SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.set_user_role(_role app_role)
RETURNS void
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete any existing roles for this user
  DELETE FROM public.user_roles
  WHERE user_id = auth.uid();
  
  -- Insert the new role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), _role);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.set_user_role(app_role) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.set_user_role IS 'Allows authenticated users to set their own role. Uses SECURITY DEFINER to bypass RLS.';

