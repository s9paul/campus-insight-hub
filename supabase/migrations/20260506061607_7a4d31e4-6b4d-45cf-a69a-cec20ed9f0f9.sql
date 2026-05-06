
-- Apply IIT Kharagpur symbology: distinct color per category, sensible defaults
UPDATE public.gis_layers SET color = CASE category
  WHEN 'Topographic' THEN '#94a3b8'
  WHEN 'Contour'     THEN '#a16207'
  WHEN 'Water'       THEN '#0ea5e9'
  WHEN 'Sewerage'    THEN '#a855f7'
  WHEN 'Electrical'  THEN '#eab308'
  WHEN 'OFC'         THEN '#22c55e'
  WHEN 'Telephone'   THEN '#ec4899'
  WHEN 'AC'          THEN '#06b6d4'
  ELSE color
END;

-- Show key utility layers + topographic buildings/roads by default; hide noisy contours and dense point layers
UPDATE public.gis_layers SET visible_by_default = true
 WHERE category IN ('Water','Sewerage','Electrical','OFC','Telephone','AC');

UPDATE public.gis_layers SET visible_by_default = true
 WHERE category = 'Topographic' AND geometry_type IN ('Polygon','LineString','MultiLineString');

UPDATE public.gis_layers SET visible_by_default = false
 WHERE category = 'Contour';

UPDATE public.gis_layers SET visible_by_default = false
 WHERE category = 'Topographic' AND geometry_type = 'Point';
