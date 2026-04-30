
ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS layer_id UUID REFERENCES public.gis_layers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS feature_ref TEXT,
  ADD COLUMN IF NOT EXISTS tag_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS assets_tag_code_key ON public.assets(tag_code) WHERE tag_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS assets_layer_id_idx ON public.assets(layer_id);
CREATE INDEX IF NOT EXISTS assets_layer_feature_idx ON public.assets(layer_id, feature_ref);
