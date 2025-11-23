import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, ArrowLeft, Loader2, Phone } from "lucide-react";
import { deliveryService } from "@/lib/deliveryService";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { LiveMap } from "@/components/LiveMap";
import { VideoCall } from "@/components/VideoCall";
import { useAuth } from "@/contexts/AuthContext";

export default function TrackDelivery() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [delivery, setDelivery] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [videoCallOpen, setVideoCallOpen] = useState(false);

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
        <Card>
          <CardHeader>
            <CardTitle>Live Drone Tracking</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-96 rounded-lg overflow-hidden">
              <LiveMap 
                height="100%" 
                showControls={true}
                center={delivery.pickup_lat && delivery.pickup_lng ? [delivery.pickup_lat, delivery.pickup_lng] : undefined}
                zoom={13}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex justify-between">
              <CardTitle>Delivery Status</CardTitle>
              <Badge className="bg-primary text-white">{delivery.status.toUpperCase()}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Pickup</p>
                <p className="font-medium">{delivery.pickup_location}</p>
                {delivery.pickup_lat && delivery.pickup_lng && (
                  <p className="text-xs text-muted-foreground">
                    {delivery.pickup_lat.toFixed(4)}, {delivery.pickup_lng.toFixed(4)}
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Drop-off</p>
                <p className="font-medium">{delivery.dropoff_location}</p>
                {delivery.dropoff_lat && delivery.dropoff_lng && (
                  <p className="text-xs text-muted-foreground">
                    {delivery.dropoff_lat.toFixed(4)}, {delivery.dropoff_lng.toFixed(4)}
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="font-medium">{format(new Date(delivery.created_at), "MMM d, h:mm a")}</p>
              </div>
              {delivery.estimated_time && (
                <div>
                  <p className="text-sm text-muted-foreground">Estimated Time</p>
                  <p className="font-medium">{delivery.estimated_time} minutes</p>
                </div>
              )}
              {delivery.operator_id && (delivery.status === "confirmed" || delivery.status === "in_flight") && (
                <div className="pt-4 border-t">
                  <Button
                    className="w-full"
                    onClick={() => setVideoCallOpen(true)}
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Call Operator
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
      <BottomNav />
      
      {/* Video Call Modal */}
      {videoCallOpen && delivery?.operator_id && (
        <VideoCall
          isOpen={videoCallOpen}
          onClose={() => setVideoCallOpen(false)}
          peerId={user?.id || ""}
          role="client"
          deliveryId={delivery.id}
        />
      )}
    </div>
  );
}
