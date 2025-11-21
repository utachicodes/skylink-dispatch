import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Plane, Package, Activity, Settings, Coins, TrendingUp, AlertCircle, LogOut, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { coreApi } from "@/lib/api";
import { LiveMap } from "@/components/LiveMap";
import { DroneManager } from "@/components/DroneManager";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface Stats {
  totalUsers: number;
  activeDrones: number;
  deliveriesToday: number;
  successRate: number;
  pointsToday: number;
  activeMissions: number;
}

export default function AdminDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    activeDrones: 0,
    deliveriesToday: 0,
    successRate: 0,
    pointsToday: 0,
    activeMissions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [missions, setMissions] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load users count
      const { count: userCount } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      
      // Load drones
      const { data: drones, count: droneCount } = await supabase
        .from("drones")
        .select("*", { count: "exact" })
        .eq("is_active", true);
      
      // Load deliveries
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data: deliveries, count: deliveryCount } = await supabase
        .from("deliveries")
        .select("*", { count: "exact" })
        .gte("created_at", today.toISOString());
      
      // Load missions (gracefully handle API failures)
      let activeMissions: any[] = [];
      try {
        activeMissions = await coreApi.listActiveMissions();
      } catch (error) {
        console.warn("Failed to load missions from core API:", error);
        // Continue with empty array
      }
      
      // Calculate success rate
      const completed = deliveries?.filter((d) => d.status === "delivered") || [];
      const successRate = deliveries && deliveries.length > 0 
        ? Math.round((completed.length / deliveries.length) * 100) 
        : 0;

      // Calculate total points for today
      const pointsToday = deliveries?.reduce((sum, d) => sum + (d.points_cost || 0), 0) || 0;

      // Load recent activity from logs
      const { data: logs } = await supabase
        .from("logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      setStats({
        totalUsers: userCount || 0,
        activeDrones: droneCount || 0,
        deliveriesToday: deliveryCount || 0,
        successRate,
        pointsToday,
        activeMissions: activeMissions.length,
      });
      
      setRecentActivity(logs || []);
      setMissions(activeMissions);
    } catch (error: any) {
      console.error("Failed to load dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-sky-gradient text-white p-6 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/select-role")}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <button
              type="button"
              onClick={() => window.location.href = "/admin"}
              className="focus:outline-none"
            >
              <img src="/logo-final.png" alt="SkyLink" className="h-12 animate-logo-glow" />
            </button>
            <div>
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-white/90 mt-1">System overview and management</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-3 text-sm">
            {user && (
              <span className="text-white/80 truncate max-w-[220px]">
                {user.email}
              </span>
            )}
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

      <main className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          <Card className="bg-white/5 border-white/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-3xl font-semibold text-sky-400">{stats.totalUsers}</p>
                </div>
                <Users className="h-8 w-8 text-sky-300" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Drones</p>
                  <p className="text-3xl font-semibold text-sky-300">{stats.activeDrones}</p>
                </div>
                <Plane className="h-8 w-8 text-sky-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Deliveries Today</p>
                  <p className="text-3xl font-semibold text-slate-100">{stats.deliveriesToday}</p>
                </div>
                <Package className="h-8 w-8 text-sky-300" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                  <p className="text-3xl font-semibold text-sky-200">{stats.successRate}%</p>
                </div>
                <Activity className="h-8 w-8 text-sky-300" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Points Today</p>
                  <p className="text-3xl font-semibold text-sky-300">{stats.pointsToday.toLocaleString()} pts</p>
                </div>
                  <Coins className="h-8 w-8 text-sky-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Missions</p>
                  <p className="text-3xl font-semibold text-sky-300">{stats.activeMissions}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-sky-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="drones">Drones</TabsTrigger>
            <TabsTrigger value="missions">Missions</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="map">Live Map</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest system events</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {recentActivity.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No recent activity</div>
                  ) : (
                    recentActivity.map((activity, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              activity.severity === "error"
                                ? "bg-red-500"
                                : activity.severity === "warning"
                                ? "bg-yellow-500"
                                : "bg-green-500"
                            }`}
                          />
                          <div>
                            <p className="font-medium text-sm">{activity.message}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(activity.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant={
                            activity.severity === "error"
                              ? "destructive"
                              : activity.severity === "warning"
                              ? "secondary"
                              : "default"
                          }
                        >
                          {activity.severity || "info"}
                        </Badge>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Active Missions</CardTitle>
                  <CardDescription>Currently in progress</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {missions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No active missions</div>
                  ) : (
                    missions.map((mission) => (
                      <div key={mission.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">Mission #{mission.id.slice(0, 8)}</p>
                          <p className="text-xs text-muted-foreground">
                            {mission.pickup} → {mission.dropoff}
                          </p>
                        </div>
                        <Badge variant={mission.status === "in-flight" ? "default" : "secondary"}>
                          {mission.status}
                        </Badge>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="drones">
            <DroneManager />
          </TabsContent>

          <TabsContent value="missions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>All Missions</CardTitle>
                <CardDescription>View and manage all delivery missions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {missions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No missions found</div>
                  ) : (
                    missions.map((mission) => (
                      <div key={mission.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">Mission #{mission.id.slice(0, 8)}</h3>
                            <Badge variant="outline">{mission.priority || "standard"}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            <strong>From:</strong> {mission.pickup}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            <strong>To:</strong> {mission.dropoff}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            Created: {new Date(mission.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Badge>{mission.status}</Badge>
                          {mission.operatorId && (
                            <span className="text-xs text-muted-foreground">Operator: {mission.operatorId.slice(0, 8)}</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <UserManager />
          </TabsContent>

          <TabsContent value="map">
            <Card>
              <CardHeader>
                <CardTitle>Live Drone Tracking Map</CardTitle>
                <CardDescription>All active drones in real-time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[600px] rounded-lg overflow-hidden">
                  <LiveMap height="100%" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function UserManager() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          *,
          user_roles(role)
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, role: "client" | "operator" | "admin") => {
    try {
      // Delete existing roles
      await supabase.from("user_roles").delete().eq("user_id", userId);
      // Add new role
      await supabase.from("user_roles").insert({ user_id: userId, role });
      toast.success("User role updated");
      loadUsers();
    } catch (error: any) {
      toast.error(error.message || "Failed to update role");
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading users...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Management</CardTitle>
        <CardDescription>Manage user accounts and roles</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {users.map((user) => {
            const role = user.user_roles?.[0]?.role || "client";
            return (
              <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-semibold">{user.name || "Unknown"}</h3>
                  <p className="text-sm text-muted-foreground">{user.id}</p>
                  <p className="text-xs text-muted-foreground">
                    Joined: {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={role === "admin" ? "default" : role === "operator" ? "secondary" : "outline"}>
                    {role}
                  </Badge>
                  <select
                    className="px-3 py-1 border rounded text-sm"
                    value={role}
                    onChange={(e) => updateUserRole(user.id, e.target.value as any)}
                  >
                    <option value="client">Client</option>
                    <option value="operator">Operator</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
