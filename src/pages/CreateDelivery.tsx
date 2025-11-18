import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Package, ArrowRight, Coins, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function CreateDelivery() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [userPoints, setUserPoints] = useState(0);
  const deliveryCost = 100;

  useEffect(() => {
    const loadUserPoints = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("points")
          .eq("id", user.id)
          .single();

        if (error) throw error;
        setUserPoints(data?.points || 0);
      } catch (error) {
        console.error("Error loading points:", error);
      }
    };

    loadUserPoints();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    setLoading(true);
    try {
      if (!user) throw new Error("Not authenticated");

      if (userPoints < deliveryCost) {
        toast.error("Insufficient points. You need 100 points to create a delivery.");
        setLoading(false);
        return;
      }

      const { data: deductResult, error: deductError } = await supabase
        .rpc("deduct_points", {
          _user_id: user.id,
          _points: deliveryCost,
        });

      if (deductError || !deductResult) {
        toast.error("Failed to deduct points");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("deliveries")
        .insert({
          client_id: user.id,
          pickup_location: formData.get("pickup") as string,
          dropoff_location: formData.get("dropoff") as string,
          package_size: formData.get("packageSize") as string,
          package_weight: parseFloat(formData.get("packageWeight") as string),
          package_note: formData.get("packageNote") as string,
          pickup_lat: 37.7749,
          pickup_lng: -122.4194,
          dropoff_lat: 37.8049,
          dropoff_lng: -122.4294,
          status: "pending",
          points_cost: deliveryCost,
        })
        .select()
        .single();

      if (error) throw error;

      setUserPoints((prev) => prev - deliveryCost);
      toast.success("Delivery request created successfully!");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Failed to create delivery");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-sky-gradient text-white p-6 shadow-lg">
        <h1 className="text-2xl font-bold">New Delivery</h1>
        <p className="text-white/90 mt-1">Create a delivery request</p>
      </header>

      <main className="p-4 pb-24 max-w-2xl mx-auto">
        <Alert className="mb-4 border-primary/50 bg-primary/5">
          <Coins className="h-4 w-4 text-primary" />
          <AlertDescription className="ml-2 flex items-center justify-between">
            <span>
              <strong className="text-primary">Your Points: {userPoints.toLocaleString()}</strong>
              <span className="text-muted-foreground ml-2">• Cost: {deliveryCost} points</span>
            </span>
            {userPoints < deliveryCost && (
              <span className="text-destructive flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                Insufficient Points
              </span>
            )}
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>New Delivery Request</CardTitle>
            <CardDescription>Fill in the details for your delivery</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="pickup">Pickup Location</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="pickup"
                    name="pickup"
                    placeholder="Enter pickup address"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dropoff">Dropoff Location</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="dropoff"
                    name="dropoff"
                    placeholder="Enter delivery address"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="packageSize">Package Size</Label>
                  <Select name="packageSize" defaultValue="medium" required>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="packageWeight">Weight (kg)</Label>
                  <div className="relative">
                    <Package className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="packageWeight"
                      name="packageWeight"
                      type="number"
                      step="0.1"
                      placeholder="2.5"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="packageNote">Package Notes (Optional)</Label>
                <Textarea
                  id="packageNote"
                  name="packageNote"
                  placeholder="Special instructions or package details"
                  rows={3}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                size="lg" 
                disabled={loading || userPoints < deliveryCost}
              >
                {loading ? "Creating..." : userPoints < deliveryCost ? "Insufficient Points" : "Create Delivery"}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
}
