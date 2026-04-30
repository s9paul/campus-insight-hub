import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Flame, Siren, Users, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Emergency() {
  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Emergency Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Evacuation routes, hazard zones and incident response</p>
        </div>
        <Button variant="destructive"><Siren className="size-4" /> Trigger Drill</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Flame className="size-4 text-destructive" /> Active Hazards</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">0</div>
            <p className="text-xs text-muted-foreground mt-1">All clear across campus</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Users className="size-4 text-info" /> People on Campus</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">~4,820</div>
            <p className="text-xs text-muted-foreground mt-1">Estimated from access control</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><ShieldAlert className="size-4 text-warning" /> Drills This Year</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">3</div>
            <p className="text-xs text-muted-foreground mt-1">Last: 12 days ago</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Emergency Contacts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { name: "Campus Security Control Room", num: "+91 512 259 7777", role: "24/7" },
              { name: "Health Center", num: "+91 512 259 8888", role: "Medical" },
              { name: "Fire Station (City)", num: "101", role: "Fire" },
              { name: "Maintenance On-Call", num: "+91 512 259 6666", role: "Facilities" },
            ].map((c) => (
              <div key={c.name} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/40 transition-base">
                <div className="size-9 rounded-md bg-destructive/15 text-destructive grid place-items-center"><Phone className="size-4" /></div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.num}</div>
                </div>
                <Badge variant="outline">{c.role}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Evacuation Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-sm">
              {[
                "System detects hazard via IoT sensor or manual trigger",
                "Affected zones are highlighted on the GIS map",
                "Safest exit routes computed per building",
                "Push notifications sent to all on-campus users",
                "Real-time monitoring until all-clear is issued",
              ].map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="size-6 rounded-full bg-primary/10 text-primary text-xs font-semibold grid place-items-center shrink-0">{i + 1}</span>
                  <span className="pt-0.5 text-muted-foreground">{step}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
