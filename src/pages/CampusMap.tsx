import { useEffect, useMemo, useState } from "react";
import { Provider, useDispatch } from "react-redux";
import { applyMiddleware, combineReducers, compose, createStore } from "redux";
import { taskMiddleware } from "react-palm/tasks";
import keplerGlReducer from "@kepler.gl/reducers";
import KeplerGl from "@kepler.gl/components";
import { addDataToMap } from "@kepler.gl/actions";
import { processGeojson } from "@kepler.gl/processors";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";
import "maplibre-gl/dist/maplibre-gl.css";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

// Redux store for kepler.gl
const reducers = combineReducers({
  keplerGl: keplerGlReducer.initialState({
    uiState: { currentModal: null, activeSidePanel: "layer" },
  }),
});
const store = createStore(reducers, {}, compose(applyMiddleware(taskMiddleware)));

type Layer = {
  id: string;
  name: string;
  category: string;
  color: string;
  visible_by_default: boolean;
  feature_count: number;
  storage_path: string | null;
};

function KeplerLoader() {
  const dispatch = useDispatch();
  const [loaded, setLoaded] = useState(0);
  const [total, setTotal] = useState(0);

  const layers = useQuery({
    queryKey: ["gis-layers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("gis_layers")
        .select("id,name,category,color,visible_by_default,feature_count,storage_path")
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

  // Load default-visible GIS layers into Kepler
  useEffect(() => {
    if (!layers.data) return;
    const visible = layers.data.filter((l) => l.visible_by_default && l.storage_path);
    if (!visible.length) return;
    setTotal(visible.length);
    let cancelled = false;

    (async () => {
      const datasets: any[] = [];
      for (const l of visible) {
        try {
          const url = `${SUPABASE_URL}/storage/v1/object/public/gis-layers/${l.storage_path}`;
          const res = await fetch(url);
          const geo = await res.json();
          const data = processGeojson(geo);
          if (data) {
            datasets.push({
              info: { label: l.name, id: l.id, color: hexToRgb(l.color) },
              data,
            });
          }
        } catch (e) {
          console.error("layer load failed", l.name, e);
        }
        if (!cancelled) setLoaded((n) => n + 1);
      }

      if (cancelled || !datasets.length) return;
      dispatch(
        addDataToMap({
          datasets,
          options: { centerMap: false, readOnly: false },
          config: {
            mapStyle: { styleType: "dark" },
            mapState: {
              latitude: 22.3149,
              longitude: 87.3105,
              zoom: 14,
              pitch: 0,
              bearing: 0,
            },
          },
        }) as any
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [layers.data, dispatch]);

  // Add assets as a points dataset
  useEffect(() => {
    if (!assets.data?.length) return;
    const features = assets.data
      .filter((a: any) => a.longitude != null && a.latitude != null)
      .map((a: any) => ({
        type: "Feature",
        properties: {
          id: a.id,
          name: a.name,
          asset_code: a.asset_code,
          category: a.category,
          status: a.status,
          tag_code: a.tag_code,
        },
        geometry: { type: "Point", coordinates: [a.longitude, a.latitude] },
      }));
    if (!features.length) return;
    const data = processGeojson({ type: "FeatureCollection", features });
    if (!data) return;
    dispatch(
      addDataToMap({
        datasets: [{ info: { label: "Assets", id: "assets" }, data }],
        options: { centerMap: false, readOnly: false },
      }) as any
    );
  }, [assets.data, dispatch]);

  return (
    <>
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <Card className="px-3 py-2 flex items-center gap-2 pointer-events-auto shadow-elegant">
          <MapPin className="size-4 text-accent" />
          <span className="text-xs font-medium">Campus Map</span>
          <Badge variant="secondary" className="text-[10px]">kepler.gl</Badge>
          {total > 0 && loaded < total && (
            <span className="text-[10px] text-muted-foreground">
              loading {loaded}/{total} layers…
            </span>
          )}
        </Card>
      </div>
    </>
  );
}

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace("#", "");
  const n = parseInt(m.length === 3 ? m.split("").map((c) => c + c).join("") : m, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export default function CampusMap() {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const update = () => {
      const el = document.getElementById("kepler-host");
      if (el) setSize({ w: el.clientWidth, h: el.clientHeight });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <Provider store={store}>
      <div id="kepler-host" className="relative h-screen w-full">
        <KeplerLoader />
        {size.w > 0 && (
          <KeplerGl
            id="campus"
            mapboxApiAccessToken=""
            width={size.w}
            height={size.h}
          />
        )}
      </div>
    </Provider>
  );
}
