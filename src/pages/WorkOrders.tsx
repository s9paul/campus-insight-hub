import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Wrench } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const priorityTone: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-info/15 text-info border-info/30",
  high: "bg-warning/15 text-warning border-warning/30",
  critical: "bg-destructive/15 text-destructive border-destructive/30",
};
const statusTone: Record<string, string> = {
  open: "bg-info/15 text-info border-info/30",
  in_progress: "bg-accent/15 text-accent border-accent/30",
  on_hold: "bg-muted text-muted-foreground",
  completed: "bg-success/15 text-success border-success/30",
  cancelled: "bg-muted text-muted-foreground",
};

export default function WorkOrders() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [assetId, setAssetId] = useState<string>("");

  const orders = useQuery({
    queryKey: ["wo-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("work_orders")
        .select("*, assets(name, asset_code)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const assets = useQuery({
    queryKey: ["assets-options"],
    queryFn: async () => (await supabase.from("assets").select("id, name, asset_code").order("asset_code")).data ?? [],
  });

  async function create() {
    if (!title.trim()) return toast.error("Title required");
    const { error } = await supabase.from("work_orders").insert({
      title,
      description,
      priority: priority as any,
      asset_id: assetId || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Work order created");
    setOpen(false);
    setTitle(""); setDescription(""); setPriority("medium"); setAssetId("");
    qc.invalidateQueries({ queryKey: ["wo-list"] });
    qc.invalidateQueries({ queryKey: ["wo-stats"] });
  }

  async function updateStatus(id: string, status: string) {
    const patch: any = { status };
    if (status === "completed") patch.completed_at = new Date().toISOString();
    const { error } = await supabase.from("work_orders").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["wo-list"] });
    qc.invalidateQueries({ queryKey: ["wo-stats"] });
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Work Orders</h1>
          <p className="text-sm text-muted-foreground mt-1">Maintenance requests and SLA tracking</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="size-4" /> New Work Order</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Work Order</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Replace HVAC filter" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Asset (optional)</Label>
                  <Select value={assetId} onValueChange={setAssetId}>
                    <SelectTrigger><SelectValue placeholder="Select asset" /></SelectTrigger>
                    <SelectContent>
                      {assets.data?.map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.asset_code} — {a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={create}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3">
        {orders.data?.map((w: any) => (
          <Card key={w.id} className="p-4 hover:shadow-md transition-base">
            <div className="flex items-start gap-4">
              <div className="size-10 rounded-lg bg-primary/10 grid place-items-center shrink-0">
                <Wrench className="size-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[11px] text-muted-foreground">{w.order_number}</span>
                  <Badge variant="outline" className={`capitalize ${priorityTone[w.priority]}`}>{w.priority}</Badge>
                  <Badge variant="outline" className={`capitalize ${statusTone[w.status]}`}>{String(w.status).replace("_", " ")}</Badge>
                </div>
                <div className="font-medium mt-1">{w.title}</div>
                {w.description && <div className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{w.description}</div>}
                <div className="text-xs text-muted-foreground mt-1.5">
                  {w.assets ? `${w.assets.asset_code} · ${w.assets.name}` : "No asset linked"}
                  {w.due_date && ` · Due ${new Date(w.due_date).toLocaleDateString()}`}
                </div>
              </div>
              <Select value={w.status} onValueChange={(v) => updateStatus(w.id, v)}>
                <SelectTrigger className="w-36 shrink-0"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>
        ))}
        {!orders.data?.length && (
          <Card className="p-12 text-center text-muted-foreground">
            <Wrench className="size-8 mx-auto mb-2 opacity-40" />
            No work orders yet. Click "New Work Order" to create one.
          </Card>
        )}
      </div>
    </div>
  );
}
