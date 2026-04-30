
-- Add columns to gis_layers for storage-backed GeoJSON
ALTER TABLE public.gis_layers
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS bbox JSONB,
  ADD COLUMN IF NOT EXISTS source_file TEXT;

-- Public bucket for GeoJSON layer files
INSERT INTO storage.buckets (id, name, public)
VALUES ('gis-layers', 'gis-layers', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Public read gis-layers"
ON storage.objects FOR SELECT
USING (bucket_id = 'gis-layers');

CREATE POLICY "Managers upload gis-layers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'gis-layers' AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'facility_manager'::app_role)));

CREATE POLICY "Managers update gis-layers"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'gis-layers' AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'facility_manager'::app_role)));

CREATE POLICY "Managers delete gis-layers"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'gis-layers' AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'facility_manager'::app_role)));
