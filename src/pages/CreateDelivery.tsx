import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { deliveryService } from "@/lib/deliveryService";

export default function CreateDelivery() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    pickup_location: "",
    dropoff_location: "",
    package_size: "medium",
    package_weight: "",
    package_note: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const delivery = await deliveryService.createDelivery({
        client_id: user.id,
        pickup_location: formData.pickup_location,
        dropoff_location: formData.dropoff_location,
        pickup_lat: 14.7167,
        pickup_lng: -17.4677,
        dropoff_lat: 14.6937,
        dropoff_lng: -17.4441,
        package_size: formData.package_size,
        package_weight: formData.package_weight ? parseFloat(formData.package_weight) : null,
        package_note: formData.package_note || null,
        status: "pending",
      });

      toast.success("Delivery request created!");
      navigate(`/track/${delivery.id}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to create delivery");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <header className="bg-sky-gradient text-white p-6 shadow-lg">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="text-white hover:bg-white/10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">New Delivery</h1>
            <p className="text-white/90 mt-1">Request a drone delivery</p>
          </div>
        </div>
      </header>

      <main className="p-4 max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Delivery Details</CardTitle>
            <CardDescription>Fill in the information for your delivery request</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="pickup">Pickup Location</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="pickup" placeholder="e.g., Dakar Port" className="pl-10" value={formData.pickup_location} onChange={(e) => setFormData({ ...formData, pickup_location: e.target.value })} required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dropoff">Drop-off Location</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="dropoff" placeholder="e.g., Gorée Island" className="pl-10" value={formData.dropoff_location} onChange={(e) => setFormData({ ...formData, dropoff_location: e.target.value })} required />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="size">Package Size</Label>
                  <Select value={formData.package_size} onValueChange={(value) => setFormData({ ...formData, package_size: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small (up to 2kg)</SelectItem>
                      <SelectItem value="medium">Medium (2-5kg)</SelectItem>
                      <SelectItem value="large">Large (5-10kg)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input id="weight" type="number" step="0.1" placeholder="e.g., 2.5" value={formData.package_weight} onChange={(e) => setFormData({ ...formData, package_weight: e.target.value })} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="note">Package Details (Optional)</Label>
                <Textarea id="note" placeholder="Any special instructions..." rows={3} value={formData.package_note} onChange={(e) => setFormData({ ...formData, package_note: e.target.value })} />
              </div>

              <Button type="submit" className="w-full bg-sky-gradient" disabled={loading}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : "Create Delivery Request"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
}
