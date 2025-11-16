-- Create operator_earnings table
CREATE TABLE IF NOT EXISTS public.operator_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  delivery_id UUID REFERENCES public.deliveries(id) ON DELETE SET NULL,
  mission_id TEXT,
  amount DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add earnings column to deliveries (for quick lookup)
ALTER TABLE public.deliveries 
ADD COLUMN IF NOT EXISTS operator_earnings DECIMAL(10, 2) DEFAULT 0;

-- Enable RLS
ALTER TABLE public.operator_earnings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for operator_earnings
CREATE POLICY "Operators can view their own earnings"
  ON public.operator_earnings FOR SELECT
  USING (auth.uid() = operator_id);

CREATE POLICY "Admins can view all earnings"
  ON public.operator_earnings FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert earnings"
  ON public.operator_earnings FOR INSERT
  WITH CHECK (true);

-- Function to calculate earnings when delivery is completed
CREATE OR REPLACE FUNCTION public.calculate_operator_earnings()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
DECLARE
  base_rate DECIMAL(10, 2) := 10.00;
  size_multiplier DECIMAL(10, 2);
  weight_multiplier DECIMAL(10, 2);
  final_amount DECIMAL(10, 2);
BEGIN
  -- Only process when status changes to 'delivered'
  IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
    IF NEW.operator_id IS NOT NULL THEN
      -- Calculate earnings based on package size and weight
      size_multiplier := CASE 
        WHEN NEW.package_size = 'small' THEN 1.0
        WHEN NEW.package_size = 'medium' THEN 1.5
        WHEN NEW.package_size = 'large' THEN 2.0
        ELSE 1.5
      END;
      
      weight_multiplier := GREATEST(1.0, COALESCE(NEW.package_weight, 2) / 2.0);
      
      final_amount := base_rate * size_multiplier * weight_multiplier;
      
      -- Update delivery with earnings
      NEW.operator_earnings := final_amount;
      
      -- Create earnings record
      INSERT INTO public.operator_earnings (
        operator_id,
        delivery_id,
        amount,
        status,
        created_at
      ) VALUES (
        NEW.operator_id,
        NEW.id,
        final_amount,
        'pending',
        NOW()
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to calculate earnings on delivery completion
DROP TRIGGER IF EXISTS on_delivery_completed ON public.deliveries;
CREATE TRIGGER on_delivery_completed
  BEFORE UPDATE ON public.deliveries
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_operator_earnings();

