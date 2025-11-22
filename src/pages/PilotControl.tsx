import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Home,
  X,
  Battery,
  Radio,
  Video,
  Eye,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTelemetry } from "@/hooks/useTelemetry";
import { coreApi } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { VideoStream } from "@/components/VideoStream";
import { useGamepad } from "@/hooks/useGamepad";
import { LiveMap } from "@/components/LiveMap";

export default function PilotControl() {
  const { missionId, deliveryId } = useParams<{ missionId?: string; deliveryId?: string }>();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { frames } = useTelemetry();
  const [commandType, setCommandType] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);
  const [mission, setMission] = useState<any>(null);
  const drone = useMemo(() => frames[0], [frames]);
  const gamepad = useGamepad();
  const axesRef = useRef<number[]>(gamepad.axes);

  // Load mission/delivery data
  useEffect(() => {
    const loadMission = async () => {
      if (missionId) {
        try {
          // Try active missions first, then all missions
          const activeMissions = await coreApi.listActiveMissions();
          let found = activeMissions.find((m) => m.id === missionId);
          
          if (!found) {
            // Try all missions if not in active
            const allMissions = await coreApi.listMissions();
            found = allMissions.find((m) => m.id === missionId);
          }
          
          if (found) setMission(found);
        } catch (error) {
          console.warn("Failed to load mission from core API (this is OK if core API is not configured)", error);
          // Don't break the page if core API is unavailable
        }
      } else if (deliveryId) {
        // Load delivery data if needed
        try {
          const { data } = await supabase
            .from("deliveries")
            .select("*")
            .eq("id", deliveryId)
            .maybeSingle();
          if (data) {
            setMission({ ...data, type: "delivery" });
          }
        } catch (error) {
          console.error("Failed to load delivery", error);
        }
      }
    };
    loadMission();
  }, [missionId, deliveryId]);

  useEffect(() => {
    axesRef.current = gamepad.axes;
  }, [gamepad.axes]);

  useEffect(() => {
    if (!manualMode || !drone || !gamepad.connected) return;
    setManualError(null);

    const interval = setInterval(() => {
      const [roll = 0, pitch = 0, yaw = 0, throttle = 0] = axesRef.current;
      const magnitude = Math.max(Math.abs(roll), Math.abs(pitch), Math.abs(yaw), Math.abs(throttle));
      if (magnitude < 0.08) return;

      coreApi
        .sendCommand({
          droneId: drone.droneId,
          type: "CUSTOM",
          payload: {
            mode: "MANUAL_OVERRIDE",
            roll,
            pitch,
            yaw,
            throttle,
            timestamp: Date.now(),
          },
        })
        .catch((error) => {
          setManualError(error?.message || "Unable to relay joystick input");
        });
    }, 200);

    return () => clearInterval(interval);
  }, [manualMode, drone, gamepad.connected]);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header HUD */}
      <div className="bg-black/90 backdrop-blur-sm p-4 border-b border-primary/20">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10"
              onClick={() => navigate("/operator")}
            >
              <X className="h-5 w-5" />
            </Button>
            <button
              type="button"
              onClick={() => navigate("/operator")}
              className="focus:outline-none"
            >
              <img src="/logo-final.png" alt="SkyLink" className="h-10" />
            </button>
            <h1 className="text-xl font-bold">Pilot Control Room</h1>
            {mission && (
              <Badge variant="outline" className="text-white border-sky-400/60">
                Mission #{mission.id.slice(0, 8)}
              </Badge>
            )}
            <Badge className={drone ? "bg-sky-500" : "bg-slate-600 text-slate-100"}>
              {drone ? `Linked · ${drone.droneId}` : "Waiting for drone"}
            </Badge>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Battery className="h-4 w-4 text-sky-400" />
              <span className="text-sm font-mono">{drone?.battery ?? "--"}%</span>
            </div>
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-primary" />
              <span className="text-sm">
                GPS: {drone ? `${drone.latitude.toFixed(2)},${drone.longitude.toFixed(2)}` : "acquiring"}
              </span>
            </div>
            <Badge variant="secondary">AUTO MODE</Badge>
            <Button
              variant="ghost"
              size="sm"
              className="ml-4 text-white/80 hover:bg-white/10"
              onClick={signOut}
            >
              <X className="h-3 w-3 mr-1" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4 p-4 max-w-7xl mx-auto">
        {/* Left Panel - Camera Feed */}
        <div className="md:col-span-2 space-y-4">
          <Card className="bg-gray-900 border-primary/20">
            <CardContent className="p-0">
              <div className="aspect-video relative overflow-hidden">
                {drone ? (
                  <>
                    <VideoStream droneId={drone.droneId} className="w-full h-full" />
                    {/* HUD Overlays */}
                    <div className="absolute top-4 left-4 space-y-1 text-xs font-mono z-10">
                      <div className="bg-black/70 px-2 py-1 rounded text-white">ALT: {drone.altitude.toFixed(0)}m</div>
                      <div className="bg-black/70 px-2 py-1 rounded text-white">SPD: {drone.speed.toFixed(1)} m/s</div>
                      <div className="bg-black/70 px-2 py-1 rounded text-white">HDG: {drone.heading.toFixed(0)}°</div>
                </div>
                  </>
                ) : (
                  <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                    <div className="text-center text-white/60">
                  <Video className="h-16 w-16 mx-auto mb-3 text-primary/50" />
                      <p className="text-muted-foreground">Waiting for drone connection</p>
                      <p className="text-sm text-muted-foreground/60">Video feed will appear here</p>
                  </div>
                </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Live Map */}
          <Card className="bg-gray-900 border-primary/20">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-3">Live Tracking Map</h3>
              <div className="h-64 rounded-lg overflow-hidden">
                <LiveMap height="100%" showControls={false} />
              </div>
            </CardContent>
          </Card>

          {/* Virtual Joysticks */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-gray-900 border-primary/20">
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-3 text-center">Altitude & Rotation</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onMouseDown={() => sendManualControl({ throttle: 0.5 })}
                    onMouseUp={() => sendManualControl({ throttle: 0 })}
                    disabled={!drone}
                    className="h-16 bg-primary/20 hover:bg-primary/40"
                  >
                    <div className="flex flex-col items-center">
                      <ArrowUp className="h-5 w-5" />
                      <span className="text-xs">Climb</span>
                    </div>
                  </Button>
                  <Button
                    onMouseDown={() => sendManualControl({ yaw: 0.3 })}
                    onMouseUp={() => sendManualControl({ yaw: 0 })}
                    disabled={!drone}
                    className="h-16 bg-primary/20 hover:bg-primary/40"
                  >
                    <div className="flex flex-col items-center">
                      <RotateCcw className="h-5 w-5 scale-x-[-1]" />
                      <span className="text-xs">Turn Right</span>
                    </div>
                  </Button>
                  <Button
                    onMouseDown={() => sendManualControl({ throttle: -0.5 })}
                    onMouseUp={() => sendManualControl({ throttle: 0 })}
                    disabled={!drone}
                    className="h-16 bg-primary/20 hover:bg-primary/40"
                  >
                    <div className="flex flex-col items-center">
                      <ArrowDown className="h-5 w-5" />
                      <span className="text-xs">Descend</span>
                    </div>
                  </Button>
                  <Button
                    onMouseDown={() => sendManualControl({ yaw: -0.3 })}
                    onMouseUp={() => sendManualControl({ yaw: 0 })}
                    disabled={!drone}
                    className="h-16 bg-primary/20 hover:bg-primary/40"
                  >
                    <div className="flex flex-col items-center">
                      <RotateCcw className="h-5 w-5" />
                      <span className="text-xs">Turn Left</span>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-primary/20">
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-3 text-center">Movement</h3>
                <div className="grid grid-cols-3 gap-2">
                  <div></div>
                  <Button
                    onMouseDown={() => sendManualControl({ pitch: 0.5 })}
                    onMouseUp={() => sendManualControl({ pitch: 0 })}
                    disabled={!drone}
                    className="h-16 bg-accent/20 hover:bg-accent/40"
                  >
                    <div className="flex flex-col items-center">
                      <ArrowUp className="h-5 w-5" />
                      <span className="text-xs">Forward</span>
                    </div>
                  </Button>
                  <div></div>
                  <Button
                    onMouseDown={() => sendManualControl({ roll: -0.5 })}
                    onMouseUp={() => sendManualControl({ roll: 0 })}
                    disabled={!drone}
                    className="h-16 bg-accent/20 hover:bg-accent/40"
                  >
                    <div className="flex flex-col items-center">
                      <ArrowLeft className="h-5 w-5" />
                      <span className="text-xs">Left</span>
                    </div>
                  </Button>
                  <Button
                    onMouseDown={() => sendManualControl({ pitch: -0.5 })}
                    onMouseUp={() => sendManualControl({ pitch: 0 })}
                    disabled={!drone}
                    className="h-16 bg-accent/20 hover:bg-accent/40"
                  >
                    <div className="flex flex-col items-center">
                      <ArrowDown className="h-5 w-5" />
                      <span className="text-xs">Back</span>
                    </div>
                  </Button>
                  <Button
                    onMouseDown={() => sendManualControl({ roll: 0.5 })}
                    onMouseUp={() => sendManualControl({ roll: 0 })}
                    disabled={!drone}
                    className="h-16 bg-accent/20 hover:bg-accent/40"
                  >
                    <div className="flex flex-col items-center">
                      <ArrowRight className="h-5 w-5" />
                      <span className="text-xs">Right</span>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Panel - Controls & Status */}
        <div className="space-y-4">
          <Card className="bg-gray-900 border-primary/20">
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold mb-3">Emergency Controls</h3>
              <Button
                variant="destructive"
                className="w-full"
                disabled={!drone || commandType === "PAUSE"}
                onClick={() => handleCommand("PAUSE")}
              >
                <X className="mr-2 h-4 w-4" />
                Emergency Brake
              </Button>
              <Button
                className="w-full bg-amber-600 hover:bg-amber-700"
                disabled={!drone || commandType === "RETURN_TO_BASE"}
                onClick={() => handleCommand("RETURN_TO_BASE")}
              >
                <Home className="mr-2 h-4 w-4" />
                Return to Home
              </Button>
              <Button
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={!drone || commandType === "LAND"}
                onClick={() => handleCommand("LAND")}
              >
                Land Now
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-primary/20">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3">AI Features</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-black/30 rounded">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-accent" />
                    <span className="text-sm">Object Detection</span>
                  </div>
                  <Badge className="bg-green-500">Active</Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-black/30 rounded">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-accent" />
                    <span className="text-sm">Face Recognition</span>
                  </div>
                  <Badge variant="secondary">Off</Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-black/30 rounded">
                  <div className="flex items-center gap-2">
                    <Radio className="h-4 w-4 text-accent" />
                    <span className="text-sm">GPS-Denied Nav</span>
                  </div>
                  <Badge variant="secondary">Standby</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-primary/20">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Joystick Link</h3>
                <Badge variant="outline" className="text-xs">
                  {gamepad.connected ? gamepad.id || "Controller detected" : "No controller"}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm text-white/80">
                {["Roll", "Pitch", "Yaw", "Throttle"].map((label, idx) => (
                  <div key={label} className="rounded-xl border border-white/10 px-3 py-2 bg-black/30">
                    <p className="text-white/60 text-xs uppercase tracking-[0.3em]">{label}</p>
                    <p className="font-mono text-lg">{(gamepad.axes[idx] ?? 0).toFixed(2)}</p>
                  </div>
                ))}
              </div>
              <Button
                className={manualMode ? "w-full bg-white text-black hover:bg-white/80" : "w-full bg-primary/60"}
                disabled={!drone || !gamepad.connected}
                onClick={() => setManualMode((prev) => !prev)}
              >
                {manualMode ? "Disable Manual Override" : "Enable Manual Override"}
              </Button>
              <p className="text-xs text-white/60">
                {gamepad.connected
                  ? "Axes stream every 200ms when override is active."
                  : "Connect a USB/Bluetooth joystick to activate manual control."}
              </p>
              {manualError && <p className="text-xs text-red-400">{manualError}</p>}
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-primary/20">
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3">Flight Stats</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Altitude:</span>
                  <span className="font-mono">{drone?.altitude ?? 0} m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Speed:</span>
                  <span className="font-mono">{drone?.speed ?? 0} m/s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Heading:</span>
                  <span className="font-mono">{drone?.heading ?? 0}°</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Signal:</span>
                  <span className="font-mono text-green-500">
                    {typeof drone?.signalQuality === "number" ? `${drone.signalQuality}%` : "--"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  function handleCommand(type: "RETURN_TO_BASE" | "PAUSE" | "LAND" | "RESUME") {
    if (!drone) {
      toast.error("No drone connected");
      return;
    }
    setCommandType(type);
    coreApi
      .sendCommand({ droneId: drone.droneId, type })
      .then(() => toast.success("Command sent"))
      .catch((error) => toast.error(error?.message || "Failed"))
      .finally(() => setCommandType(null));
  }

  function sendManualControl(controls: { roll?: number; pitch?: number; yaw?: number; throttle?: number }) {
    if (!drone) return;
    
    coreApi.sendCommand({
      droneId: drone.droneId,
      type: "CUSTOM",
      payload: {
        mode: "MANUAL_CONTROL",
        roll: controls.roll || 0,
        pitch: controls.pitch || 0,
        yaw: controls.yaw || 0,
        throttle: controls.throttle || 0,
        timestamp: Date.now(),
      },
    }).catch((error) => {
      console.error("Manual control error:", error);
    });
  }
}
