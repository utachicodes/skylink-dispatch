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
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

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
        navigate("/dashboard");
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
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast.error(error.message || "Couldn't sign in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#03050a] text-white">
      <div className="absolute inset-0 opacity-60 blur-3xl" style={{ backgroundImage: "var(--ride-glow)" }} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(10,15,35,0.8),_rgba(3,5,10,1))]" />

      <div className="relative z-10 flex flex-col lg:flex-row min-h-screen">
        <section className="w-full lg:w-1/2 px-6 sm:px-10 lg:px-16 py-14 flex flex-col justify-between gap-10">
          <div className="space-y-8">
            <img src="/logo-final.png" alt="SkyLink" className="h-16 animate-logo-glow" />
            <div className="space-y-4">
              <p className="text-sm uppercase tracking-[0.4em] text-white/60">Dakar mission control</p>
              <h1 className="text-4xl lg:text-5xl font-semibold leading-tight">
                Drones for hard-to-reach places
              </h1>
              <p className="text-white/70 text-lg">
                Based in Dakar. Fire crews, hospitals, restaurants, and delivery teams use SkyLink. Operators log in from anywhere and start earning.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                { icon: Shield, title: "Trusted agencies", text: "Fire, police, medics" },
                { icon: Globe, title: "140+ regions", text: "Islands • deserts • cities" },
                { icon: RadioTower, title: "Always-on link", text: "Low-bandwidth modes" },
                { icon: Users, title: "New jobs", text: "Remote drone operators" },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-start gap-3">
                  <item.icon className="h-5 w-5 text-accent" />
                  <div>
                    <p className="text-white font-semibold">{item.title}</p>
                    <p className="text-white/70 text-xs">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="text-sm text-white/60">
            Need enterprise onboarding? <span className="text-white">ops@skylink.com</span>
          </div>
        </section>

        <section className="w-full lg:w-1/2 px-6 sm:px-10 lg:px-16 py-12 flex items-center">
          <div className="w-full space-y-6">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-white/60">
                {isLogin ? "Sign in" : "New account"}
              </p>
              <h2 className="text-3xl font-semibold mt-3">
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
                className="w-full bg-gradient-to-r from-primary to-accent text-black font-semibold py-6"
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
            <div className="text-sm text-white/70">
              {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-accent hover:underline"
              >
                {isLogin ? "Sign up" : "Sign in"}
              </button>
            </div>
            <p className="text-xs text-white/40">
              By continuing, you agree to our terms and privacy policy.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
