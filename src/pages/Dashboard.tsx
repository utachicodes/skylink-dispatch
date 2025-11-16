import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Activity,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Battery,
  Compass,
  DollarSign,
  MapPin,
  Navigation,
  Pause,
  Play,
  RadioTower,
  RefreshCw,
  Shield,
  Video,
} from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import { coreApi, type MissionResponse } from "@/lib/api";
import { useTelemetry } from "@/hooks/useTelemetry";

const FALLBACK_MISSIONS: MissionResponse[] = [
  {
    id: "demo-1",
    clientName: "Demo Client",
    pickup: "Victoria Island",
    dropoff: "Lekki Phase 1",
    status: "pending",
    priority: "express",
    createdAt: new Date().toISOString(),
    packageDetails: "2.5kg • Docs",
    etaMinutes: 8,
  },
];

const FALLBACK_OPERATOR_MISSIONS = [
  {
    id: "demo-op-1",
    route: "Lekki › Ikeja",
    payout: "₦28,500",
    distance: "12.4 km",
    autopilot: 72,
    status: "pending",
  },
];

export default function Dashboard() {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  const { frames, connected } = useTelemetry();
  const [missions, setMissions] = useState<MissionResponse[]>([]);
  const [missionsLoading, setMissionsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchMissions = async () => {
      try {
        const data = await coreApi.listActiveMissions();
        if (!cancelled) {
          setMissions(data);
        }
      } catch (error) {
        console.warn("[Dashboard] mission fetch failed", error);
      } finally {
        if (!cancelled) setMissionsLoading(false);
      }
    };

    fetchMissions();
    const interval = setInterval(fetchMissions, 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const liveMissions = missions.length ? missions : FALLBACK_MISSIONS;
  const missionCards = liveMissions.slice(0, 3);
  const operatorMissions = liveMissions.length
    ? liveMissions.map((mission) => ({
        id: mission.id,
        route: `${mission.pickup} › ${mission.dropoff}`,
        payout: "₦32,000",
        distance: `${mission.etaMinutes ?? 15} min ETA`,
        autopilot: 60,
        status: mission.status,
      }))
    : FALLBACK_OPERATOR_MISSIONS;

  const primaryFrame = frames[0];
  const droneVitals = {
    location: primaryFrame ? `${primaryFrame.latitude.toFixed(4)}, ${primaryFrame.longitude.toFixed(4)}` : "Lekki Phase 1, Lagos",
    battery: primaryFrame?.battery ?? 78,
    signal: primaryFrame ? `${primaryFrame.signalQuality}% Signal` : "5G Ultra",
    temperature: primaryFrame ? `${(primaryFrame.altitude / 10 + 25).toFixed(0)}°C` : "32°C",
    speed: primaryFrame?.speed ?? 42,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#05060a] flex items-center justify-center text-white/70">
        Synchronising cockpit...
      </div>
    );
  }

  if (userRole === "admin") {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="min-h-screen bg-[#05060a] text-white pb-24 md:pb-12">
      <div className="relative border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent">
        <div className="absolute inset-0 opacity-50 blur-3xl" style={{ backgroundImage: "var(--ride-glow)" }} />
        <div className="relative max-w-6xl mx-auto px-6 py-10 flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <img src="/logo-final.png" alt="SkyLink" className="h-12 mb-4 animate-logo-glow" />
              <p className="text-xs uppercase tracking-[0.4em] text-white/60">SkyLink cockpit</p>
              <h1 className="text-4xl md:text-5xl font-semibold mt-3 text-white">
                Hey {user?.user_metadata?.full_name || user?.email?.split("@")[0]}
              </h1>
              <p className="text-white/70 mt-3 max-w-2xl">
                Request deliveries on the left, accept missions and fly on the right. Everything you need in one place.
              </p>
                <div className="flex items-center gap-2 text-sm text-white/70 mt-2">
                  <span className={`h-2 w-2 rounded-full ${connected ? "bg-green-400" : "bg-red-400"}`} />
                  {connected ? "Telemetry live from core server" : "Waiting for drone heartbeat"}
                </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                className="border-white/20 text-white/80 hover:bg-white/10"
                onClick={() => navigate("/track")}
              >
                Track deliveries
              </Button>
              <Button
                className="bg-gradient-to-r from-primary to-accent text-black font-semibold"
                onClick={() => navigate("/pilot")}
              >
                Open pilot room
              </Button>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        <div className="grid gap-6 xl:grid-cols-2">
          <section className="rounded-[32px] border border-white/10 bg-white/5 backdrop-blur p-6 space-y-6">
            <div className="flex flex-col gap-3">
              <p className="text-xs uppercase tracking-[0.4em] text-white/60">Client screen</p>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-semibold text-white">Request a delivery</h2>
                  <p className="text-white/70 mt-1">
                    Pick two points, set your package details, and submit. An operator will accept and fly it.
                  </p>
                </div>
                <Button
                  className="bg-white text-black hover:bg-white/80 w-full md:w-auto"
                  size="lg"
                  onClick={() => navigate("/create-delivery")}
                >
                  Request delivery
                </Button>
              </div>
            </div>

            <Card className="bg-black/30 border-white/10 rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Navigation className="h-5 w-5 text-primary" />
                  Mission builder
                </CardTitle>
                <CardDescription className="text-white/60">Define your corridor</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-sm text-white/60 uppercase tracking-[0.3em]">Point A</p>
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      <p className="text-white font-semibold">Dakar Plateau</p>
                      <p className="text-white/60 text-sm">14.7167° N, -17.4677° W</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-white/60 uppercase tracking-[0.3em]">Point B</p>
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      <p className="text-white font-semibold">Almadies</p>
                      <p className="text-white/60 text-sm">14.7500° N, -17.5000° W</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 text-sm text-white/80">
                  <span className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-accent" />
                    22.1 km aerial
                  </span>
                  <span className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    Insured
                  </span>
                  <span className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    Fast track
                  </span>
                </div>
                <Button
                  className="bg-gradient-to-r from-primary to-accent text-black font-semibold w-full"
                  size="lg"
                  onClick={() => navigate("/create-delivery")}
                >
                  Create mission
                </Button>
              </CardContent>
            </Card>

            <div className="rounded-3xl border border-white/10 bg-black/40 p-5 space-y-4">
              <div className="flex items-center justify-between text-sm text-white/60 uppercase tracking-[0.3em]">
                <span>Live map preview</span>
                <span>Live view</span>
              </div>
              <div className="relative rounded-2xl overflow-hidden border border-white/10">
                <div className="absolute inset-0 opacity-60" style={{ backgroundImage: "var(--sky-gradient)" }} />
                <div className="relative aspect-video px-6 py-5 flex flex-col justify-between">
                  <div className="flex justify-between text-white/80 text-sm font-mono">
                    <span>
                      {primaryFrame ? `${primaryFrame.droneId} · ${primaryFrame.status || "cruising"}` : "DRN-08 · demo"}
                    </span>
                    <span>{primaryFrame ? `ETA ${primaryFrame.speed.toFixed(0)} km/h` : "ETA 04:12"}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-3 text-white/80 text-sm">
                    <div>
                      <p className="text-white/60 text-xs uppercase">Distance</p>
                      <p className="text-lg font-semibold">
                        {primaryFrame ? `${(primaryFrame.speed * 0.6).toFixed(1)} km` : "18.4 km"}
                      </p>
                    </div>
                    <div>
                      <p className="text-white/60 text-xs uppercase">Speed</p>
                      <p className="text-lg font-semibold">{droneVitals.speed} km/h</p>
                    </div>
                    <div>
                      <p className="text-white/60 text-xs uppercase">Cost</p>
                      <p className="text-lg font-semibold">₦19,900</p>
                    </div>
                    <div>
                      <p className="text-white/60 text-xs uppercase">Carbon</p>
                      <p className="text-lg font-semibold">-58%</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm uppercase tracking-[0.3em] text-white/60">
                  Recent requests
                  {!missionsLoading && !missions.length && " • demo feed"}
                </p>
                <Button
                  variant="ghost"
                  className="text-white/70 hover:bg-white/10"
                  onClick={() => navigate("/history")}
                >
                  View history
                </Button>
              </div>
              <div className="space-y-4">
                {missionCards.map((request) => (
                  <div key={request.id} className="rounded-3xl border border-white/10 bg-black/30 px-5 py-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs text-white/50 uppercase tracking-[0.3em]">#{request.id}</p>
                        <p className="text-xl font-semibold text-white mt-1">{request.pickup}</p>
                        <p className="text-white/60 text-sm">→ {request.dropoff}</p>
                      </div>
                      <div className="text-right">
                        <Badge className="bg-white/10 text-white border-white/20">
                          {(request.priority || "standard").toUpperCase()}
                        </Badge>
                        <p className="text-2xl font-semibold text-white mt-2">
                          {request.etaMinutes ? `${request.etaMinutes} min` : "—"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm text-white/70">
                      <span>{request.status === "pending" ? "Awaiting pilot pairing" : request.status}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-white/20 text-white/80 hover:bg-white/10"
                        onClick={() => navigate("/track")}
                      >
                        Track
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-[32px] border border-white/10 bg-black/40 backdrop-blur p-6 space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-white/60">Operator screen</p>
                <h2 className="text-3xl font-semibold text-white mt-1">Flight deck & payouts</h2>
                <p className="text-white/70 mt-2">
                  Accept semi-autonomous missions, monitor vitals, and get paid instantly.
                </p>
              </div>
              <Badge className="bg-green-500/20 text-green-300 border border-green-500/30">Live</Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-accent" />
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/60">Location</p>
                    <p className="text-lg font-semibold">{droneVitals.location}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-3">
                  <Battery className="h-5 w-5 text-primary" />
                  <div className="flex-1">
                    <p className="text-xs uppercase tracking-[0.3em] text-white/60">Battery</p>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold">{droneVitals.battery}%</span>
                      <Progress value={droneVitals.battery} className="h-1 bg-white/10" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-3">
                  <RadioTower className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/60">Signal</p>
                    <p className="text-lg font-semibold">{droneVitals.signal}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-3">
                  <Compass className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/60">Temp</p>
                    <p className="text-lg font-semibold">{droneVitals.temperature}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 overflow-hidden">
              <div className="relative bg-gradient-to-br from-black via-[#05060a] to-transparent">
                <div className="absolute inset-0 opacity-50" style={{ backgroundImage: "var(--ride-glow)" }} />
                <div className="relative aspect-video p-6 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Video className="h-5 w-5 text-primary" />
                      <span className="text-white/80 text-sm uppercase tracking-[0.3em]">Live feed</span>
                    </div>
                    <Badge className="bg-red-500/20 text-red-300 border border-red-500/30">REC</Badge>
                  </div>
                  <div className="text-center text-white/80">
                    <p className="text-lg font-semibold">Cinematic POV streaming...</p>
                    <p className="text-sm text-white/60">Multi-cam overlay with obstacle trace</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-black/30 p-5 space-y-4">
                <p className="text-sm uppercase tracking-[0.3em] text-white/60">Virtual joystick</p>
                <div className="grid grid-cols-3 gap-2 max-w-[220px] mx-auto">
                  <div />
                  <Button variant="outline" size="icon" className="border-white/20 text-white hover:bg-white/10">
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <div />
                  <Button variant="outline" size="icon" className="border-white/20 text-white hover:bg-white/10">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="border-white/20 text-white hover:bg-white/10">
                    <Play className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="border-white/20 text-white hover:bg-white/10">
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <div />
                  <Button variant="outline" size="icon" className="border-white/20 text-white hover:bg-white/10">
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <div />
                </div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-black/30 p-5 space-y-3">
                <p className="text-sm uppercase tracking-[0.3em] text-white/60">Essential buttons</p>
                <div className="grid grid-cols-2 gap-3">
                  <Button className="bg-red-500/20 text-red-200 border border-red-500/30 hover:bg-red-500/30">
                    <Pause className="mr-2 h-4 w-4" />
                    Pause
                  </Button>
                  <Button className="bg-amber-500/20 text-amber-100 border border-amber-500/30 hover:bg-amber-500/30">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Return
                  </Button>
                  <Button className="bg-green-500/20 text-green-100 border border-green-500/30 hover:bg-green-500/30">
                    <Play className="mr-2 h-4 w-4" />
                    Resume
                  </Button>
                  <Button className="bg-primary/20 text-primary border border-primary/40 hover:bg-primary/25">
                    <DollarSign className="mr-2 h-4 w-4" />
                    Cashout
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm uppercase tracking-[0.3em] text-white/60">Available missions</p>
                <Button
                  variant="outline"
                  className="border-white/20 text-white/80 hover:bg-white/10"
                  onClick={() => navigate("/operator")}
                >
                  View operator hub
                </Button>
              </div>
              <div className="space-y-4">
                {operatorMissions.map((mission) => (
                  <div key={mission.id} className="rounded-3xl border border-white/10 bg-black/30 p-5 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs text-white/50 uppercase tracking-[0.3em]">#{mission.id}</p>
                        <p className="text-xl font-semibold text-white mt-1">{mission.route}</p>
                        <div className="flex items-center gap-2 text-sm text-white/70 mt-2">
                          <Badge className="bg-white/10 text-white border-white/20">Semi-autonomous</Badge>
                          <span>{mission.distance}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-white/60 uppercase tracking-[0.3em]">Earn</p>
                        <p className="text-3xl font-semibold text-white">{mission.payout}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm text-white/60">
                        <span>Autopilot assist</span>
                        <span>{mission.autopilot}%</span>
                      </div>
                      <Progress value={mission.autopilot} className="h-2 bg-white/10" />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-white/70">
                        <Shield className="h-4 w-4 text-primary" />
                        Priority insurance active
                      </div>
                      <Button
                        className="bg-gradient-to-r from-primary to-accent text-black font-semibold"
                        onClick={() => navigate("/pilot")}
                      >
                        Accept & earn
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
