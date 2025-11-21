import { BottomNav } from "@/components/BottomNav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, MapPin, Calendar, Loader2, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useDeliveries } from "@/hooks/useDeliveries";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

export default function History() {
  const { user, userRole } = useAuth();
  const { deliveries, loading } = useDeliveries(user?.id, userRole);
  const navigate = useNavigate();

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

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <header className="bg-sky-gradient text-white p-6 shadow-lg">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={goBack}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Delivery History</h1>
            <p className="text-white/90 mt-1">Your past deliveries</p>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4 max-w-4xl mx-auto">
        {loading ? (
          <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : deliveries.length === 0 ? (
          <Card><CardContent className="p-12 text-center"><Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" /><p className="text-muted-foreground">No deliveries yet</p></CardContent></Card>
        ) : (
          deliveries.map((d) => (
            <Card key={d.id}><CardContent className="p-4"><div className="flex justify-between mb-3"><div className="flex gap-2"><Package className="h-5 w-5 text-primary" /><span className="font-semibold">#{d.id.slice(0, 8)}</span></div><Badge className={getStatusColor(d.status)}>{d.status.toUpperCase()}</Badge></div><div className="space-y-2 text-sm"><div className="flex gap-2"><MapPin className="h-4 w-4 text-primary mt-0.5" /><div><p className="font-medium">From: {d.pickup_location}</p><p className="text-muted-foreground">To: {d.dropoff_location}</p></div></div><div className="flex gap-2 text-muted-foreground"><Calendar className="h-4 w-4" /><span>{format(new Date(d.created_at), "MMM d, yyyy 'at' h:mm a")}</span></div></div></CardContent></Card>
          ))
        )}
      </main>
      <BottomNav />
    </div>
  );
}
