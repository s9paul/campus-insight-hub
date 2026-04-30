import { useEffect, useRef, useState } from "react";
import * as Cesium from "cesium";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Layers, MapPin, Maximize2, Building2 } from "lucide-react";

// Use OSM imagery — no Cesium Ion token required
Cesium.Ion.defaultAccessToken = "";

// Default campus center — IIT Kanpur approx (will be overridden once real shapefiles are loaded)
const CAMPUS_CENTER = { lon: 80.2329, lat: 26.5123, height: 2500 };

export default function CampusMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const layerEntitiesRef = useRef<Record<string, Cesium.Entity[]>>({});
  const [activeLayers, setActiveLayers] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<{ name: string; props: Record<string, any> } | null>(null);

  const layers = useQuery({
    queryKey: ["gis-layers"],
    queryFn: async () => {
      const { data } = await supabase.from("gis_layers").select("*").order("category").order("name");
      return data ?? [];
    },
  });

  const assets = useQuery({
    queryKey: ["assets-geo"],
    queryFn: async () => {
      const { data } = await supabase.from("assets").select("*").not("longitude", "is", null);
      return data ?? [];
    },
  });

  // Init viewer
  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;

    const viewer = new Cesium.Viewer(containerRef.current, {
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      animation: false,
      timeline: false,
      fullscreenButton: false,
      infoBox: false,
      selectionIndicator: false,
      baseLayer: Cesium.ImageryLayer.fromProviderAsync(
        Promise.resolve(new Cesium.OpenStreetMapImageryProvider({ url: "https://tile.openstreetmap.org/" })),
        {}
      ),
    });

    viewer.scene.globe.enableLighting = false;
    viewer.scene.skyAtmosphere.show = true;
    viewer.scene.backgroundColor = Cesium.Color.fromCssColorString("#0b1220");

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(CAMPUS_CENTER.lon, CAMPUS_CENTER.lat, CAMPUS_CENTER.height),
      orientation: { heading: 0, pitch: Cesium.Math.toRadians(-55), roll: 0 },
      duration: 1.5,
    });

    // Click handler for entity selection
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((click: any) => {
      const picked = viewer.scene.pick(click.position);
      if (Cesium.defined(picked) && picked.id instanceof Cesium.Entity) {
        const e = picked.id as any;
        setSelected({ name: e.name ?? "Feature", props: e.properties?.getValue?.(Cesium.JulianDate.now()) ?? {} });
      } else {
        setSelected(null);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    viewerRef.current = viewer;

    return () => {
      handler.destroy();
      viewer.destroy();
      viewerRef.current = null;
    };
  }, []);

  // Initial activeLayers from DB
  useEffect(() => {
    if (!layers.data) return;
    setActiveLayers((prev) => {
      const next = { ...prev };
      for (const l of layers.data) if (next[l.id] === undefined) next[l.id] = l.visible_by_default;
      return next;
    });
  }, [layers.data]);

  // Render assets as points
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !assets.data) return;
    // clear old asset entities
    const ids = viewer.entities.values.filter((e) => (e as any)._isAsset).map((e) => e.id);
    ids.forEach((id) => viewer.entities.removeById(id));

    for (const a of assets.data) {
      if (a.longitude == null || a.latitude == null) continue;
      const color =
        a.status === "operational" ? Cesium.Color.fromCssColorString("#22c55e") :
        a.status === "maintenance" ? Cesium.Color.fromCssColorString("#f59e0b") :
        a.status === "offline" ? Cesium.Color.fromCssColorString("#ef4444") :
        Cesium.Color.GRAY;
      const e = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(a.longitude, a.latitude, 5),
        point: {
          pixelSize: 12,
          color,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        },
        label: {
          text: a.asset_code ?? a.name,
          font: "12px Inter, sans-serif",
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new Cesium.Cartesian2(0, -22),
          showBackground: true,
          backgroundColor: Cesium.Color.fromCssColorString("rgba(15,23,42,0.85)"),
          backgroundPadding: new Cesium.Cartesian2(6, 4),
          scale: 0.9,
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 4000),
        },
        name: a.name,
        properties: {
          "Asset Code": a.asset_code,
          Category: a.category,
          Status: a.status,
          Location: a.location_name,
        },
      });
      (e as any)._isAsset = true;
    }
  }, [assets.data]);

  // Toggle layer visibility (placeholder — will load gis_features once shapefiles are imported)
  function toggleLayer(id: string, on: boolean) {
    setActiveLayers((p) => ({ ...p, [id]: on }));
    const ents = layerEntitiesRef.current[id];
    if (ents) ents.forEach((e) => (e.show = on));
  }

  function flyHome() {
    viewerRef.current?.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(CAMPUS_CENTER.lon, CAMPUS_CENTER.lat, CAMPUS_CENTER.height),
      orientation: { heading: 0, pitch: Cesium.Math.toRadians(-55), roll: 0 },
      duration: 1.2,
    });
  }

  // Group layers by category
  const grouped = (layers.data ?? []).reduce<Record<string, typeof layers.data>>((acc, l) => {
    (acc[l.category] ||= [] as any).push(l);
    return acc;
  }, {} as any);

  return (
    <div className="h-screen flex">
      {/* Layers panel */}
      <div className="w-72 shrink-0 border-r border-border bg-card flex flex-col">
        <div className="px-4 py-4 border-b border-border flex items-center gap-2">
          <Layers className="size-4 text-primary" />
          <div>
            <div className="text-sm font-semibold">Layers</div>
            <div className="text-[11px] text-muted-foreground">Toggle GIS layers</div>
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-4">
            {Object.entries(grouped).map(([cat, items]) => (
              <div key={cat}>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 px-1">{cat}</div>
                <div className="space-y-1">
                  {items!.map((l: any) => (
                    <label key={l.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded hover:bg-muted cursor-pointer transition-base">
                      <Checkbox checked={!!activeLayers[l.id]} onCheckedChange={(v) => toggleLayer(l.id, !!v)} />
                      <span className="size-2.5 rounded-sm shrink-0" style={{ background: l.color }} />
                      <span className="text-xs flex-1 truncate">{l.name}</span>
                      <span className="text-[10px] text-muted-foreground">{l.feature_count}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
            {!layers.data?.length && <p className="text-xs text-muted-foreground p-2">No layers yet.</p>}
          </div>
        </ScrollArea>
        <div className="p-3 border-t border-border text-[11px] text-muted-foreground">
          Tip: Upload zipped shapefiles in chat to populate layers with real campus data.
        </div>
      </div>

      {/* Map */}
      <div className="relative flex-1 min-w-0">
        <div ref={containerRef} className="absolute inset-0" />

        {/* Top controls */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
          <Card className="px-3 py-2 flex items-center gap-2 pointer-events-auto shadow-elegant">
            <MapPin className="size-4 text-accent" />
            <span className="text-xs font-medium">Campus Map</span>
            <Badge variant="secondary" className="text-[10px]">3D</Badge>
          </Card>
          <Button size="sm" variant="secondary" className="pointer-events-auto shadow-elegant" onClick={flyHome}>
            <Maximize2 className="size-4" /> Reset View
          </Button>
        </div>

        {/* Selected info */}
        {selected && (
          <Card className="absolute bottom-6 left-6 w-80 p-4 shadow-elegant animate-fade-in">
            <div className="flex items-center gap-2 mb-2">
              <div className="size-8 rounded-md gradient-primary grid place-items-center">
                <Building2 className="size-4 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{selected.name}</div>
                <div className="text-[11px] text-muted-foreground">Feature details</div>
              </div>
            </div>
            <div className="space-y-1.5 text-xs mt-3">
              {Object.entries(selected.props).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="font-medium text-right truncate max-w-[60%]">{String(v ?? "—")}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Legend */}
        <Card className="absolute bottom-6 right-6 px-3 py-2 shadow-elegant">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Asset Status</div>
          <div className="flex flex-col gap-1 text-xs">
            <div className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-success" /> Operational</div>
            <div className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-warning" /> Maintenance</div>
            <div className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-destructive" /> Offline</div>
          </div>
        </Card>
      </div>
    </div>
  );
}
