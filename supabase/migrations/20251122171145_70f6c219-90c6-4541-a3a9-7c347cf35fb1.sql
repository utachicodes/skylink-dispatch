-- Fix RLS policy to allow operators to accept unassigned deliveries
-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Operators can update assigned deliveries" ON public.deliveries;

-- Create new policy that allows:
-- 1. Operators to update deliveries they're already assigned to
-- 2. Operators to assign themselves to pending deliveries with no operator
CREATE POLICY "Operators can update deliveries"
ON public.deliveries
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'operator'::app_role) AND (
    auth.uid() = operator_id OR 
    (operator_id IS NULL AND status = 'pending')
  )
)
WITH CHECK (
  has_role(auth.uid(), 'operator'::app_role) AND (
    auth.uid() = operator_id OR 
    (operator_id IS NULL AND status = 'pending')
  )
);