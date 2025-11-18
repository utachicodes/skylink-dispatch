import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { 
  MapPin, 
  Package, 
  ArrowRight, 
  Coins, 
  AlertCircle, 
  Clock, 
  Phone, 
  User, 
  Shield, 
  Zap,
  Calendar,
  Info,
  Building2,
  Home,
  Truck,
  Heart,
  FileText,
  ShoppingBag
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

type DeliveryType = "medical" | "food" | "documents" | "retail" | "emergency" | "other";
type Priority = "standard" | "express" | "urgent";

export default function CreateDelivery() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [userPoints, setUserPoints] = useState(0);
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("documents");
  const [priority, setPriority] = useState<Priority>("standard");
  const [estimatedCost, setEstimatedCost] = useState(100);
  const [estimatedTime, setEstimatedTime] = useState("15-30 min");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Calculate cost based on type, priority, weight, and size
  const calculateCost = (
    type: DeliveryType,
    priority: Priority,
    weight: number,
    size: string
  ): number => {
    let baseCost = 100;
    
    // Type multipliers
    const typeMultipliers: Record<DeliveryType, number> = {
      medical: 1.5,
      emergency: 2.0,
      food: 1.2,
      documents: 1.0,
      retail: 1.3,
      other: 1.1,
    };
    
    // Priority multipliers
    const priorityMultipliers: Record<Priority, number> = {
      standard: 1.0,
      express: 1.5,
      urgent: 2.5,
    };
    
    // Size multipliers
    const sizeMultipliers: Record<string, number> = {
      small: 1.0,
      medium: 1.3,
      large: 1.8,
      xlarge: 2.5,
    };
    
    // Weight multiplier (base 2kg, +0.2 per kg)
    const weightMultiplier = 1 + (Math.max(0, weight - 2) * 0.2);
    
    baseCost *= typeMultipliers[type];
    baseCost *= priorityMultipliers[priority];
    baseCost *= sizeMultipliers[size] || 1.3;
    baseCost *= weightMultiplier;
    
    return Math.round(baseCost);
  };

  // Calculate estimated time based on priority
  const calculateTime = (priority: Priority): string => {
    const times: Record<Priority, string> = {
      standard: "30-45 min",
      express: "15-30 min",
      urgent: "10-20 min",
    };
    return times[priority];
  };

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

  const handleTypeChange = (type: DeliveryType) => {
    setDeliveryType(type);
    const form = document.querySelector("form");
    if (form) {
      const weight = parseFloat((form.querySelector("[name='packageWeight']") as HTMLInputElement)?.value || "2");
      const size = (form.querySelector("[name='packageSize']") as HTMLSelectElement)?.value || "medium";
      setEstimatedCost(calculateCost(type, priority, weight, size));
    }
  };

  const handlePriorityChange = (newPriority: Priority) => {
    setPriority(newPriority);
    setEstimatedTime(calculateTime(newPriority));
    const form = document.querySelector("form");
    if (form) {
      const weight = parseFloat((form.querySelector("[name='packageWeight']") as HTMLInputElement)?.value || "2");
      const size = (form.querySelector("[name='packageSize']") as HTMLSelectElement)?.value || "medium";
      setEstimatedCost(calculateCost(deliveryType, newPriority, weight, size));
    }
  };

  const handleWeightOrSizeChange = () => {
    const form = document.querySelector("form");
    if (form) {
      const weight = parseFloat((form.querySelector("[name='packageWeight']") as HTMLInputElement)?.value || "2");
      const size = (form.querySelector("[name='packageSize']") as HTMLSelectElement)?.value || "medium";
      setEstimatedCost(calculateCost(deliveryType, priority, weight, size));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    setLoading(true);
    try {
      if (!user) throw new Error("Not authenticated");

      const finalCost = calculateCost(
        deliveryType,
        priority,
        parseFloat(formData.get("packageWeight") as string || "2"),
        formData.get("packageSize") as string || "medium"
      );

      if (userPoints < finalCost) {
        toast.error(`Insufficient points. You need ${finalCost} points for this delivery.`);
        setLoading(false);
        return;
      }

      const { data: deductResult, error: deductError } = await supabase
        .rpc("deduct_points", {
          _user_id: user.id,
          _points: finalCost,
        });

      if (deductError || !deductResult) {
        toast.error("Failed to deduct points");
        setLoading(false);
        return;
      }

      // Parse coordinates (in production, use geocoding API)
      const pickupCoords = {
        lat: parseFloat(formData.get("pickupLat") as string || "14.7167"),
        lng: parseFloat(formData.get("pickupLng") as string || "-17.4677"),
      };
      const dropoffCoords = {
        lat: parseFloat(formData.get("dropoffLat") as string || "14.7167"),
        lng: parseFloat(formData.get("dropoffLng") as string || "-17.4677"),
      };

      const deliveryData: any = {
        client_id: user.id,
        pickup_location: formData.get("pickup") as string,
        dropoff_location: formData.get("dropoff") as string,
        pickup_lat: pickupCoords.lat,
        pickup_lng: pickupCoords.lng,
        dropoff_lat: dropoffCoords.lat,
        dropoff_lng: dropoffCoords.lng,
        package_size: formData.get("packageSize") as string,
        package_weight: parseFloat(formData.get("packageWeight") as string),
        package_note: formData.get("packageNote") as string,
        status: "pending",
        points_cost: finalCost,
        estimated_time: priority === "urgent" ? 15 : priority === "express" ? 30 : 45,
      };

      // Combine additional info into package_note
      const additionalInfo: string[] = [];
      if (formData.get("pickupContact")) {
        additionalInfo.push(`Pickup Contact: ${formData.get("pickupContact")}`);
      }
      if (formData.get("dropoffContact")) {
        additionalInfo.push(`Delivery Contact: ${formData.get("dropoffContact")}`);
      }
      if (formData.get("recipientName")) {
        additionalInfo.push(`Recipient: ${formData.get("recipientName")}`);
      }
      if (formData.get("specialInstructions")) {
        additionalInfo.push(`Instructions: ${formData.get("specialInstructions")}`);
      }
      
      // Add special requirements
      const requirements: string[] = [];
      if (formData.get("fragile")) requirements.push("Fragile");
      if (formData.get("temperature")) requirements.push("Temperature Controlled");
      if (formData.get("signature")) requirements.push("Signature Required");
      if (formData.get("insurance")) {
        requirements.push("Insurance Coverage");
        deliveryData.points_cost = finalCost + 50; // Add insurance cost
      }
      
      if (requirements.length > 0) {
        additionalInfo.push(`Special Requirements: ${requirements.join(", ")}`);
      }
      
      // Combine with existing package note
      const existingNote = formData.get("packageNote") as string || "";
      deliveryData.package_note = [existingNote, ...additionalInfo]
        .filter(Boolean)
        .join("\n\n");

      const { data, error } = await supabase
        .from("deliveries")
        .insert(deliveryData)
        .select()
        .single();

      if (error) throw error;

      setUserPoints((prev) => prev - finalCost);
      toast.success("Delivery request created successfully!");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Failed to create delivery");
    } finally {
      setLoading(false);
    }
  };

  const deliveryTypeIcons: Record<DeliveryType, typeof Package> = {
    medical: Heart,
    food: ShoppingBag,
    documents: FileText,
    retail: Building2,
    emergency: Zap,
    other: Package,
  };

  const deliveryTypeLabels: Record<DeliveryType, string> = {
    medical: "Medical Supplies",
    food: "Food & Beverages",
    documents: "Documents",
    retail: "Retail Products",
    emergency: "Emergency",
    other: "Other",
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-sky-gradient text-white p-6 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold">New Delivery Request</h1>
          <p className="text-white/90 mt-1">Create a detailed delivery request for your package</p>
        </div>
      </header>

      <main className="p-4 pb-24 max-w-4xl mx-auto space-y-6">
        {/* Points & Cost Summary */}
        <Alert className="border-primary/50 bg-gradient-to-r from-primary/10 to-primary/5">
          <Coins className="h-5 w-5 text-primary" />
          <AlertDescription className="ml-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-4">
                <span>
                  <strong className="text-primary text-lg">Your Points: {userPoints.toLocaleString()}</strong>
                </span>
                <Separator orientation="vertical" className="h-6" />
                <span className="text-muted-foreground">
                  Estimated Cost: <strong className="text-foreground">{estimatedCost} points</strong>
                </span>
                <Separator orientation="vertical" className="h-6" />
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  ETA: <strong className="text-foreground">{estimatedTime}</strong>
                </span>
              </div>
              {userPoints < estimatedCost && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  Insufficient Points
                </Badge>
              )}
            </div>
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Delivery Type Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Delivery Type
              </CardTitle>
              <CardDescription>Select the type of delivery you need</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {(["medical", "food", "documents", "retail", "emergency", "other"] as DeliveryType[]).map((type) => {
                  const Icon = deliveryTypeIcons[type];
                  const isSelected = deliveryType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleTypeChange(type)}
                      className={`p-4 border-2 rounded-lg transition-all text-left ${
                        isSelected
                          ? "border-primary bg-primary/10 shadow-md"
                          : "border-border hover:border-primary/50 hover:bg-accent/50"
                      }`}
                    >
                      <Icon className={`h-6 w-6 mb-2 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                      <div className="font-medium text-sm">{deliveryTypeLabels[type]}</div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Priority Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Priority Level
              </CardTitle>
              <CardDescription>Choose how urgent your delivery is</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {(["standard", "express", "urgent"] as Priority[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handlePriorityChange(p)}
                    className={`p-4 border-2 rounded-lg transition-all text-left ${
                      priority === p
                        ? "border-primary bg-primary/10 shadow-md"
                        : "border-border hover:border-primary/50 hover:bg-accent/50"
                    }`}
                  >
                    <div className="font-semibold capitalize mb-1">{p}</div>
                    <div className="text-xs text-muted-foreground">
                      {p === "standard" && "30-45 min • Standard pricing"}
                      {p === "express" && "15-30 min • 1.5x pricing"}
                      {p === "urgent" && "10-20 min • 2.5x pricing"}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Locations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Pickup & Delivery Locations
              </CardTitle>
              <CardDescription>Enter the pickup and delivery addresses</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pickup">Pickup Location *</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="pickup"
                    name="pickup"
                    placeholder="e.g., Central Pharmacy, Saint-Louis, Senegal"
                    className="pl-10"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    name="pickupLat"
                    type="number"
                    step="0.000001"
                    placeholder="Latitude (14.7167)"
                    defaultValue="14.7167"
                    className="text-sm"
                  />
                  <Input
                    name="pickupLng"
                    type="number"
                    step="0.000001"
                    placeholder="Longitude (-17.4677)"
                    defaultValue="-17.4677"
                    className="text-sm"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="dropoff">Delivery Location *</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="dropoff"
                    name="dropoff"
                    placeholder="e.g., Hospital, Dakar Plateau, Senegal"
                    className="pl-10"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    name="dropoffLat"
                    type="number"
                    step="0.000001"
                    placeholder="Latitude (14.7167)"
                    defaultValue="14.7167"
                    className="text-sm"
                  />
                  <Input
                    name="dropoffLng"
                    type="number"
                    step="0.000001"
                    placeholder="Longitude (-17.4677)"
                    defaultValue="-17.4677"
                    className="text-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Package Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Package Details
              </CardTitle>
              <CardDescription>Specify the size and weight of your package</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="packageSize">Package Size *</Label>
                  <Select name="packageSize" defaultValue="medium" required onValueChange={handleWeightOrSizeChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small (≤30cm)</SelectItem>
                      <SelectItem value="medium">Medium (30-60cm)</SelectItem>
                      <SelectItem value="large">Large (60-100cm)</SelectItem>
                      <SelectItem value="xlarge">Extra Large (100cm+)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="packageWeight">Weight (kg) *</Label>
                  <div className="relative">
                    <Package className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="packageWeight"
                      name="packageWeight"
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="25"
                      placeholder="2.5"
                      className="pl-10"
                      required
                      onChange={handleWeightOrSizeChange}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="packageNote">Package Description</Label>
                <Textarea
                  id="packageNote"
                  name="packageNote"
                  placeholder="Describe your package contents, special handling requirements, etc."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Contact Information
              </CardTitle>
              <CardDescription>Provide contact details for pickup and delivery</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pickupContact">Pickup Contact</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="pickupContact"
                      name="pickupContact"
                      placeholder="+221 77 123 4567"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dropoffContact">Delivery Contact</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="dropoffContact"
                      name="dropoffContact"
                      placeholder="+221 77 123 4567"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recipientName">Recipient Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="recipientName"
                    name="recipientName"
                    placeholder="Name of person receiving the package"
                    className="pl-10"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Special Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Special Instructions
              </CardTitle>
              <CardDescription>Any additional information for the operator</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="specialInstructions">Delivery Instructions</Label>
                  <Textarea
                    id="specialInstructions"
                    name="specialInstructions"
                    placeholder="e.g., Leave at front door, call recipient upon arrival, handle with care, etc."
                    rows={3}
                  />
                </div>

                <div className="space-y-3">
                  <Label>Special Requirements</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="fragile" name="fragile" />
                      <Label htmlFor="fragile" className="cursor-pointer font-normal">
                        Fragile - Handle with extra care
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="temperature" name="temperature" />
                      <Label htmlFor="temperature" className="cursor-pointer font-normal">
                        Temperature controlled (requires special handling)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="signature" name="signature" />
                      <Label htmlFor="signature" className="cursor-pointer font-normal">
                        Signature required upon delivery
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="insurance" name="insurance" />
                      <Label htmlFor="insurance" className="cursor-pointer font-normal">
                        Add insurance coverage (+50 points)
                      </Label>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cost Summary */}
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-sm text-muted-foreground">Total Cost</div>
                  <div className="text-3xl font-bold text-primary">{estimatedCost} points</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Estimated Time</div>
                  <div className="text-xl font-semibold">{estimatedTime}</div>
                </div>
              </div>
              <Separator className="my-4" />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Base cost ({deliveryTypeLabels[deliveryType]})</span>
                  <span>100 pts</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Priority ({priority})</span>
                  <span>
                    {priority === "standard" ? "1.0x" : priority === "express" ? "1.5x" : "2.5x"}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Size & Weight multiplier</span>
                  <span>Applied</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => navigate("/dashboard")}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-sky-gradient hover:opacity-90 text-black font-semibold"
              size="lg"
              disabled={loading || userPoints < estimatedCost}
            >
              {loading ? (
                "Creating Delivery..."
              ) : userPoints < estimatedCost ? (
                "Insufficient Points"
              ) : (
                <>
                  Create Delivery Request
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </div>
        </form>
      </main>

      <BottomNav />
    </div>
  );
}
