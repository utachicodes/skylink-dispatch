import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, MapPin, Clock, Check, X, DollarSign, TrendingUp, LogOut, Repeat2 } from "lucide-react";
import { deliveryService } from "@/lib/deliveryService";
import { coreApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function OperatorDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [missions, setMissions] = useState<any[]>([]);
  const [earnings, setEarnings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const refresh = async () => {
    try {
      // Fetch from both Supabase and Core API
      const [deliveryData, missionData, earningsData] = await Promise.all([
        deliveryService.getPendingDeliveries().catch(() => []),
        coreApi.listActiveMissions().catch(() => []),
        user ? supabase
          .from("operator_earnings")
          .select("*")
          .eq("operator_id", user.id)
          .order("created_at", { ascending: false })
          .then(({ data, error }) => {
            if (error && error.code !== "42P01") throw error; // Ignore "table doesn't exist" if migration not run
            return data || [];
          })
          .catch(() => []) : Promise.resolve([]),
      ]);
      
      setDeliveries(deliveryData || []);
      setMissions(missionData || []);
      setEarnings(earningsData || []);
    } catch (error) {
      console.warn("[OperatorDashboard] failed to fetch data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 10000);
    return () => clearInterval(interval);
  }, [user]);

  // Combine missions and deliveries for display
  const allRequests = useMemo(() => {
    const combined = [
      ...missions.map((m) => ({ ...m, type: "mission", id: m.id })),
      ...deliveries.map((d) => ({ ...d, type: "delivery", id: d.id })),
    ];
    return combined.filter((r) => ["pending", "confirmed", "assigned"].includes(r.status));
  }, [missions, deliveries]);

  const pending = allRequests;
  const stats = useMemo(() => {
    const active = deliveries.filter((d) => d.status === "in_flight").length;
    const completed = deliveries.filter((d) => d.status === "delivered").length;
    const success = deliveries.length === 0 ? 100 : Math.round((completed / deliveries.length) * 100);
    const totalEarnings = earnings.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    const pendingEarnings = earnings.filter((e) => e.status === "pending").reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    return { active, completed, success, totalEarnings, pendingEarnings };
  }, [deliveries, earnings]);

  const handleAccept = async (request: any) => {
    if (!user) return;
    try {
      setActionId(request.id);
      
      if (request.type === "mission") {
        // Accept mission from core API
        await coreApi.assignMission(request.id, user.id);
        toast.success("Mission accepted");
        // Navigate to pilot control
        navigate(`/pilot/mission/${request.id}`);
      } else {
        // Accept delivery from Supabase
        await deliveryService.assignOperator(request.id, user.id);
        toast.success("Delivery accepted");
      }
      
      await refresh();
    } catch (error: any) {
      toast.error(error?.message || "Couldn't accept");
    } finally {
      setActionId(null);
    }
  };

  const handleDecline = async (request: any) => {
    try {
      setActionId(request.id);
      
      if (request.type === "mission") {
        await coreApi.updateMissionStatus(request.id, "cancelled");
      } else {
        await deliveryService.updateDeliveryStatus(request.id, "cancelled");
      }
      
      toast("Request declined");
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
        <div className="flex items-center justify-between gap-4 max-w-4xl mx-auto">
          <div className="flex items-center gap-4">
            <img src="/logo-final.png" alt="SkyLink" className="h-12 rounded-2xl bg-white/10 p-2" />
            <div>
              <h1 className="text-2xl font-bold">Operator Dashboard</h1>
              <p className="text-white/90 mt-1">Semi-autonomous requests streaming live</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-3 text-sm">
            {user && (
              <span className="text-white/80 truncate max-w-[180px]">
                {user.email}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              className="border-white/20 text-white/90 bg-white/10 hover:bg-white/20"
              onClick={() => navigate("/select-role")}
            >
              <Repeat2 className="h-3 w-3 mr-1" />
              Switch role
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-white/80 hover:bg-white/10"
              onClick={signOut}
            >
              <LogOut className="h-3 w-3 mr-1" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-6 max-w-4xl mx-auto">
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="bg-white/5 border-white/10">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-semibold text-sky-400">{stats.active}</p>
                <p className="text-sm text-muted-foreground">Active Jobs</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-semibold text-sky-300">{stats.completed}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-semibold text-sky-200">{stats.success}%</p>
                <p className="text-sm text-muted-foreground">Success Rate</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-semibold text-sky-300">${stats.totalEarnings.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Total Earnings</p>
                {stats.pendingEarnings > 0 && (
                  <p className="text-xs text-sky-200 mt-1">${stats.pendingEarnings.toFixed(2)} pending</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="requests" className="space-y-4">
          <TabsList>
            <TabsTrigger value="requests">Available Requests</TabsTrigger>
            <TabsTrigger value="earnings">Earnings</TabsTrigger>
          </TabsList>

          <TabsContent value="requests">
            <Card>
              <CardHeader>
                <CardTitle>Pending Requests</CardTitle>
                <CardDescription>
                  {loading ? "Syncing with core server..." : "Pick a mission and take control"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {pending.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No pending requests available</p>
                  </div>
                ) : (
                  pending.map((request) => (
                    <div key={request.id} className="p-4 border rounded-lg space-y-3 bg-card/60">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Package className="h-5 w-5 text-primary" />
                          <span className="font-semibold">
                            {request.type === "mission" ? "Mission" : "Delivery"} #{request.id.slice(0, 6)}
                          </span>
                          <Badge variant="outline" className="text-xs">{request.type}</Badge>
                        </div>
                        <Badge variant="secondary" className="uppercase">
                          {request.package_size || request.priority || "Standard"}
                        </Badge>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-primary mt-0.5" />
                          <div>
                            <p className="font-medium">From: {request.pickup || request.pickup_location}</p>
                            <p className="text-muted-foreground">To: {request.dropoff || request.dropoff_location}</p>
                          </div>
                        </div>
                        <div className="flex gap-4 text-muted-foreground">
                          <span>ETA: {request.etaMinutes || request.estimated_time || 12} min</span>
                          {request.packageDetails && <span>{request.packageDetails}</span>}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          <span>
                            {new Date(request.createdAt || request.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                        <span>{request.status}</span>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button
                          className="flex-1 bg-sky-gradient hover:opacity-90"
                          disabled={actionId === request.id}
                          onClick={() => handleAccept(request)}
                        >
                          <Check className="mr-2 h-4 w-4" />
                          Accept
                        </Button>
                        <Button
                          variant="destructive"
                          className="flex-1"
                          disabled={actionId === request.id}
                          onClick={() => handleDecline(request)}
                        >
                          <X className="mr-2 h-4 w-4" />
                          Decline
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="earnings">
            <Card>
              <CardHeader>
                <CardTitle>Earnings History</CardTitle>
                <CardDescription>Track your completed missions and payments</CardDescription>
              </CardHeader>
              <CardContent>
                {earnings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No earnings yet. Complete missions to start earning!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {earnings.map((earning) => (
                      <div key={earning.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-semibold">${parseFloat(earning.amount || 0).toFixed(2)}</p>
                          <p className="text-sm text-muted-foreground">
                            {earning.delivery_id ? `Delivery #${earning.delivery_id.slice(0, 8)}` : "Mission"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(earning.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant={earning.status === "paid" ? "default" : earning.status === "pending" ? "secondary" : "destructive"}>
                          {earning.status}
                        </Badge>
                      </div>
                    ))}
                    <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">Total Earnings</span>
                        <span className="text-2xl font-bold text-accent">${stats.totalEarnings.toFixed(2)}</span>
                      </div>
                      {stats.pendingEarnings > 0 && (
                        <div className="flex items-center justify-between mt-2 text-sm">
                          <span className="text-muted-foreground">Pending</span>
                          <span className="text-yellow-500">${stats.pendingEarnings.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <BottomNav />
    </div>
  );
}
