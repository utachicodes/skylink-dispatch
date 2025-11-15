-- Create user role enum
CREATE TYPE public.app_role AS ENUM ('client', 'operator', 'admin');

-- Create delivery status enum
CREATE TYPE public.delivery_status AS ENUM ('pending', 'confirmed', 'in_flight', 'arrived', 'delivered', 'cancelled');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, role)
);

-- Create drones table
CREATE TABLE public.drones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drone_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  battery_level INTEGER DEFAULT 100 CHECK (battery_level >= 0 AND battery_level <= 100),
  gps_signal BOOLEAN DEFAULT true NOT NULL,
  autonomous_mode BOOLEAN DEFAULT false NOT NULL,
  current_lat DECIMAL(10, 8),
  current_lng DECIMAL(11, 8),
  camera_stream_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create deliveries table
CREATE TABLE public.deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  operator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  drone_id UUID REFERENCES public.drones(id) ON DELETE SET NULL,
  pickup_location TEXT NOT NULL,
  pickup_lat DECIMAL(10, 8) NOT NULL,
  pickup_lng DECIMAL(11, 8) NOT NULL,
  dropoff_location TEXT NOT NULL,
  dropoff_lat DECIMAL(10, 8) NOT NULL,
  dropoff_lng DECIMAL(11, 8) NOT NULL,
  package_weight DECIMAL(10, 2),
  package_size TEXT,
  package_note TEXT,
  status delivery_status DEFAULT 'pending' NOT NULL,
  estimated_time INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create drone_tracking table for real-time GPS updates
CREATE TABLE public.drone_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drone_id UUID REFERENCES public.drones(id) ON DELETE CASCADE NOT NULL,
  delivery_id UUID REFERENCES public.deliveries(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  altitude DECIMAL(10, 2),
  speed DECIMAL(10, 2),
  battery_level INTEGER,
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create logs table
CREATE TABLE public.logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_type TEXT NOT NULL,
  message TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  drone_id UUID REFERENCES public.drones(id) ON DELETE SET NULL,
  delivery_id UUID REFERENCES public.deliveries(id) ON DELETE SET NULL,
  severity TEXT DEFAULT 'info',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drone_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for drones
CREATE POLICY "Authenticated users can view active drones"
  ON public.drones FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_active = true);

CREATE POLICY "Operators can view all drones"
  ON public.drones FOR SELECT
  USING (public.has_role(auth.uid(), 'operator') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage drones"
  ON public.drones FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for deliveries
CREATE POLICY "Clients can view their own deliveries"
  ON public.deliveries FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Clients can create deliveries"
  ON public.deliveries FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Operators can view assigned deliveries"
  ON public.deliveries FOR SELECT
  USING (auth.uid() = operator_id OR public.has_role(auth.uid(), 'operator'));

CREATE POLICY "Operators can update assigned deliveries"
  ON public.deliveries FOR UPDATE
  USING (auth.uid() = operator_id);

CREATE POLICY "Admins can manage all deliveries"
  ON public.deliveries FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for drone_tracking
CREATE POLICY "Users can view tracking for their deliveries"
  ON public.drone_tracking FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.deliveries
      WHERE deliveries.id = drone_tracking.delivery_id
      AND (deliveries.client_id = auth.uid() OR deliveries.operator_id = auth.uid())
    )
  );

CREATE POLICY "Operators can insert tracking data"
  ON public.drone_tracking FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'operator') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all tracking"
  ON public.drone_tracking FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for logs
CREATE POLICY "Admins can view all logs"
  ON public.logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert logs"
  ON public.logs FOR INSERT
  WITH CHECK (true);

-- Function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'New User'),
    NEW.raw_user_meta_data->>'phone'
  );
  
  -- Assign default role as client
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'client');
  
  RETURN NEW;
END;
$$;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE PLPGSQL
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_drones_updated_at
  BEFORE UPDATE ON public.drones
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_deliveries_updated_at
  BEFORE UPDATE ON public.deliveries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Enable realtime for critical tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.deliveries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.drone_tracking;
ALTER PUBLICATION supabase_realtime ADD TABLE public.drones;