import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, ArrowLeft, Loader2 } from "lucide-react";
import { deliveryService } from "@/lib/deliveryService";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export default function TrackDelivery() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [delivery, setDelivery] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    deliveryService.getDelivery(id).then(setDelivery).catch(() => navigate("/dashboard")).finally(() => setLoading(false));
    
    const channel = supabase.channel(`delivery-${id}`).on("postgres_changes", { event: "UPDATE", schema: "public", table: "deliveries", filter: `id=eq.${id}` }, (p) => setDelivery(p.new)).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, navigate]);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!delivery) return null;

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-sky-gradient text-white p-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="text-white"><ArrowLeft className="h-5 w-5" /></Button>
          <div><h1 className="text-2xl font-bold">Live Tracking</h1></div>
        </div>
      </header>
      <main className="p-4 space-y-6 max-w-4xl mx-auto">
        <Card className="h-96 bg-muted/30"><CardContent className="p-0 h-full flex items-center justify-center"><div className="text-center"><MapPin className="h-12 w-12 mx-auto mb-3 text-primary" /><p className="font-medium">Map Integration</p></div></CardContent></Card>
        <Card><CardHeader><div className="flex justify-between"><CardTitle>Delivery Status</CardTitle><Badge className="bg-primary text-white">{delivery.status.toUpperCase()}</Badge></div></CardHeader><CardContent><div className="space-y-3"><div><p className="text-sm text-muted-foreground">Pickup</p><p className="font-medium">{delivery.pickup_location}</p></div><div><p className="text-sm text-muted-foreground">Drop-off</p><p className="font-medium">{delivery.dropoff_location}</p></div><div><p className="text-sm text-muted-foreground">Created</p><p className="font-medium">{format(new Date(delivery.created_at), "MMM d, h:mm a")}</p></div></div></CardContent></Card>
      </main>
      <BottomNav />
    </div>
  );
}
