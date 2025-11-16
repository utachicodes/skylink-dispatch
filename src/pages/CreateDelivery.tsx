import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, MapPin, Package, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { coreApi } from "@/lib/api";

export default function CreateDelivery() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    pickupLocation: "",
    pickupLat: "",
    pickupLng: "",
    dropoffLocation: "",
    dropoffLat: "",
    dropoffLng: "",
    packageWeight: "",
    packageSize: "",
    packageNote: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("deliveries").insert({
        client_id: user.id,
        pickup_location: formData.pickupLocation,
        pickup_lat: parseFloat(formData.pickupLat) || 0,
        pickup_lng: parseFloat(formData.pickupLng) || 0,
        dropoff_location: formData.dropoffLocation,
        dropoff_lat: parseFloat(formData.dropoffLat) || 0,
        dropoff_lng: parseFloat(formData.dropoffLng) || 0,
        package_weight: formData.packageWeight ? parseFloat(formData.packageWeight) : null,
        package_size: formData.packageSize || null,
        package_note: formData.packageNote || null,
        status: "pending",
      });

      if (error) throw error;

      try {
        await coreApi.createMission({
          clientName: user.user_metadata?.full_name || user.email || "Client",
          pickup: formData.pickupLocation,
          dropoff: formData.dropoffLocation,
          priority: "express",
          packageDetails: `${formData.packageWeight || "?"}kg • ${formData.packageSize || "N/A"}`,
          etaMinutes: 12,
        });
      } catch (apiError: any) {
        console.warn("Core server not reachable:", apiError?.message);
      }

      toast.success("Request sent");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Couldn't create request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-sky-gradient text-white p-4 shadow-lg sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <img src="/logo-final.png" alt="SkyLink" className="h-10 rounded-xl bg-white/10 p-2" />
            <div>
              <h1 className="text-xl font-bold">Create Delivery</h1>
              <p className="text-white/70 text-sm">Operations HQ · Dakar, Senegal</p>
            </div>
          </div>
        </div>
      </header>

      <main className="p-4 max-w-2xl mx-auto space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Pickup Location
              </CardTitle>
              <CardDescription>Where should we pick up your package?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pickupLocation">Address</Label>
                <Input
                  id="pickupLocation"
                  placeholder="123 Main St, City, State"
                  value={formData.pickupLocation}
                  onChange={(e) => setFormData({ ...formData, pickupLocation: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pickupLat">Latitude</Label>
                  <Input
                    id="pickupLat"
                    type="number"
                    step="0.000001"
                    placeholder="40.712776"
                    value={formData.pickupLat}
                    onChange={(e) => setFormData({ ...formData, pickupLat: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pickupLng">Longitude</Label>
                  <Input
                    id="pickupLng"
                    type="number"
                    step="0.000001"
                    placeholder="-74.005974"
                    value={formData.pickupLng}
                    onChange={(e) => setFormData({ ...formData, pickupLng: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-accent" />
                Dropoff Location
              </CardTitle>
              <CardDescription>Where should we deliver your package?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dropoffLocation">Address</Label>
                <Input
                  id="dropoffLocation"
                  placeholder="456 Oak Ave, City, State"
                  value={formData.dropoffLocation}
                  onChange={(e) => setFormData({ ...formData, dropoffLocation: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dropoffLat">Latitude</Label>
                  <Input
                    id="dropoffLat"
                    type="number"
                    step="0.000001"
                    placeholder="40.758896"
                    value={formData.dropoffLat}
                    onChange={(e) => setFormData({ ...formData, dropoffLat: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dropoffLng">Longitude</Label>
                  <Input
                    id="dropoffLng"
                    type="number"
                    step="0.000001"
                    placeholder="-73.985130"
                    value={formData.dropoffLng}
                    onChange={(e) => setFormData({ ...formData, dropoffLng: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Package Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="packageWeight">Weight (kg)</Label>
                  <Input
                    id="packageWeight"
                    type="number"
                    step="0.01"
                    placeholder="2.5"
                    value={formData.packageWeight}
                    onChange={(e) => setFormData({ ...formData, packageWeight: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="packageSize">Size</Label>
                  <Input
                    id="packageSize"
                    placeholder="Small, Medium, Large"
                    value={formData.packageSize}
                    onChange={(e) => setFormData({ ...formData, packageSize: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="packageNote">Special Instructions</Label>
                <Textarea
                  id="packageNote"
                  placeholder="Any special handling instructions..."
                  value={formData.packageNote}
                  onChange={(e) => setFormData({ ...formData, packageNote: e.target.value })}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Button
            type="submit"
            className="w-full bg-sky-gradient hover:opacity-90"
            size="lg"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating request...
              </>
            ) : (
              "Submit Delivery Request"
            )}
          </Button>
        </form>
      </main>
    </div>
  );
}
