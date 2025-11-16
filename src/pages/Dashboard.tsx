import { BottomNav } from "@/components/BottomNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, MapPin, Clock, Plus, Loader2, LogOut, Repeat2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDeliveries } from "@/hooks/useDeliveries";
import { format } from "date-fns";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, userRole, signOut } = useAuth();
  const { deliveries, loading } = useDeliveries(user?.id, userRole);

  const activeDeliveries = deliveries.filter(d => 
    ["confirmed", "in_flight", "arrived"].includes(d.status)
  );
  const pendingDeliveries = deliveries.filter(d => d.status === "pending");
  const completedDeliveries = deliveries.filter(d => d.status === "delivered");

  const getStatusColor = (status: string) => {
    // Keep the palette in a tight blue/white family so the dashboard feels cohesive
    switch (status) {
      case "in_flight":
        return "bg-sky-500";
      case "confirmed":
        return "bg-blue-600";
      case "pending":
        return "bg-slate-500";
      case "arrived":
        return "bg-indigo-500";
      case "delivered":
        return "bg-sky-400";
      default:
        return "bg-slate-600";
    }
  };

  const getStatusLabel = (status: string) => {
    return status.replace(/_/g, " ").toUpperCase();
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <header className="bg-sky-gradient text-white p-6 shadow-lg">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img src="/logo-final.png" alt="SkyLink" className="h-12 rounded-2xl bg-white/10 p-2" />
            <div>
              <h1 className="text-2xl font-bold">Dashboard</h1>
              <p className="text-white/90 mt-1">Welcome to SkyLink</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-3 text-sm">
            {user && (
              <span className="text-white/80">
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
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="bg-white/5 border-white/10">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-3xl font-semibold text-sky-400">{activeDeliveries.length}</p>
                    <p className="text-sm text-muted-foreground">Active</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white/5 border-white/10">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-3xl font-semibold text-sky-300">{completedDeliveries.length}</p>
                    <p className="text-sm text-muted-foreground">Completed</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white/5 border-white/10">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-3xl font-semibold text-slate-200">{pendingDeliveries.length}</p>
                    <p className="text-sm text-muted-foreground">Pending</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Button 
              onClick={() => navigate("/create-delivery")}
              className="w-full bg-sky-gradient hover:opacity-90 text-black font-semibold"
              size="lg"
            >
              <Plus className="mr-2 h-5 w-5" />
              New Delivery Request
            </Button>

            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle>Your Deliveries</CardTitle>
                <CardDescription>
                  {deliveries.length === 0 
                    ? "No deliveries yet. Create your first delivery request!" 
                    : "Track and manage your drone deliveries"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {deliveries.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Start by creating a new delivery request</p>
                  </div>
                ) : (
                  deliveries.slice(0, 5).map((delivery) => (
                    <div
                      key={delivery.id}
                      className="p-4 border rounded-lg space-y-3 cursor-pointer hover:bg-accent/5 transition-colors"
                      onClick={() => navigate(`/track/${delivery.id}`)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Package className="h-5 w-5 text-primary" />
                          <span className="font-semibold truncate">{delivery.package_note || "Package"}</span>
                        </div>
                        <Badge variant="secondary" className={`${getStatusColor(delivery.status)} text-white`}>
                          {getStatusLabel(delivery.status)}
                        </Badge>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium truncate">From: {delivery.pickup_location}</p>
                            <p className="text-muted-foreground truncate">To: {delivery.dropoff_location}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{format(new Date(delivery.created_at), "MMM d, h:mm a")}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
