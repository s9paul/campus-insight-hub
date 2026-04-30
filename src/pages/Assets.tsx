import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import { Search, Boxes } from "lucide-react";

const statusTone: Record<string, string> = {
  operational: "bg-success/15 text-success border-success/30",
  maintenance: "bg-warning/15 text-warning border-warning/30",
  offline: "bg-destructive/15 text-destructive border-destructive/30",
  decommissioned: "bg-muted text-muted-foreground border-border",
};

export default function Assets() {
  const [q, setQ] = useState("");
  const { data } = useQuery({
    queryKey: ["assets-list"],
    queryFn: async () => {
      const { data } = await supabase.from("assets").select("*").order("asset_code");
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim();
    if (!s) return data ?? [];
    return (data ?? []).filter((a) =>
      [a.name, a.asset_code, a.category, a.location_name].some((v) => String(v ?? "").toLowerCase().includes(s))
    );
  }, [data, q]);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Asset Registry</h1>
          <p className="text-sm text-muted-foreground mt-1">Buildings, equipment and infrastructure across campus</p>
        </div>
        <div className="relative">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search assets…" className="pl-9 w-72" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Code</th>
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">Category</th>
                <th className="text-left px-4 py-3 font-medium">Location</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Next Maintenance</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} className="border-t border-border hover:bg-muted/30 transition-base">
                  <td className="px-4 py-3 font-mono text-xs">{a.asset_code}</td>
                  <td className="px-4 py-3 font-medium">{a.name}</td>
                  <td className="px-4 py-3 capitalize text-muted-foreground">{a.category}</td>
                  <td className="px-4 py-3 text-muted-foreground">{a.location_name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={`capitalize ${statusTone[a.status] ?? ""}`}>{a.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{a.next_maintenance ?? "—"}</td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    <Boxes className="size-8 mx-auto mb-2 opacity-40" />
                    No assets found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
