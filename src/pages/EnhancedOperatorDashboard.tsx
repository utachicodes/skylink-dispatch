import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Package, MapPin, Clock, Check, X, Coins, LogOut, Bell, 
  TrendingUp, Activity, Zap, Users, DollarSign, Target,
  Calendar, BarChart3, ArrowUpRight, ChevronRight
} from "lucide-react";
import { deliveryService } from "@/lib/deliveryService";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function EnhancedOperatorDashboard() {
  const { user, userRole, signOut } = useAuth();
  const navigate = useNavigate();
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!user || !userRole) return;

    const fetchData = async () => {
      try {
        // Fetch deliveries
        const { data: deliveryData, error: deliveryError } = await supabase
          .from("deliveries")
          .select("*")
          .or(`operator_id.eq.${user.id},status.eq.pending`)
          .order("created_at", { ascending: false });

        if (deliveryError) throw deliveryError;
        setDeliveries(deliveryData || []);

        // Fetch profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        
        setProfile(profileData);

        // Mock notifications (in production, fetch from database)
        setNotifications([
          { id: 1, message: "New delivery request available", time: "5 min ago", type: "info" },
          { id: 2, message: "Delivery #ABC123 completed successfully", time: "1 hour ago", type: "success" },
          { id: 3, message: "Monthly earnings report available", time: "2 hours ago", type: "info" },
        ]);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Set up realtime subscription
    const channel = supabase
      .channel('deliveries-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deliveries',
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, userRole]);

  const stats = useMemo(() => {
    const myDeliveries = deliveries.filter(d => d.operator_id === user?.id);
    const completed = myDeliveries.filter((d) => d.status === "delivered").length;
    const active = myDeliveries.filter((d) => 
      d.status === "in_flight" || d.status === "confirmed"
    ).length;
    const totalPoints = myDeliveries
      .filter((d) => d.status === "delivered")
      .reduce((sum, d) => sum + (d.points_cost || 0), 0);

    // Calculate this week's deliveries
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const weeklyDeliveries = myDeliveries.filter(
      (d) => new Date(d.created_at) > oneWeekAgo && d.status === "delivered"
    ).length;

    return {
      totalDeliveries: myDeliveries.length,
      completed,
      active,
      pointsEarned: totalPoints,
      weeklyDeliveries,
      successRate: myDeliveries.length > 0 ? Math.round((completed / myDeliveries.length) * 100) : 0,
    };
  }, [deliveries, user]);

  const pendingDeliveries = deliveries.filter((d) => d.status === "pending" && !d.operator_id);
  const myActiveDeliveries = deliveries.filter((d) => 
    d.operator_id === user?.id && (d.status === "confirmed" || d.status === "in_flight")
  );
  const myCompletedDeliveries = deliveries.filter((d) => 
    d.operator_id === user?.id && d.status === "delivered"
  );

  const handleAccept = async (delivery: any) => {
    if (!user) return;
    try {
      await deliveryService.assignOperator(delivery.id, user.id);
      toast.success("Delivery accepted successfully");
    } catch (error: any) {
      toast.error(error?.message || "Failed to accept delivery");
    }
  };

  const handleDecline = async (delivery: any) => {
    toast.info("Delivery declined");
    setDeliveries(prev => prev.filter(d => d.id !== delivery.id));
  };

  const renderDeliveryCard = (delivery: any, showActions = true) => (
    <Card key={delivery.id} className="group hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">#{delivery.id.substring(0, 8).toUpperCase()}</CardTitle>
              <CardDescription className="flex items-center gap-2 text-xs mt-1">
                <Clock className="h-3 w-3" />
                {new Date(delivery.created_at).toLocaleDateString()}
              </CardDescription>
            </div>
          </div>
          <Badge 
            variant={
              delivery.status === "delivered" ? "default" :
              delivery.status === "in_flight" ? "secondary" :
              "outline"
            }
            className="capitalize"
          >
            {delivery.status.replace("_", " ")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
            <MapPin className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-muted-foreground">Pickup</p>
              <p className="text-sm font-medium truncate">{delivery.pickup_location}</p>
            </div>
          </div>
          <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
            <MapPin className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-muted-foreground">Dropoff</p>
              <p className="text-sm font-medium truncate">{delivery.dropoff_location}</p>
            </div>
          </div>
        </div>
        
        {delivery.package_note && (
          <div className="p-3 bg-muted/50 rounded-lg border border-border/50">
            <p className="text-xs text-muted-foreground line-clamp-2">{delivery.package_note}</p>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-2.5 py-1 bg-primary/10 rounded-md">
              <Coins className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm text-primary">{delivery.points_cost || 100}</span>
            </div>
            {delivery.package_size && (
              <Badge variant="outline" className="text-xs">{delivery.package_size}</Badge>
            )}
          </div>
          
          {showActions && delivery.status === "pending" && !delivery.operator_id && (
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
          
          {delivery.operator_id === user?.id && (delivery.status === "confirmed" || delivery.status === "in_flight") && (
            <Button size="sm" onClick={() => navigate(`/pilot/delivery/${delivery.id}`)}>
              Control
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-4">
            <img src="/logo-final.png" alt="SkyLink" className="h-10" />
            <div className="hidden md:block">
              <h1 className="text-xl font-bold">Operator Dashboard</h1>
              <p className="text-xs text-muted-foreground">Manage your deliveries</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
              )}
            </Button>
            <Avatar className="cursor-pointer" onClick={() => navigate("/profile")}>
              <AvatarFallback className="bg-primary text-primary-foreground">
                {profile?.name?.charAt(0) || "O"}
              </AvatarFallback>
            </Avatar>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Welcome back, {profile?.name || "Operator"}!</h2>
            <p className="text-muted-foreground mt-1">
              {stats.active > 0 ? `You have ${stats.active} active deliveries` : "No active deliveries right now"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              <Users className="h-4 w-4 mr-2" />
              Switch to Client
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-primary/10 rounded-full blur-2xl" />
            <CardHeader className="pb-2 relative">
              <div className="flex items-center justify-between">
                <CardDescription className="text-xs">Total Deliveries</CardDescription>
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Package className="h-4 w-4 text-primary" />
                </div>
              </div>
              <CardTitle className="text-3xl font-bold">{stats.totalDeliveries}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 text-green-500" />
                <span>All time</span>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/10 rounded-full blur-2xl" />
            <CardHeader className="pb-2 relative">
              <div className="flex items-center justify-between">
                <CardDescription className="text-xs">Completed</CardDescription>
                <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Check className="h-4 w-4 text-green-500" />
                </div>
              </div>
              <CardTitle className="text-3xl font-bold">{stats.completed}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Target className="h-3 w-3" />
                <span>{stats.successRate}% success rate</span>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full blur-2xl" />
            <CardHeader className="pb-2 relative">
              <div className="flex items-center justify-between">
                <CardDescription className="text-xs">Active Now</CardDescription>
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Activity className="h-4 w-4 text-blue-500" />
                </div>
              </div>
              <CardTitle className="text-3xl font-bold">{stats.active}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Zap className="h-3 w-3" />
                <span>In progress</span>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-yellow-500/10 rounded-full blur-2xl" />
            <CardHeader className="pb-2 relative">
              <div className="flex items-center justify-between">
                <CardDescription className="text-xs">Points Earned</CardDescription>
                <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                  <DollarSign className="h-4 w-4 text-yellow-500" />
                </div>
              </div>
              <CardTitle className="text-3xl font-bold">{stats.pointsEarned}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>{stats.weeklyDeliveries} this week</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="cursor-pointer hover:border-primary/50 transition-all" onClick={() => navigate("/create-delivery")}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Request Delivery</CardTitle>
                  <CardDescription className="text-xs">As a client</CardDescription>
                </div>
                <ArrowUpRight className="h-5 w-5 text-muted-foreground ml-auto" />
              </div>
            </CardHeader>
          </Card>

          <Card className="cursor-pointer hover:border-primary/50 transition-all">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <CardTitle className="text-base">View Analytics</CardTitle>
                  <CardDescription className="text-xs">Performance insights</CardDescription>
                </div>
                <ArrowUpRight className="h-5 w-5 text-muted-foreground ml-auto" />
              </div>
            </CardHeader>
          </Card>

          <Card className="cursor-pointer hover:border-primary/50 transition-all" onClick={() => navigate("/history")}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <CardTitle className="text-base">Delivery History</CardTitle>
                  <CardDescription className="text-xs">View past jobs</CardDescription>
                </div>
                <ArrowUpRight className="h-5 w-5 text-muted-foreground ml-auto" />
              </div>
            </CardHeader>
          </Card>
        </div>

        <Separator />

        {/* Delivery Tabs */}
        <Tabs defaultValue="available" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 h-11">
            <TabsTrigger value="available" className="relative">
              Available Jobs
              {pendingDeliveries.length > 0 && (
                <Badge className="ml-2 h-5 min-w-[1.25rem] px-1" variant="destructive">
                  {pendingDeliveries.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="active" className="relative">
              My Active
              {myActiveDeliveries.length > 0 && (
                <Badge className="ml-2 h-5 min-w-[1.25rem] px-1" variant="secondary">
                  {myActiveDeliveries.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed">My Completed</TabsTrigger>
          </TabsList>

          <TabsContent value="available" className="space-y-4">
            {pendingDeliveries.length === 0 ? (
              <Card>
                <CardContent className="pt-10 pb-10 text-center">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">No available deliveries at the moment</p>
                  <p className="text-sm text-muted-foreground mt-1">Check back later for new opportunities</p>
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-4">
                  {pendingDeliveries.map(d => renderDeliveryCard(d, true))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="active" className="space-y-4">
            {myActiveDeliveries.length === 0 ? (
              <Card>
                <CardContent className="pt-10 pb-10 text-center">
                  <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">No active deliveries</p>
                  <p className="text-sm text-muted-foreground mt-1">Accept a delivery to get started</p>
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-4">
                  {myActiveDeliveries.map(d => renderDeliveryCard(d, false))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {myCompletedDeliveries.length === 0 ? (
              <Card>
                <CardContent className="pt-10 pb-10 text-center">
                  <Check className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">No completed deliveries yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Your delivery history will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-4">
                  {myCompletedDeliveries.map(d => renderDeliveryCard(d, false))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <BottomNav />
    </div>
  );
}
