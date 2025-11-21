import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, RadioTower, Loader2, LogOut } from "lucide-react";
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

      // Wait for database update
      await new Promise(resolve => setTimeout(resolve, 500));

      toast.success(`Welcome ${role === "operator" ? "Operator" : "Client"}!`);
      
      // Navigate based on role
      const targetPath = role === "client" ? "/dashboard" : "/operator";
      console.log("[RoleSelection] Redirecting to:", targetPath);
      window.location.href = targetPath;
    } catch (error: any) {
      console.error("Role selection error:", error);
      toast.error(error.message || "Failed to set role. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 opacity-60 blur-3xl" style={{ backgroundImage: "var(--ride-glow)" }} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(10,15,35,0.8),_rgba(3,5,10,1))]" />
      
      {/* Logout button */}
      <div className="absolute top-4 right-4 z-20">
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className="text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>
      
      <div className="relative z-10 w-full max-w-4xl">
        <div className="text-center mb-8">
          <img src="/logo-final.png" alt="SkyLink" className="h-16 mx-auto mb-4 animate-logo-glow" />
          <h1 className="text-3xl font-bold text-foreground mb-2">Welcome to SkyLink</h1>
          <p className="text-muted-foreground">Choose your primary role to get started</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="bg-card/80 border-border backdrop-blur-sm hover:border-primary/50 transition-all group">
            <CardHeader>
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Users className="h-7 w-7 text-primary" />
              </div>
              <CardTitle className="text-foreground">I'm a Client</CardTitle>
              <CardDescription>
                Request drone deliveries to hard-to-reach places
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-6 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Create delivery requests
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Track deliveries in real-time
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  View delivery history
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Manage your profile
                </li>
              </ul>
              <Button
                onClick={() => selectRole("client")}
                disabled={loading}
                className="w-full"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue as Client"}
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-card/80 border-border backdrop-blur-sm hover:border-primary/50 transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/20 to-transparent blur-3xl" />
            <CardHeader className="relative">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <RadioTower className="h-7 w-7 text-primary" />
              </div>
              <CardTitle className="text-foreground">I'm an Operator</CardTitle>
              <CardDescription>
                Operate drones and earn from deliveries (can also act as client)
              </CardDescription>
            </CardHeader>
            <CardContent className="relative">
              <ul className="space-y-2 mb-6 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Accept & fulfill delivery requests
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Control drones remotely
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Access to live camera feeds
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Track earnings & request deliveries
                </li>
              </ul>
              <Button
                onClick={() => selectRole("operator")}
                disabled={loading}
                className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
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
