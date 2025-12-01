import { BottomNav } from "@/components/BottomNav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Package, MapPin, Calendar, Loader2, ArrowLeft, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useDeliveries } from "@/hooks/useDeliveries";
import { deliveryService } from "@/lib/deliveryService";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

export default function History() {
  const { user, userRole } = useAuth();
  const { deliveries, loading, refetch } = useDeliveries(user?.id, userRole);
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deliveryToDelete, setDeliveryToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const getStatusColor = (status: string) => {
    return status === "delivered" ? "bg-emerald-500 text-white" : "bg-red-500 text-white";
  };

  const goBack = () => {
    if (userRole === "operator") {
      navigate("/operator");
    } else if (userRole === "admin") {
      navigate("/admin");
    } else {
      navigate("/dashboard");
    }
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

  return (
    <div className="relative min-h-screen text-foreground pb-24">
      <div className="aero-shell relative py-10">
        <div className="glass-panel p-6 md:p-8 border-white/10 space-y-6 mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={goBack}
              className="text-white/80 hover:bg-white/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-semibold text-white">Delivery History</h1>
              <p className="text-white/70 mt-1">Your past deliveries</p>
            </div>
          </div>
        </div>

        <main className="space-y-4">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : deliveries.length === 0 ? (
            <Card className="glass-panel border-white/10">
              <CardContent className="p-12 text-center">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No deliveries yet</p>
              </CardContent>
            </Card>
          ) : (
          deliveries.map((d) => (
            <Card key={d.id} className="hover:bg-accent/5 transition-colors">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex gap-2 items-center">
                    <Package className="h-5 w-5 text-primary" />
                    <span className="font-semibold">#{d.id.slice(0, 8)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(d.status)}>{d.status.toUpperCase()}</Badge>
                    {canDelete(d) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => handleDeleteClick(e, d.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex gap-2">
                    <MapPin className="h-4 w-4 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">From: {d.pickup_location}</p>
                      <p className="text-muted-foreground">To: {d.dropoff_location}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{format(new Date(d.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
          )}
        </main>
      </div>
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
