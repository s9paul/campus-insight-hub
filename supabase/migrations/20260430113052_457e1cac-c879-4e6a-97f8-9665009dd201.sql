
DELETE FROM public.gis_features;
DELETE FROM public.gis_layers;
ALTER TABLE public.gis_layers ADD CONSTRAINT gis_layers_name_key UNIQUE (name);
