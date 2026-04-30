-- Roles enum + table (separate from profiles to prevent privilege escalation)
CREATE TYPE public.app_role AS ENUM ('admin', 'facility_manager', 'maintenance', 'viewer');
CREATE TYPE public.asset_status AS ENUM ('operational', 'maintenance', 'offline', 'decommissioned');
CREATE TYPE public.work_order_status AS ENUM ('open', 'in_progress', 'on_hold', 'completed', 'cancelled');
CREATE TYPE public.work_order_priority AS ENUM ('low', 'medium', 'high', 'critical');

-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- user_roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role security definer function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- Auto-create profile + default viewer role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'viewer');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- gis_layers
CREATE TABLE public.gis_layers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- topographic, water, electrical, ofc, telephone, sewerage, ac, contour
  geometry_type TEXT NOT NULL, -- point, line, polygon
  color TEXT NOT NULL DEFAULT '#3b82f6',
  icon TEXT,
  visible_by_default BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  feature_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.gis_layers ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_gis_layers_updated BEFORE UPDATE ON public.gis_layers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- gis_features (GeoJSON storage)
CREATE TABLE public.gis_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  layer_id UUID NOT NULL REFERENCES public.gis_layers(id) ON DELETE CASCADE,
  name TEXT,
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  geometry JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.gis_features ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_gis_features_layer ON public.gis_features(layer_id);

-- assets
CREATE TABLE public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_code TEXT UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- building, hvac, electrical, water, sewerage, ofc, transport, security, other
  subcategory TEXT,
  status public.asset_status NOT NULL DEFAULT 'operational',
  location_name TEXT,
  longitude DOUBLE PRECISION,
  latitude DOUBLE PRECISION,
  install_date DATE,
  last_maintenance DATE,
  next_maintenance DATE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_assets_updated BEFORE UPDATE ON public.assets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- work_orders
CREATE TABLE public.work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL DEFAULT ('WO-' || to_char(now(), 'YYYYMMDD') || '-' || substr(md5(random()::text), 1, 6)),
  asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status public.work_order_status NOT NULL DEFAULT 'open',
  priority public.work_order_priority NOT NULL DEFAULT 'medium',
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_work_orders_updated BEFORE UPDATE ON public.work_orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- sensors
CREATE TABLE public.sensors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sensor_type TEXT NOT NULL, -- temperature, humidity, energy, water_flow, occupancy
  unit TEXT,
  longitude DOUBLE PRECISION,
  latitude DOUBLE PRECISION,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sensors ENABLE ROW LEVEL SECURITY;

-- sensor_readings
CREATE TABLE public.sensor_readings (
  id BIGSERIAL PRIMARY KEY,
  sensor_id UUID NOT NULL REFERENCES public.sensors(id) ON DELETE CASCADE,
  value DOUBLE PRECISION NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sensor_readings ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_sensor_readings_sensor_time ON public.sensor_readings(sensor_id, recorded_at DESC);

-- ==== RLS Policies ====

-- profiles
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- user_roles
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- gis_layers
CREATE POLICY "Authenticated view layers" ON public.gis_layers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers manage layers" ON public.gis_layers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'facility_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'facility_manager'));

-- gis_features
CREATE POLICY "Authenticated view features" ON public.gis_features FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers manage features" ON public.gis_features FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'facility_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'facility_manager'));

-- assets
CREATE POLICY "Authenticated view assets" ON public.assets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers manage assets" ON public.assets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'facility_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'facility_manager'));

-- work_orders
CREATE POLICY "Staff view work orders" ON public.work_orders FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'facility_manager')
  OR public.has_role(auth.uid(), 'maintenance') OR assigned_to = auth.uid() OR created_by = auth.uid()
);
CREATE POLICY "Staff create work orders" ON public.work_orders FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'facility_manager') OR public.has_role(auth.uid(), 'maintenance')
);
CREATE POLICY "Staff update work orders" ON public.work_orders FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'facility_manager')
  OR public.has_role(auth.uid(), 'maintenance') OR assigned_to = auth.uid()
);
CREATE POLICY "Managers delete work orders" ON public.work_orders FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'facility_manager')
);

-- sensors
CREATE POLICY "Authenticated view sensors" ON public.sensors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers manage sensors" ON public.sensors FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'facility_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'facility_manager'));

-- sensor_readings
CREATE POLICY "Authenticated view readings" ON public.sensor_readings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Managers insert readings" ON public.sensor_readings FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'facility_manager') OR public.has_role(auth.uid(), 'maintenance')
);