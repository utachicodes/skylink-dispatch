import { useEffect, useMemo, useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, MapPin, Clock, Check, X } from "lucide-react";
import { deliveryService } from "@/lib/deliveryService";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function OperatorDashboard() {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const data = await deliveryService.getPendingDeliveries();
      setDeliveries(data || []);
    } catch (error) {
      console.warn("[OperatorDashboard] failed to fetch deliveries", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 10000);
    return () => clearInterval(interval);
  }, []);

  const pending = deliveries.filter((d) => ["pending", "confirmed"].includes(d.status));
  const stats = useMemo(() => {
    const active = deliveries.filter((d) => d.status === "in_flight").length;
    const completed = deliveries.filter((d) => d.status === "delivered").length;
    const success =
      deliveries.length === 0 ? 100 : Math.round((completed / deliveries.length) * 100);
    return { active, completed, success };
  }, [deliveries]);

  const handleAccept = async (deliveryId: string) => {
    if (!user) return;
    try {
      setActionId(deliveryId);
      await deliveryService.assignOperator(deliveryId, user.id);
      toast.success("Delivery accepted");
      await refresh();
    } catch (error: any) {
      toast.error(error?.message || "Couldn't accept");
    } finally {
      setActionId(null);
    }
  };

  const handleDecline = async (deliveryId: string) => {
    try {
      setActionId(deliveryId);
      await deliveryService.updateDeliveryStatus(deliveryId, "cancelled");
      toast("Delivery declined");
      await refresh();
    } catch (error: any) {
      toast.error(error?.message || "Couldn't decline");
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <header className="bg-sky-gradient text-white p-6 shadow-lg">
        <div className="flex items-center gap-4">
          <img src="/logo-final.png" alt="SkyLink" className="h-12 rounded-2xl bg-white/10 p-2" />
          <div>
            <h1 className="text-2xl font-bold">Operator Dashboard</h1>
            <p className="text-white/90 mt-1">Semi-autonomous requests streaming live</p>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-6 max-w-4xl mx-auto">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">{stats.active}</p>
                <p className="text-sm text-muted-foreground">Active Jobs</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-accent">{stats.completed}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-500">{stats.success}%</p>
                <p className="text-sm text-muted-foreground">Success Rate</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pending Requests</CardTitle>
            <CardDescription>
              {loading ? "Syncing with core server..." : "Pick a mission and take control"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(pending.length ? pending : deliveries).map((delivery) => (
              <div key={delivery.id} className="p-4 border rounded-lg space-y-3 bg-card/60">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    <span className="font-semibold">Delivery #{delivery.id.slice(0, 6)}</span>
                  </div>
                  <Badge variant="secondary" className="uppercase">
                    {delivery.package_size || "Medium"}
                  </Badge>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">From: {delivery.pickup_location}</p>
                      <p className="text-muted-foreground">To: {delivery.dropoff_location}</p>
                    </div>
                  </div>
                  <div className="flex gap-4 text-muted-foreground">
                    <span>ETA: {delivery.estimated_time ?? 12} min</span>
                    <span>{delivery.package_note || "Standard package"}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    <span>{new Date(delivery.created_at).toLocaleTimeString()}</span>
                  </div>
                  <span>{delivery.status}</span>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    className="flex-1 bg-sky-gradient hover:opacity-90"
                    disabled={actionId === delivery.id}
                    onClick={() => handleAccept(delivery.id)}
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Accept
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    disabled={actionId === delivery.id}
                    onClick={() => handleDecline(delivery.id)}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Decline
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
}
