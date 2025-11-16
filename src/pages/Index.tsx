import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
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

const stats = [
  { label: "Hard-to-reach sites served", value: "1,240+", sub: "mountain, desert & island hops" },
  { label: "Operators earning remotely", value: "7,400", sub: "certified pilots on the grid" },
  { label: "Critical response time", value: "03:47", sub: "avg. from alert to arrival" },
];

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
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(32,36,48,0.9),_rgba(5,6,10,1))] text-foreground">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-40 blur-3xl animate-gradient-drift" style={{ backgroundImage: "var(--ride-glow)" }} />
        <div className="relative max-w-6xl mx-auto px-6 py-20 flex flex-col gap-16">
          <div className="flex flex-col lg:flex-row items-center gap-12 animate-fade-up">
            <div className="flex-1 space-y-8">
              <img src="/logo-final.png" alt="SkyLink" className="h-28 md:h-40 opacity-95 animate-logo-glow" />
              <h1 className="text-4xl md:text-6xl font-semibold leading-tight text-white tracking-tight">
                Drones for when roads don't cut it
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl">
                Based in Dakar. Fire crews, hospitals, restaurants, and delivery teams use SkyLink to reach places vehicles can't. Operators log in from anywhere, get certified through the platform, and start earning.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-primary to-accent text-base font-semibold px-8 py-6"
                  onClick={() => navigate("/auth")}
                >
                  Get started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/20 text-white/80 text-base px-8 py-6 backdrop-blur hover:bg-white/5"
                  onClick={() => navigate("/auth")}
                >
                  Sign up as operator
                </Button>
              </div>
            </div>
            <div className="flex-1 w-full">
              <div className="grid gap-6 animate-float-slow">
                {modes.map((mode) => (
                  <div
                    key={mode.title}
                    className={`rounded-3xl border border-white/10 bg-gradient-to-br ${mode.accent} p-6 backdrop-blur transition-transform transition-shadow duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/40`}
                  >
                    <p className="text-sm text-white/70 uppercase tracking-[0.3em] mb-3">Two screens</p>
                    <h3 className="text-2xl font-semibold text-white">{mode.title}</h3>
                    <p className="text-muted-foreground mt-2">{mode.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-3xl border border-white/5 bg-white/5 px-6 py-5 backdrop-blur transition-transform transition-shadow duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/40"
              >
                <p className="text-sm text-white/60 uppercase tracking-[0.3em]">{stat.label}</p>
                <p className="text-4xl font-bold text-white mt-3">{stat.value}</p>
                <p className="text-sm text-white/70 mt-1">{stat.sub}</p>
              </div>
            ))}
          </div>
          <p className="text-white/60 text-sm uppercase tracking-[0.4em]">
            Dakar, Senegal · Serving Sahel, West Africa & global partners
          </p>
        </div>
      </section>

      <section className="py-20 bg-[#0b0c12]">
        <div className="max-w-6xl mx-auto px-6 space-y-12">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <p className="text-sm uppercase tracking-[0.4em] text-white/50">Real missions</p>
              <h2 className="text-3xl md:text-5xl font-semibold text-white mt-3">
                When roads end, drones take over
              </h2>
            </div>
            <Button
              variant="ghost"
              className="text-white border border-white/10 hover:bg-white/10"
              onClick={() => navigate("/auth")}
            >
              See it live
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          <div className="grid gap-8 md:grid-cols-3 animate-fade-up">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-3xl border border-white/5 bg-white/5 px-6 py-10 space-y-4 backdrop-blur transition-transform transition-shadow duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/40"
              >
                <feature.icon className="h-10 w-10 text-accent" />
                <h3 className="text-2xl font-semibold text-white">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>

          <div className="rounded-[2.5rem] border border-white/10 bg-gradient-to-r from-primary/20 via-transparent to-transparent p-10 space-y-10">
            <div className="flex flex-col lg:flex-row gap-10">
              <div className="flex-1 space-y-4">
                <p className="text-sm uppercase tracking-[0.4em] text-white/60">How it works</p>
                <h3 className="text-3xl font-semibold text-white">One platform, multiple industries</h3>
                <p className="text-muted-foreground">
                  Fire crews use it for recon. Hospitals ship blood. Restaurants deliver to islands. Police run facial detection. Everything logs automatically for compliance.
                </p>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2 text-white/80">
                    <RadioTower className="h-5 w-5 text-primary" />
                    24/7 monitored corridors
                  </div>
                  <div className="flex items-center gap-2 text-white/80">
                    <Clock9 className="h-5 w-5 text-accent" />
                    Low-bandwidth fallback comms
                  </div>
                  <div className="flex items-center gap-2 text-white/80">
                    <Package className="h-5 w-5 text-primary" />
                    Multi-package batching
                  </div>
                </div>
              </div>
              <div className="flex-1 rounded-3xl border border-white/10 bg-black/30 p-6 space-y-4">
                <div className="text-sm text-white/50 uppercase tracking-[0.4em]">Deployment modes</div>
                {industries.map((industry) => (
                  <div key={industry.title} className="rounded-2xl border border-white/10 p-4 bg-white/3">
                    <p className="text-white font-semibold text-lg">{industry.title}</p>
                    <ul className="mt-2 space-y-1 text-sm text-white/70 list-disc list-inside">
                      {industry.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/40 p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-white/60">New jobs</p>
                <h3 className="text-2xl font-semibold text-white mt-2">Anyone can become an operator</h3>
                <p className="text-white/70 mt-2">
                  Get certified through the platform. No degree needed. Fly missions from home, earn per delivery. SkyLink handles training, safety checks, and payouts.
                </p>
              </div>
              <Button
                size="lg"
                className="bg-white text-black hover:bg-white/80 w-full md:w-auto"
                onClick={() => navigate("/auth")}
              >
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
