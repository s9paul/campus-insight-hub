import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Boxes, Wrench, AlertTriangle, TrendingUp, Zap, Droplets, Leaf } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from "recharts";

function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, hint, tone = "primary" }: { icon: any; label: string; value: string; hint?: string; tone?: "primary" | "success" | "warning" | "destructive" | "accent" }) {
  const tones: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
    destructive: "bg-destructive/15 text-destructive",
    accent: "bg-accent/15 text-accent",
  };
  return (
    <Card className="shadow-sm hover:shadow-md transition-base">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">{label}</p>
            <p className="text-3xl font-semibold mt-2 tracking-tight">{value}</p>
            {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
          </div>
          <div className={`size-10 rounded-lg grid place-items-center ${tones[tone]}`}>
            <Icon className="size-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const energyData = Array.from({ length: 14 }, (_, i) => ({
  day: `D${i + 1}`,
  kwh: 8000 + Math.round(Math.sin(i / 2) * 1500 + Math.random() * 1000),
}));

const utilizationData = [
  { space: "Lecture", pct: 78 },
  { space: "Library", pct: 64 },
  { space: "Labs", pct: 52 },
  { space: "Hostels", pct: 89 },
  { space: "Admin", pct: 41 },
  { space: "Sports", pct: 33 },
];

export default function Dashboard() {
  const assets = useQuery({
    queryKey: ["assets-count"],
    queryFn: async () => {
      const { count } = await supabase.from("assets").select("*", { count: "exact", head: true });
      const { count: maint } = await supabase.from("assets").select("*", { count: "exact", head: true }).eq("status", "maintenance");
      const { count: offline } = await supabase.from("assets").select("*", { count: "exact", head: true }).eq("status", "offline");
      return { total: count ?? 0, maintenance: maint ?? 0, offline: offline ?? 0 };
    },
  });

  const orders = useQuery({
    queryKey: ["wo-stats"],
    queryFn: async () => {
      const { data } = await supabase.from("work_orders").select("status, priority");
      const open = data?.filter((d) => d.status === "open").length ?? 0;
      const inProgress = data?.filter((d) => d.status === "in_progress").length ?? 0;
      const critical = data?.filter((d) => d.priority === "critical" && d.status !== "completed").length ?? 0;
      return { open, inProgress, critical, total: data?.length ?? 0 };
    },
  });

  const recent = useQuery({
    queryKey: ["wo-recent"],
    queryFn: async () => {
      const { data } = await supabase
        .from("work_orders")
        .select("id, order_number, title, status, priority, created_at, assets(name, asset_code)")
        .order("created_at", { ascending: false })
        .limit(6);
      return data ?? [];
    },
  });

  return (
    <div className="p-8">
      <PageHeader
        title="Operations Dashboard"
        subtitle="Real-time view of campus facilities, assets and active work"
        action={
          <Button asChild>
            <Link to="/work-orders">New Work Order</Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard icon={Boxes} label="Total Assets" value={String(assets.data?.total ?? "—")} hint={`${assets.data?.maintenance ?? 0} in maintenance`} tone="primary" />
        <KpiCard icon={Wrench} label="Open Work Orders" value={String(orders.data?.open ?? "—")} hint={`${orders.data?.inProgress ?? 0} in progress`} tone="accent" />
        <KpiCard icon={AlertTriangle} label="Critical Alerts" value={String(orders.data?.critical ?? "—")} hint="Require immediate action" tone="destructive" />
        <KpiCard icon={Activity} label="Assets Offline" value={String(assets.data?.offline ?? "—")} hint="Last 24h" tone="warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Campus Energy Consumption</CardTitle>
                <CardDescription>Last 14 days, kWh</CardDescription>
              </div>
              <Zap className="size-5 text-warning" />
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={energyData}>
                <defs>
                  <linearGradient id="gline" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="hsl(var(--primary))" />
                    <stop offset="100%" stopColor="hsl(var(--accent))" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Line type="monotone" dataKey="kwh" stroke="url(#gline)" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Space Utilization</CardTitle>
                <CardDescription>Today, %</CardDescription>
              </div>
              <TrendingUp className="size-5 text-accent" />
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={utilizationData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="space" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="pct" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Recent Work Orders</CardTitle>
            <CardDescription>Latest maintenance activity across the campus</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recent.data?.length ? recent.data.map((w: any) => (
                <Link to="/work-orders" key={w.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-accent/40 hover:bg-muted/40 transition-base">
                  <div className={`size-2 rounded-full ${w.priority === "critical" ? "bg-destructive animate-pulse-glow" : w.priority === "high" ? "bg-warning" : "bg-info"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{w.title}</div>
                    <div className="text-xs text-muted-foreground">{w.order_number} · {w.assets?.name ?? "Unassigned asset"}</div>
                  </div>
                  <Badge variant="outline" className="capitalize">{String(w.status).replace("_", " ")}</Badge>
                </Link>
              )) : (
                <p className="text-sm text-muted-foreground py-4 text-center">No work orders yet.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Sustainability</CardTitle>
            <CardDescription>This month</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-success/10">
              <Leaf className="size-5 text-success" />
              <div className="flex-1">
                <div className="text-sm font-medium">CO₂ Saved</div>
                <div className="text-xs text-muted-foreground">vs last month</div>
              </div>
              <div className="text-lg font-semibold text-success">12.4t</div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-info/10">
              <Droplets className="size-5 text-info" />
              <div className="flex-1">
                <div className="text-sm font-medium">Water Recycled</div>
                <div className="text-xs text-muted-foreground">From STP</div>
              </div>
              <div className="text-lg font-semibold text-info">340 KL</div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-warning/10">
              <Zap className="size-5 text-warning" />
              <div className="flex-1">
                <div className="text-sm font-medium">Solar Generation</div>
                <div className="text-xs text-muted-foreground">This month</div>
              </div>
              <div className="text-lg font-semibold text-warning">18.2 MWh</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
