import { useEffect, useRef, useState } from "react";
import * as Cesium from "cesium";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Layers, MapPin, Maximize2, Building2, Search, QrCode, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

// No Cesium Ion token — use OSM imagery
Cesium.Ion.defaultAccessToken = "";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

type Layer = {
  id: string;
  name: string;
  category: string;
  geometry_type: string;
  color: string;
  visible_by_default: boolean;
  feature_count: number;
  storage_path: string | null;
  bbox: [number, number, number, number] | null;
};

export default function CampusMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const dataSourcesRef = useRef<Record<string, Cesium.GeoJsonDataSource>>({});
  const loadingRef = useRef<Set<string>>(new Set());
  const [activeLayers, setActiveLayers] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<{ name: string; props: Record<string, any>; layerId?: string; layerName?: string } | null>(null);
  const [search, setSearch] = useState("");
  const [campusBbox, setCampusBbox] = useState<[number, number, number, number] | null>(null);

  const layers = useQuery({
    queryKey: ["gis-layers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("gis_layers")
        .select("id,name,category,geometry_type,color,visible_by_default,feature_count,storage_path,bbox")
        .order("category")
        .order("name");
      return (data ?? []) as Layer[];
    },
  });

  const assets = useQuery({
    queryKey: ["assets-geo"],
    queryFn: async () => {
      const { data } = await supabase.from("assets").select("*").not("longitude", "is", null);
      return data ?? [];
    },
  });

  // Compute combined campus bbox from all layers
  useEffect(() => {
    if (!layers.data?.length) return;
    let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
    for (const l of layers.data) {
      if (!l.bbox) continue;
      const [a, b, c, d] = l.bbox;
      if (a < minx) minx = a; if (b < miny) miny = b;
      if (c > maxx) maxx = c; if (d > maxy) maxy = d;
    }
    if (isFinite(minx)) setCampusBbox([minx, miny, maxx, maxy]);
  }, [layers.data]);

  // Init Cesium viewer
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

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((click: any) => {
      const picked = viewer.scene.pick(click.position);
      if (Cesium.defined(picked) && picked.id instanceof Cesium.Entity) {
        const e = picked.id as any;
        const props = e.properties?.getValue?.(Cesium.JulianDate.now()) ?? {};
        setSelected({
          name: e.name ?? "Feature",
          props,
          layerId: e._layerId,
          layerName: e._layerName,
        });
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

  // Fly to campus bbox once known
  useEffect(() => {
    const v = viewerRef.current;
    if (!v || !campusBbox) return;
    v.camera.flyTo({
      destination: Cesium.Rectangle.fromDegrees(campusBbox[0], campusBbox[1], campusBbox[2], campusBbox[3]),
      duration: 1.5,
    });
  }, [campusBbox]);

  // Initialize active layers from defaults
  useEffect(() => {
    if (!layers.data) return;
    setActiveLayers((prev) => {
      const next = { ...prev };
      for (const l of layers.data) if (next[l.id] === undefined) next[l.id] = l.visible_by_default;
      return next;
    });
  }, [layers.data]);

  // React to active-layer changes: load/show/hide GeoJSON datasources
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !layers.data) return;

    for (const l of layers.data) {
      const want = !!activeLayers[l.id];
      const ds = dataSourcesRef.current[l.id];
      if (want && !ds && !loadingRef.current.has(l.id) && l.storage_path) {
        loadingRef.current.add(l.id);
        const url = `${SUPABASE_URL}/storage/v1/object/public/gis-layers/${l.storage_path}`;
        const color = Cesium.Color.fromCssColorString(l.color);
        Cesium.GeoJsonDataSource.load(url, {
          stroke: color,
          fill: color.withAlpha(0.35),
          strokeWidth: 2,
          markerColor: color,
          markerSize: 28,
          clampToGround: true,
        })
          .then((src) => {
            (src as any)._layerName = l.name;
            (src as any)._layerId = l.id;
            // Tag entities with layer info for click handler
            for (const e of src.entities.values) {
              if (!e.name) e.name = l.name;
              (e as any)._layerId = l.id;
              (e as any)._layerName = l.name;
            }
            dataSourcesRef.current[l.id] = src;
            viewer.dataSources.add(src);
            src.show = !!activeLayers[l.id];
          })
          .catch((err) => console.error("Layer load failed", l.name, err))
          .finally(() => loadingRef.current.delete(l.id));
      } else if (ds) {
        ds.show = want;
      }
    }
  }, [activeLayers, layers.data]);

  // Render assets as points
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !assets.data) return;
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

  function toggleLayer(id: string, on: boolean) {
    setActiveLayers((p) => ({ ...p, [id]: on }));
  }

  function flyHome() {
    const v = viewerRef.current;
    if (!v) return;
    if (campusBbox) {
      v.camera.flyTo({
        destination: Cesium.Rectangle.fromDegrees(campusBbox[0], campusBbox[1], campusBbox[2], campusBbox[3]),
        duration: 1.2,
      });
    }
  }

  function flyToLayer(l: Layer) {
    const v = viewerRef.current;
    if (!v || !l.bbox) return;
    v.camera.flyTo({
      destination: Cesium.Rectangle.fromDegrees(l.bbox[0], l.bbox[1], l.bbox[2], l.bbox[3]),
      duration: 1,
    });
  }

  // Group + filter
  const filtered = (layers.data ?? []).filter((l) =>
    !search ? true : l.name.toLowerCase().includes(search.toLowerCase()) || l.category.toLowerCase().includes(search.toLowerCase())
  );
  const grouped = filtered.reduce<Record<string, Layer[]>>((acc, l) => {
    (acc[l.category] ||= []).push(l);
    return acc;
  }, {});

  const totalActive = Object.values(activeLayers).filter(Boolean).length;
  const totalFeatures = (layers.data ?? []).filter((l) => activeLayers[l.id]).reduce((s, l) => s + l.feature_count, 0);

  return (
    <div className="h-screen flex">
      {/* Layers panel */}
      <div className="w-80 shrink-0 border-r border-border bg-card flex flex-col">
        <div className="px-4 py-4 border-b border-border">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="size-4 text-primary" />
            <div className="flex-1">
              <div className="text-sm font-semibold">GIS Layers</div>
              <div className="text-[11px] text-muted-foreground">
                {layers.data?.length ?? 0} layers · {totalActive} on · {totalFeatures.toLocaleString()} features
              </div>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search layers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-7 text-xs"
            />
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-4">
            {Object.entries(grouped).map(([cat, items]) => (
              <div key={cat}>
                <div className="flex items-center justify-between mb-1.5 px-1">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{cat}</div>
                  <button
                    onClick={() => {
                      const allOn = items.every((l) => activeLayers[l.id]);
                      setActiveLayers((p) => {
                        const n = { ...p };
                        for (const l of items) n[l.id] = !allOn;
                        return n;
                      });
                    }}
                    className="text-[10px] text-primary hover:underline"
                  >
                    {items.every((l) => activeLayers[l.id]) ? "none" : "all"}
                  </button>
                </div>
                <div className="space-y-0.5">
                  {items.map((l) => (
                    <div key={l.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted transition-base group">
                      <Checkbox checked={!!activeLayers[l.id]} onCheckedChange={(v) => toggleLayer(l.id, !!v)} />
                      <span className="size-2.5 rounded-sm shrink-0" style={{ background: l.color }} />
                      <button
                        className="text-xs flex-1 truncate text-left hover:text-primary"
                        onClick={() => flyToLayer(l)}
                        title={`Fly to ${l.name}`}
                      >
                        {l.name.replace(`${l.category} - `, "")}
                      </button>
                      <span className="text-[10px] text-muted-foreground tabular-nums">{l.feature_count.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {!layers.data?.length && <p className="text-xs text-muted-foreground p-2">No layers yet.</p>}
          </div>
        </ScrollArea>
      </div>

      {/* Map */}
      <div className="relative flex-1 min-w-0">
        <div ref={containerRef} className="absolute inset-0" />

        <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
          <Card className="px-3 py-2 flex items-center gap-2 pointer-events-auto shadow-elegant">
            <MapPin className="size-4 text-accent" />
            <span className="text-xs font-medium">Campus Map</span>
            <Badge variant="secondary" className="text-[10px]">3D · CesiumJS</Badge>
          </Card>
          <Button size="sm" variant="secondary" className="pointer-events-auto shadow-elegant" onClick={flyHome}>
            <Maximize2 className="size-4" /> Reset View
          </Button>
        </div>

        {selected && (
          <SelectedFeatureCard
            selected={selected}
            onClose={() => setSelected(null)}
          />
        )}

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
