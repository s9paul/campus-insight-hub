import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Thermometer, Zap, Droplets } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";

const iconFor = (t: string) => {
  if (t === "temperature") return Thermometer;
  if (t === "energy") return Zap;
  if (t === "water_flow") return Droplets;
  return Activity;
};

const series = (seed: number) => Array.from({ length: 24 }, (_, i) => ({
  t: `${i}:00`,
  v: 20 + Math.sin((i + seed) / 3) * 8 + Math.random() * 3,
}));

export default function Sensors() {
  const { data } = useQuery({
    queryKey: ["sensors"],
    queryFn: async () => (await supabase.from("sensors").select("*, assets(name, asset_code)")).data ?? [],
  });

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">IoT & Sensors</h1>
        <p className="text-sm text-muted-foreground mt-1">Real-time telemetry from campus equipment</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data?.map((s: any, i: number) => {
          const Icon = iconFor(s.sensor_type);
          return (
            <Card key={s.id} className="shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="size-9 rounded-md bg-accent/15 text-accent grid place-items-center">
                      <Icon className="size-4" />
                    </div>
                    <div>
                      <CardTitle className="text-sm">{s.name}</CardTitle>
                      <p className="text-[11px] text-muted-foreground capitalize">{s.sensor_type} · {s.unit}</p>
                    </div>
                  </div>
                  <Badge variant={s.is_active ? "default" : "secondary"} className={s.is_active ? "bg-success text-success-foreground" : ""}>
                    {s.is_active ? "Live" : "Offline"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={120}>
                  <AreaChart data={series(i)}>
                    <defs>
                      <linearGradient id={`g${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="t" hide />
                    <YAxis hide />
                    <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    <Area type="monotone" dataKey="v" stroke="hsl(var(--accent))" fill={`url(#g${i})`} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="text-xs text-muted-foreground mt-1">{s.assets?.name ?? "—"}</div>
              </CardContent>
            </Card>
          );
        })}
        {!data?.length && (
          <Card className="p-12 text-center text-muted-foreground col-span-full">
            <Activity className="size-8 mx-auto mb-2 opacity-40" />
            No sensors registered yet.
          </Card>
        )}
      </div>
    </div>
  );
}
