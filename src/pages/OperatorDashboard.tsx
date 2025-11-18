import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, MapPin, Clock, Check, X, Coins, LogOut } from "lucide-react";
import { deliveryService } from "@/lib/deliveryService";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function OperatorDashboard() {
  const { user, userRole, signOut } = useAuth();
  const navigate = useNavigate();
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !userRole) return;

    const fetchData = async () => {
      try {
        const { data, error } = await supabase
          .from("deliveries")
          .select("*")
          .eq("operator_id", user.id)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching deliveries:", error);
        } else {
          setDeliveries(data || []);
        }
      } catch (error) {
        console.error("Error fetching deliveries:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, userRole]);

  const stats = useMemo(() => {
    const completed = deliveries.filter((d) => d.status === "delivered").length;
    const active = deliveries.filter((d) => d.status === "in-transit").length;
    const totalPoints = deliveries
      .filter((d) => d.status === "delivered")
      .reduce((sum, d) => sum + (d.points_cost || 0), 0);

    return {
      totalDeliveries: deliveries.length,
      completed,
      active,
      pointsEarned: totalPoints,
    };
  }, [deliveries]);

  const pendingDeliveries = deliveries.filter((d) => d.status === "pending" || d.status === "confirmed");
  const activeDeliveries = deliveries.filter((d) => d.status === "in-transit");
  const completedDeliveries = deliveries.filter((d) => d.status === "delivered");

  const handleAccept = async (delivery: any) => {
    if (!user) return;
    try {
      await deliveryService.assignOperator(delivery.id, user.id);
      toast.success("Delivery accepted");
      const { data: updated } = await supabase
        .from("deliveries")
        .select("*")
        .eq("operator_id", user.id);
      setDeliveries(updated || []);
    } catch (error: any) {
      toast.error(error?.message || "Failed to accept delivery");
    }
  };

  const handleDecline = async (delivery: any) => {
    toast.info("Delivery declined");
    setDeliveries(prev => prev.filter(d => d.id !== delivery.id));
  };

  const renderDeliveryCard = (delivery: any) => (
    <Card key={delivery.id} className="hover:border-primary/50 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Delivery #{delivery.id.substring(0, 8)}</CardTitle>
          <Badge variant={
            delivery.status === "delivered" ? "default" :
            delivery.status === "in-transit" ? "secondary" :
            "outline"
          }>
            {delivery.status}
          </Badge>
        </div>
        <CardDescription className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          {new Date(delivery.created_at).toLocaleDateString()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-green-500 mt-1" />
            <div>
              <p className="text-sm font-medium">Pickup</p>
              <p className="text-sm text-muted-foreground">{delivery.pickup_location}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-red-500 mt-1" />
            <div>
              <p className="text-sm font-medium">Dropoff</p>
              <p className="text-sm text-muted-foreground">{delivery.dropoff_location}</p>
            </div>
          </div>
        </div>
        
        {delivery.package_note && (
          <div className="p-2 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">{delivery.package_note}</p>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-1 text-primary">
            <Coins className="h-4 w-4" />
            <span className="font-semibold">{delivery.points_cost || 100} pts</span>
          </div>
          
          {delivery.status === "pending" && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleDecline(delivery)}>
                <X className="h-4 w-4" />
              </Button>
              <Button size="sm" onClick={() => handleAccept(delivery)}>
                <Check className="h-4 w-4 mr-1" />
                Accept
              </Button>
            </div>
          )}
          
          {delivery.status === "in-transit" && (
            <Button size="sm" onClick={() => navigate(`/pilot/delivery/${delivery.id}`)}>
              View Control
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <header className="bg-sky-gradient text-white p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate("/operator")}
              className="focus:outline-none"
            >
              <img src="/logo-final.png" alt="SkyLink" className="h-12" />
            </button>
            <div>
              <h1 className="text-2xl font-bold">Operator Dashboard</h1>
              <p className="text-white/90 mt-1">Manage deliveries</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={signOut} className="text-white hover:bg-white/20">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="p-4 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardDescription>Total</CardDescription>
              <CardTitle className="text-4xl font-bold">{stats.totalDeliveries}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
            <CardHeader className="pb-2">
              <CardDescription>Completed</CardDescription>
              <CardTitle className="text-4xl font-bold">{stats.completed}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
            <CardHeader className="pb-2">
              <CardDescription>Active</CardDescription>
              <CardTitle className="text-4xl font-bold">{stats.active}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/20">
            <CardHeader className="pb-2">
              <CardDescription>Points Earned</CardDescription>
              <CardTitle className="text-4xl font-bold">{stats.pointsEarned} pts</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending">
              Pending
              {pendingDeliveries.length > 0 && (
                <Badge className="ml-2" variant="secondary">{pendingDeliveries.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="active">
              Active
              {activeDeliveries.length > 0 && (
                <Badge className="ml-2" variant="secondary">{activeDeliveries.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {loading ? (
              <Card><CardContent className="pt-6 text-center text-muted-foreground">Loading...</CardContent></Card>
            ) : pendingDeliveries.length === 0 ? (
              <Card><CardContent className="pt-6 text-center text-muted-foreground">No pending deliveries</CardContent></Card>
            ) : (
              pendingDeliveries.map(renderDeliveryCard)
            )}
          </TabsContent>

          <TabsContent value="active" className="space-y-4">
            {activeDeliveries.length === 0 ? (
              <Card><CardContent className="pt-6 text-center text-muted-foreground">No active deliveries</CardContent></Card>
            ) : (
              activeDeliveries.map(renderDeliveryCard)
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {completedDeliveries.length === 0 ? (
              <Card><CardContent className="pt-6 text-center text-muted-foreground">No completed deliveries</CardContent></Card>
            ) : (
              completedDeliveries.map(renderDeliveryCard)
            )}
          </TabsContent>
        </Tabs>
      </main>

      <BottomNav />
    </div>
  );
}
