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
    <div className="h-screen w-screen bg-background relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 opacity-40 blur-3xl" style={{ backgroundImage: "var(--ride-glow)" }} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(10,15,35,0.9),_rgba(3,5,10,1))]" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
      </div>
      
      {/* Floating Particles Effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-primary/30 rounded-full animate-float-slow"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${10 + Math.random() * 10}s`,
            }}
          />
        ))}
      </div>
      
      {/* Logout button */}
      <div className="absolute top-6 right-6 z-30">
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className="text-white/80 hover:text-white hover:bg-white/10 backdrop-blur-sm border border-white/10"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>
      
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-6">
        {/* Header Section */}
        <div className="text-center mb-12 space-y-4">
          <div className="relative inline-block">
            <img 
              src="/logo-final.png" 
              alt="SkyLink" 
              className="h-20 w-20 mx-auto mb-4 animate-logo-glow drop-shadow-2xl" 
            />
            <div className="absolute -top-2 -right-2">
              <Sparkles className="h-6 w-6 text-primary animate-pulse" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 bg-gradient-to-r from-white via-primary/90 to-white bg-clip-text text-transparent">
            Welcome to SkyLink
          </h1>
          <p className="text-lg text-white/70 max-w-md mx-auto">
            Choose your role and embark on a journey of innovation and opportunity
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl w-full">
          {/* Client Card */}
          <Card className="group relative bg-gradient-to-br from-card/90 to-card/70 border-2 border-primary/30 backdrop-blur-xl hover:border-primary/60 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/20 hover:scale-[1.02] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-colors" />
            
            <CardHeader className="relative pb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/30 to-blue-600/20 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg">
                <Users className="h-8 w-8 text-blue-400" />
              </div>
              <CardTitle className="text-2xl font-bold text-white mb-2">I'm a Client</CardTitle>
              <CardDescription className="text-base text-white/70">
                Request drone deliveries to hard-to-reach places
              </CardDescription>
            </CardHeader>
            
            <CardContent className="relative space-y-6">
              <ul className="space-y-3 text-sm text-white/80">
                <li className="flex items-center gap-3 group/item">
                  <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0 group-hover/item:scale-150 transition-transform" />
                  <span className="group-hover/item:text-white transition-colors">Create delivery requests</span>
                </li>
                <li className="flex items-center gap-3 group/item">
                  <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0 group-hover/item:scale-150 transition-transform" />
                  <span className="group-hover/item:text-white transition-colors">Track deliveries in real-time</span>
                </li>
                <li className="flex items-center gap-3 group/item">
                  <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0 group-hover/item:scale-150 transition-transform" />
                  <span className="group-hover/item:text-white transition-colors">View delivery history</span>
                </li>
                <li className="flex items-center gap-3 group/item">
                  <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0 group-hover/item:scale-150 transition-transform" />
                  <span className="group-hover/item:text-white transition-colors">Manage your profile</span>
                </li>
              </ul>
              
              <Button
                onClick={() => selectRole("client")}
                disabled={loading}
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 shadow-lg shadow-blue-500/50 hover:shadow-xl hover:shadow-blue-500/60 transition-all"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Zap className="mr-2 h-5 w-5" />
                    Continue as Client
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Operator Card - Premium */}
          <Card className="group relative bg-gradient-to-br from-card/90 to-card/70 border-2 border-primary/40 backdrop-blur-xl hover:border-primary/70 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/30 hover:scale-[1.02] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute top-0 right-0 w-40 h-40 bg-primary/20 rounded-full blur-3xl group-hover:bg-primary/30 transition-colors" />
            <div className="absolute top-4 right-4">
              <Badge className="bg-primary/20 text-primary border-primary/40 backdrop-blur-sm">
                <TrendingUp className="h-3 w-3 mr-1" />
                Popular
              </Badge>
            </div>
            
            <CardHeader className="relative pb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/40 to-primary/20 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg shadow-primary/50">
                <RadioTower className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold text-white mb-2">I'm an Operator</CardTitle>
              <CardDescription className="text-base text-white/70">
                Operate drones and earn from deliveries
              </CardDescription>
            </CardHeader>
            
            <CardContent className="relative space-y-6">
              <ul className="space-y-3 text-sm text-white/80">
                <li className="flex items-center gap-3 group/item">
                  <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 group-hover/item:scale-150 transition-transform" />
                  <span className="group-hover/item:text-white transition-colors">Accept & fulfill delivery requests</span>
                </li>
                <li className="flex items-center gap-3 group/item">
                  <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 group-hover/item:scale-150 transition-transform" />
                  <span className="group-hover/item:text-white transition-colors">Control drones remotely</span>
                </li>
                <li className="flex items-center gap-3 group/item">
                  <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 group-hover/item:scale-150 transition-transform" />
                  <span className="group-hover/item:text-white transition-colors">Access to live camera feeds</span>
                </li>
                <li className="flex items-center gap-3 group/item">
                  <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 group-hover/item:scale-150 transition-transform" />
                  <span className="group-hover/item:text-white transition-colors">Track earnings & request deliveries</span>
                </li>
              </ul>
              
              <Button
                onClick={() => selectRole("operator")}
                disabled={loading}
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary via-primary/90 to-primary/80 hover:from-primary/90 hover:via-primary hover:to-primary shadow-lg shadow-primary/50 hover:shadow-xl hover:shadow-primary/60 transition-all"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Shield className="mr-2 h-5 w-5" />
                    Continue as Operator
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
