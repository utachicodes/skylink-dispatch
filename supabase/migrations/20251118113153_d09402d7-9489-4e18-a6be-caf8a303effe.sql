-- Add points system to profiles
ALTER TABLE public.profiles 
ADD COLUMN points integer NOT NULL DEFAULT 1000;

-- Add points_cost to deliveries
ALTER TABLE public.deliveries 
ADD COLUMN points_cost integer NOT NULL DEFAULT 100;

-- Function to deduct points from user
CREATE OR REPLACE FUNCTION public.deduct_points(_user_id uuid, _points integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_points integer;
BEGIN
  SELECT points INTO current_points
  FROM public.profiles
  WHERE id = _user_id;
  
  IF current_points >= _points THEN
    UPDATE public.profiles
    SET points = points - _points
    WHERE id = _user_id;
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$;

-- Function to add points to user
CREATE OR REPLACE FUNCTION public.add_points(_user_id uuid, _points integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET points = points + _points
  WHERE id = _user_id;
END;
$$;