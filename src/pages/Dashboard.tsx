import { BottomNav } from "@/components/BottomNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Package, MapPin, Clock, Plus, Loader2, LogOut, Repeat2, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDeliveries } from "@/hooks/useDeliveries";
import { deliveryService } from "@/lib/deliveryService";
import { format } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, userRole, signOut } = useAuth();
  const { deliveries, loading, refetch } = useDeliveries(user?.id, userRole);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deliveryToDelete, setDeliveryToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const canDelete = (delivery: any) => {
    // Only clients can delete their own deliveries
    if (userRole !== "client") return false;
    // Only allow deletion of pending, cancelled, or failed deliveries
    return ["pending", "cancelled", "failed"].includes(delivery.status);
  };

  const handleDeleteClick = (e: React.MouseEvent, deliveryId: string) => {
    e.stopPropagation(); // Prevent navigation
    setDeliveryToDelete(deliveryId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deliveryToDelete) return;

    setDeleting(true);
    try {
      await deliveryService.deleteDelivery(deliveryToDelete);
      toast.success("Delivery deleted successfully");
      setDeleteDialogOpen(false);
      setDeliveryToDelete(null);
      refetch?.(); // Refresh the list
    } catch (error: any) {
      toast.error(error.message || "Failed to delete delivery");
    } finally {
      setDeleting(false);
    }
  };

  const timelineDeliveries = [...activeDeliveries, ...pendingDeliveries].slice(0, 4);
  const corridorLive = activeDeliveries.length > 0 || pendingDeliveries.length > 0;

  return (
    <div className="relative min-h-screen text-foreground pb-24">
      <div className="absolute inset-0 opacity-[0.2] pointer-events-none bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.08),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(122,140,160,0.12),transparent_40%)]" />
      <header className="relative py-10">
        <div className="aero-shell space-y-6">
          <div className="glass-panel p-6 md:p-8 border-white/10 space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <img src="/logo-final.png" alt="SkyLink" className="h-14" />
                  <p className="text-xs uppercase tracking-[0.5em] text-white/60">Client cockpit</p>
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-semibold text-white">Mission control, from Dakar to your rooftop.</h1>
                  <p className="text-muted-foreground mt-2 max-w-2xl">
                    Track every parcel, reroute corridors, and stay synced with operators in one DJI-grade interface.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/20 text-white/80 hover:bg-white/10"
                  onClick={() => navigate("/select-role")}
                >
                  <Repeat2 className="h-3.5 w-3.5 mr-2" />
                  Switch role
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white/80 hover:bg-white/10"
                  onClick={signOut}
                >
                  <LogOut className="h-3.5 w-3.5 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="radial-outline p-4">
                <p className="text-xs uppercase tracking-[0.4em] text-white/50">Active flights</p>
                <p className="text-3xl font-semibold text-white mt-2">{activeDeliveries.length}</p>
              </div>
              <div className="radial-outline p-4">
                <p className="text-xs uppercase tracking-[0.4em] text-white/50">Completed</p>
                <p className="text-3xl font-semibold text-white mt-2">{completedDeliveries.length}</p>
              </div>
              <div className="radial-outline p-4">
                <p className="text-xs uppercase tracking-[0.4em] text-white/50">Awaiting launch</p>
                <p className="text-3xl font-semibold text-white mt-2">{pendingDeliveries.length}</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                size="lg"
                className="flex-1 bg-gradient-to-r from-primary via-primary/90 to-white/80 text-background font-semibold"
                onClick={() => navigate("/create-delivery")}
              >
                <Plus className="mr-2 h-5 w-5" />
                New delivery request
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="flex-1 border-white/20 text-white/80 hover:bg-white/5"
                onClick={() => navigate("/history")}
              >
                View history
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="relative aero-shell space-y-8">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
              <Card className="glass-panel border-white/10 bg-white/5">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <CardTitle className="text-white">Your Deliveries</CardTitle>
                      <CardDescription>
                        {deliveries.length === 0 
                          ? "No deliveries yet. Create your first delivery request!" 
                          : "Track and manage your drone deliveries"}
                      </CardDescription>
                    </div>
                    {user && (
                      <span className="text-xs text-white/60 tracking-[0.4em] uppercase">{user.email}</span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {deliveries.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>Start by creating a new delivery request</p>
                    </div>
                  ) : (
                    deliveries.slice(0, 5).map((delivery) => {
                      const hasOperator = !!delivery.operator_id;
                      const operatorLabel =
                        !hasOperator && delivery.status === "pending"
                          ? "Looking for an available operator"
                          : hasOperator && delivery.status === "confirmed"
                          ? "Operator assigned — waiting to launch"
                          : hasOperator && ["in_flight", "arrived"].includes(delivery.status)
                          ? "Operator is flying this mission"
                          : hasOperator && delivery.status === "delivered"
                          ? "Completed by operator"
                          : "Status updating";

                      return (
                        <div
                          key={delivery.id}
                          className="p-4 border border-white/5 rounded-2xl space-y-3 cursor-pointer hover:bg-white/5 transition-colors relative"
                          onClick={() => navigate(`/track/${delivery.id}`)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <Package className="h-5 w-5 text-primary" />
                              <span className="font-semibold truncate">{delivery.package_note || "Package"}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className={`${getStatusColor(delivery.status)} text-white`}>
                                {getStatusLabel(delivery.status)}
                              </Badge>
                              {canDelete(delivery) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={(e) => handleDeleteClick(e, delivery.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-start gap-2">
                              <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                              <div className="min-w-0">
                                <p className="font-medium truncate">From: {delivery.pickup_location}</p>
                                <p className="text-muted-foreground truncate">To: {delivery.dropoff_location}</p>
                              </div>
                            </div>
                            <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                <span>{format(new Date(delivery.created_at), "MMM d, h:mm a")}</span>
                              </div>
                              <span className="text-sky-200">
                                {operatorLabel}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>

              <div className="space-y-6">
                <div className="glass-panel p-6 border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">Mission timeline</h3>
                    <Badge variant="outline" className="text-xs text-white/70 border-white/20">
                      {timelineDeliveries.length} tracked
                    </Badge>
                  </div>
                  {timelineDeliveries.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No active or pending deliveries yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {timelineDeliveries.map((delivery) => (
                        <div key={delivery.id} className="flex gap-3">
                          <div className={`mt-1 h-3 w-3 rounded-full ${getStatusColor(delivery.status)}`} />
                          <div className="flex-1">
                            <div className="flex items-center justify-between text-sm">
                              <p className="font-semibold text-white">
                                #{delivery.id.slice(0, 8).toUpperCase()} • {getStatusLabel(delivery.status)}
                              </p>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(delivery.created_at), "MMM d, HH:mm")}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {delivery.pickup_location} → {delivery.dropoff_location}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="glass-panel p-6 border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">Corridor status</h3>
                    <Badge className={corridorLive ? "bg-green-500/20 text-green-200" : "bg-slate-700 text-slate-200"}>
                      {corridorLive ? "Live" : "Idle"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Operators receive missions instantly. Corridors auto-balance based on wind, no-fly events, and AI locks.
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="radial-outline p-3">
                      <p className="text-xs uppercase tracking-[0.3em] text-white/50">Confirmed</p>
                      <p className="text-2xl font-semibold text-white">{completedDeliveries.length + activeDeliveries.length}</p>
                    </div>
                    <div className="radial-outline p-3">
                      <p className="text-xs uppercase tracking-[0.3em] text-white/50">Queued</p>
                      <p className="text-2xl font-semibold text-white">{pendingDeliveries.length}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      <BottomNav />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Delivery</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this delivery? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
