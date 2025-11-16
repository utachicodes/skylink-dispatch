import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plane, Package, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export default function RoleSelection() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const selectRole = async (role: "client" | "operator") => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Use upsert to handle both insert and update cases
      // This will insert if no role exists, or update if one does
      const { error } = await supabase
        .from("user_roles")
        .upsert(
          { user_id: user.id, role },
          { onConflict: "user_id,role" }
        );

      if (error) {
        // If upsert fails, try insert (in case user has no role)
        const { error: insertError } = await supabase
          .from("user_roles")
          .insert({ user_id: user.id, role });
        
        if (insertError) {
          // If insert also fails, try update (in case user already has a role)
          const { error: updateError } = await supabase
            .from("user_roles")
            .update({ role })
            .eq("user_id", user.id);
          
          if (updateError) throw updateError;
        }
      }

      toast.success(`Welcome ${role}!`);
      // Reload the page to refresh auth context
      window.location.href = role === "client" ? "/dashboard" : "/operator";
    } catch (error: any) {
      console.error("Role selection error:", error);
      toast.error(error.message || "Failed to set role. Please contact support.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 opacity-60 blur-3xl" style={{ backgroundImage: "var(--ride-glow)" }} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(10,15,35,0.8),_rgba(3,5,10,1))]" />
      
      <div className="relative z-10 w-full max-w-4xl">
        <div className="text-center mb-8">
          <img src="/logo-final.png" alt="SkyLink" className="h-16 mx-auto mb-4 animate-logo-glow" />
          <h1 className="text-3xl font-bold text-white mb-2">Welcome to SkyLink</h1>
          <p className="text-white/70">Choose how you want to use the platform</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all">
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-white">I'm a Client</CardTitle>
              <CardDescription className="text-white/70">
                Request drone deliveries to hard-to-reach places
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-6 text-sm text-white/80">
                <li>• Create delivery requests</li>
                <li>• Track deliveries in real-time</li>
                <li>• View delivery history</li>
                <li>• Manage your profile</li>
              </ul>
              <Button
                onClick={() => selectRole("client")}
                disabled={loading}
                className="w-full bg-gradient-to-r from-primary to-accent text-black font-semibold"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue as Client"}
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all">
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center mb-4">
                <Plane className="h-6 w-6 text-accent" />
              </div>
              <CardTitle className="text-white">I'm an Operator</CardTitle>
              <CardDescription className="text-white/70">
                Operate drones and earn from deliveries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-6 text-sm text-white/80">
                <li>• Accept delivery requests</li>
                <li>• Control drones remotely</li>
                <li>• View live camera feeds</li>
                <li>• Track earnings</li>
              </ul>
              <Button
                onClick={() => selectRole("operator")}
                disabled={loading}
                className="w-full bg-gradient-to-r from-accent to-primary text-black font-semibold"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue as Operator"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
