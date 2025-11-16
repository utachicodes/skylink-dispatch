import { useEffect, useMemo, useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, MapPin, Clock, Check, X } from "lucide-react";
import { coreApi, type MissionResponse } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function OperatorDashboard() {
  const { user } = useAuth();
  const [missions, setMissions] = useState<MissionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const data = await coreApi.listActiveMissions();
      setMissions(data);
    } catch (error) {
      console.warn("[OperatorDashboard] failed to fetch missions", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 10000);
    return () => clearInterval(interval);
  }, []);

  const pending = missions.filter((mission) => ["pending", "assigned"].includes(mission.status));
  const stats = useMemo(() => {
    const active = missions.filter((mission) => mission.status === "in-flight").length;
    const completed = missions.filter((mission) => mission.status === "completed").length;
    const success =
      missions.length === 0 ? 100 : Math.round((completed / missions.length) * 100);
    return { active, completed, success };
  }, [missions]);

  const handleAccept = async (missionId: string) => {
    if (!user) return;
    try {
      setActionId(missionId);
      await coreApi.assignMission(missionId, user.id);
      toast.success("Mission accepted");
      await refresh();
    } catch (error: any) {
      toast.error(error?.message || "Couldn't accept");
    } finally {
      setActionId(null);
    }
  };

  const handleDecline = async (missionId: string) => {
    try {
      setActionId(missionId);
      await coreApi.updateMissionStatus(missionId, "failed");
      toast("Mission declined");
      await refresh();
    } catch (error: any) {
      toast.error(error?.message || "Couldn't decline");
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <header className="bg-sky-gradient text-white p-6 shadow-lg">
        <div className="flex items-center gap-4">
          <img src="/logo-final.png" alt="SkyLink" className="h-12 rounded-2xl bg-white/10 p-2" />
          <div>
            <h1 className="text-2xl font-bold">Operator Dashboard</h1>
            <p className="text-white/90 mt-1">Semi-autonomous requests streaming live</p>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-6 max-w-4xl mx-auto">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">{stats.active}</p>
                <p className="text-sm text-muted-foreground">Active Jobs</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-accent">{stats.completed}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-500">{stats.success}%</p>
                <p className="text-sm text-muted-foreground">Success Rate</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pending Requests</CardTitle>
            <CardDescription>
              {loading ? "Syncing with core server..." : "Pick a mission and take control"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(pending.length ? pending : missions).map((request) => (
              <div key={request.id} className="p-4 border rounded-lg space-y-3 bg-card/60">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    <span className="font-semibold">Request #{request.id.slice(0, 6)}</span>
                  </div>
                  <Badge variant="secondary" className="uppercase">
                    {request.priority}
                  </Badge>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">From: {request.pickup}</p>
                      <p className="text-muted-foreground">To: {request.dropoff}</p>
                    </div>
                  </div>
                  <div className="flex gap-4 text-muted-foreground">
                    <span>ETA: {request.etaMinutes ?? 12} min</span>
                    <span>{request.packageDetails}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    <span>{new Date(request.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <span>{request.status}</span>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    className="flex-1 bg-sky-gradient hover:opacity-90"
                    disabled={actionId === request.id}
                    onClick={() => handleAccept(request.id)}
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Accept
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    disabled={actionId === request.id}
                    onClick={() => handleDecline(request.id)}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Decline
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
}
