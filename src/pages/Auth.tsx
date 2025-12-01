import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Shield, Globe, RadioTower, Users } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, userRole, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return; // Wait for role to load
    
    if (user && userRole) {
      // User has a role, redirect to their dashboard
      console.log("[Auth] User logged in with role:", userRole);
      const targetPath = 
        userRole === "operator" ? "/operator" :
        userRole === "admin" ? "/admin" :
        "/dashboard";
      navigate(targetPath);
    } else if (user && !userRole) {
      // User logged in but no role, go to role selection
      console.log("[Auth] User logged in, no role - redirecting to role selection");
      navigate("/select-role");
    }
  }, [user, userRole, authLoading, navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        toast.success("Signed in");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              name,
              phone,
            },
          },
        });

        if (error) throw error;
        toast.success("Account created");
      }
    } catch (error: any) {
      toast.error(error.message || "Couldn't sign in");
    } finally {
      setLoading(false);
    }
  };

  const highlights = [
    "End-to-end encrypted missions",
    "Joystick + touchscreen cockpit",
    "Supabase-authenticated access",
    "Jetson link watchdogs online",
  ];

  return (
    <div className="relative min-h-screen text-foreground">
      <div className="aero-shell relative py-16 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] items-center">
          <div className="glass-panel border-white/15 bg-gradient-to-br from-white/3 via-transparent to-white/10 p-8 lg:p-10 space-y-8">
            <div className="flex items-center gap-3">
              <img src="/logo-final.png" alt="SkyLink" className="h-16 animate-logo-glow" />
              <span className="text-xs tracking-[0.35em] text-white/60 uppercase">Secure Login</span>
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl lg:text-5xl font-semibold leading-tight text-white">
                Connect to the cockpit
              </h1>
              <p className="text-white/70 text-base">
                Clients launch corridors, operators take the sticks, all in one aviation-grade dashboard.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {highlights.map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/5/60 p-4 text-sm text-white/75 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <div className="text-xs text-white/60">
              Need enterprise access? <span className="text-white">ops@skylink.com</span>
            </div>
          </div>

          <div className="flex w-full justify-center">
            <div className="glass-panel p-8 border-white/10 space-y-6 w-full max-w-md">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-white/60 mb-2">{isLogin ? "Return pilot" : "New profile"}</p>
                <h2 className="text-2xl font-semibold text-white">
                  {isLogin ? "Sign in" : "Create account"}
                </h2>
              </div>
              <form onSubmit={handleAuth} className="space-y-5">
              {!isLogin && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-white/80">
                      Full Name
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required={!isLogin}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-white/80">
                      Phone Number
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+221 77 123 4567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                    />
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white/80">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white/80">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-primary via-primary/90 to-white/85 text-background font-semibold py-6 shadow-[0_15px_40px_rgba(5,196,255,0.25)]"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Please wait...
                  </>
                ) : isLogin ? (
                  "Sign In"
                ) : (
                  "Create Account"
                )}
              </Button>
              </form>
              <div className="text-sm text-white/70 text-center">
                {isLogin ? "Don't have an account?" : "Already registered?"}{" "}
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-primary hover:underline"
                >
                  {isLogin ? "Sign up" : "Sign in"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
