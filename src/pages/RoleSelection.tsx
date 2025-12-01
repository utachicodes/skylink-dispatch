import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, RadioTower, Loader2, LogOut, Sparkles, Zap, Shield, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export default function RoleSelection() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const selectRole = async (role: "client" | "operator") => {
    if (!user) return;
    
    setLoading(true);
    try {
      console.log("[RoleSelection] Setting role to:", role);
      
      // Use the secure database function to set role
      const { error } = await supabase.rpc("set_user_role", {
        _role: role,
      });

      if (error) {
        console.error("Error setting role:", error);
        throw error;
      }

      console.log("[RoleSelection] Role successfully set to:", role);
      toast.success(`Welcome ${role === "operator" ? "Operator" : "Client"}!`);
      
      // Force reload to update auth context
      window.location.href = role === "client" ? "/dashboard" : "/operator";
    } catch (error: any) {
      console.error("Role selection error:", error);
      toast.error(error.message || "Failed to set role. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen text-foreground">
      
      <div className="aero-shell relative py-20">
        <div className="flex justify-end mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="text-white/80 hover:text-white hover:bg-white/10 border border-white/10"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
        
        <div className="flex flex-col items-center justify-center">
        {/* Header Section */}
        <div className="text-center mb-12 space-y-4">
          <img 
            src="/logo-final.png" 
            alt="SkyLink" 
            className="h-20 w-20 mx-auto mb-4 animate-logo-glow" 
          />
          <h1 className="text-4xl md:text-5xl font-semibold text-white mb-3">
            Choose your role
          </h1>
          <p className="text-base text-white/70 max-w-md mx-auto">
            Select how you want to use SkyLink
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full">
          {/* Client Card */}
          <Card className="glass-panel border-white/10 hover:border-white/20 transition-all">
            <CardHeader className="pb-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-xl font-semibold text-white">Client</CardTitle>
              <CardDescription className="text-sm text-white/70">
                Request and track deliveries
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm text-white/80">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span>Create delivery requests</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span>Track deliveries in real-time</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span>View delivery history</span>
                </li>
              </ul>
              
              <Button
                onClick={() => selectRole("client")}
                disabled={loading}
                className="w-full bg-gradient-to-r from-primary via-primary/90 to-white/80 text-background font-semibold"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Continue as Client"
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Operator Card */}
          <Card className="glass-panel border-white/10 hover:border-white/20 transition-all">
            <CardHeader className="pb-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <RadioTower className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-xl font-semibold text-white">Operator</CardTitle>
              <CardDescription className="text-sm text-white/70">
                Operate drones and earn from deliveries
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm text-white/80">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span>Accept delivery requests</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span>Control drones remotely</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span>Access live camera feeds</span>
                </li>
              </ul>
              
              <Button
                onClick={() => selectRole("operator")}
                disabled={loading}
                className="w-full bg-gradient-to-r from-primary via-primary/90 to-white/80 text-background font-semibold"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Continue as Operator"
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
        </div>
      </div>
    </div>
  );
}
