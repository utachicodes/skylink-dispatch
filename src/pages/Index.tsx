import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/Reveal";
import {
  ArrowRight,
  MapPin,
  Shield,
  Zap,
  Sparkles,
  RadioTower,
  Clock9,
  Package,
} from "lucide-react";

// Removed fake stats - using real data from deliveries instead

const modes = [
  {
    title: "Client Mission Board",
    description: "Request deliveries and track them live.",
    accent: "from-primary/60 via-primary/20 to-transparent",
  },
  {
    title: "Operator Flight Deck",
    description: "Accept missions, fly semi-autonomously, get paid.",
    accent: "from-accent/60 via-accent/10 to-transparent",
  },
];

const features = [
  {
    icon: MapPin,
    title: "Terrain-aware routing",
    desc: "Plot safe corridors over jungles, coastlines, dense cities or wildfire zones with one tap.",
  },
  {
    icon: Shield,
    title: "Compliance & evidence",
    desc: "Secure flight logs, facial detection overlays, and agency-ready audit trails.",
  },
  {
    icon: Zap,
    title: "Instant workforce access",
    desc: "Spin up vetted operators anywhere on earth—no traditional aviation schooling required.",
  },
];

const industries = [
  {
    title: "Emergency Services",
    bullets: [
      "Firefighters stream thermal vision through smoke",
      "Police units trigger facial detection sweeps inside buildings",
    ],
  },
  {
    title: "Critical Deliveries",
    bullets: [
      "Hospitals move blood units across traffic-clogged cities",
      "Restaurants and couriers reach islands and mountain towns",
    ],
  },
  {
    title: "Remote Workforce",
    bullets: [
      "Residents earn as operators with guided autonomy",
      "No advanced degree; training issued inside the cockpit",
    ],
  },
];

const Index = () => {
  const navigate = useNavigate();
  const { user, userRole, loading } = useAuth();

  useEffect(() => {
    if (loading) return; // Wait for role to load
    
    if (user && userRole) {
      // Redirect to appropriate dashboard based on role
      const targetPath = 
        userRole === "operator" ? "/operator" :
        userRole === "admin" ? "/admin" :
        "/dashboard";
      navigate(targetPath);
    } else if (user && !userRole) {
      // User logged in but no role
      navigate("/select-role");
    }
  }, [user, userRole, loading, navigate]);

  return (
    <div className="relative min-h-screen overflow-hidden pb-20 text-foreground">
      <div className="absolute inset-0 opacity-60" style={{ backgroundImage: "var(--aero-gradient)" }} />
      <section className="relative py-20 lg:py-28">
        <div className="absolute inset-0 opacity-70 blur-[180px]" style={{ backgroundImage: "var(--ride-glow)" }} />
        <div className="aero-shell relative flex flex-col gap-16">
          <Reveal>
            <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] items-center">
              <div className="space-y-8">
                <button type="button" onClick={() => navigate("/")} className="focus-visible:outline-none">
                  <img src="/logo-final.png" alt="SkyLink" className="h-24 md:h-32 opacity-95 animate-logo-glow" />
                </button>
                <h1 className="text-4xl md:text-6xl font-semibold leading-tight text-white tracking-tight">
                  Drone logistics without the drama.
                </h1>
                <p className="text-base md:text-lg text-white/70 max-w-2xl">
                  Request. Assign. Fly. The cockpit stays clean so pilots can focus on stick inputs, not marketing jargon.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-primary via-primary/90 to-white/90 text-background text-base font-semibold px-8 py-6 shadow-[0_10px_40px_rgba(5,196,255,0.35)]"
                    onClick={() => navigate("/auth")}
                  >
                    Launch a mission
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white/20 text-white/80 text-base px-8 py-6 backdrop-blur hover:bg-white/5"
                    onClick={() => navigate("/auth")}
                  >
                    Become an operator
                  </Button>
                </div>
              </div>
              <div className="relative glass-panel p-8 animate-float-slow">
                <div className="absolute -inset-1 rounded-[30px] bg-gradient-to-br from-white/10 to-transparent opacity-40 blur-3xl" />
                <div className="relative space-y-6">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/60">Two screens, same system</p>
                  <div className="grid gap-5">
                    {modes.map((mode) => (
                      <div
                        key={mode.title}
                        className={`rounded-3xl border border-white/5 bg-gradient-to-br ${mode.accent} p-6 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(0,0,0,0.45)]`}
                      >
                        <h3 className="text-xl font-semibold text-white">{mode.title}</h3>
                        <p className="text-sm text-white/70 mt-2">{mode.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="relative py-20">
        <div className="aero-shell space-y-12">
          <div className="grid gap-8 md:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="glass-panel px-6 py-8 space-y-3 border-white/5"
              >
                <feature.icon className="h-8 w-8 text-primary" />
                <h3 className="text-xl font-semibold text-white">{feature.title}</h3>
                <p className="text-sm text-white/70">{feature.desc}</p>
              </div>
            ))}
          </div>

          <div className="glass-panel p-8 border-white/10 space-y-8">
            <div className="grid gap-8 lg:grid-cols-2">
              <div className="space-y-4">
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">Who uses SkyLink</p>
                <ul className="space-y-3 text-sm text-white/75 list-disc list-inside">
                  <li>Emergency crews stream thermal video through smoke.</li>
                  <li>Hospitals move blood across gridlocked cities.</li>
                  <li>Island kitchens deliver in under 15 minutes.</li>
                  <li>Operators fly from home with joystick or gamepad.</li>
                </ul>
              </div>
              <div className="space-y-4">
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">Deployment modes</p>
                {industries.map((industry) => (
                  <div key={industry.title} className="rounded-2xl border border-white/10 p-4 bg-white/5">
                    <p className="text-white font-semibold">{industry.title}</p>
                    <p className="text-sm text-white/70 mt-1">{industry.bullets[0]}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">Operators</p>
                <p className="text-white/80 text-sm">Pick a mission, connect, and fly. The UI stays uncluttered so your inputs stay smooth.</p>
              </div>
              <Button size="lg" className="bg-white text-black hover:bg-white/80 w-full md:w-auto" onClick={() => navigate("/auth")}>
                Start earning today
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
