import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  Map,
  Activity,
  AlertTriangle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTelemetry } from "@/hooks/useTelemetry";
import { coreApi } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useGamepad } from "@/hooks/useGamepad";
import { LiveMap } from "@/components/LiveMap";
import { jetsonApi, type JetsonTelemetry } from "@/lib/jetsonApi";
// @ts-ignore - nipplejs doesn't have types
import nipplejs from "nipplejs";

export default function PilotControl() {
  const { missionId, deliveryId } = useParams<{ missionId?: string; deliveryId?: string }>();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { frames } = useTelemetry();
  const [commandType, setCommandType] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);
  const [mission, setMission] = useState<any>(null);
  const [jetsonTelemetry, setJetsonTelemetry] = useState<JetsonTelemetry | null>(null);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [viewMode, setViewMode] = useState<"normal" | "heatmap">("normal");
  const [jetsonConnected, setJetsonConnected] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const drone = useMemo(() => frames[0], [frames]);
  const gamepad = useGamepad();
  const axesRef = useRef<number[]>(gamepad.axes);
  const leftJoystickRef = useRef<HTMLDivElement>(null);
  const rightJoystickRef = useRef<HTMLDivElement>(null);
  const leftJoystickManager = useRef<any>(null);
  const rightJoystickManager = useRef<any>(null);
  const [showBottomPanel, setShowBottomPanel] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [missionStatus, setMissionStatus] = useState<string | null>(null);

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
          
          if (found) {
            setMission(found);
            setMissionStatus(found.status);
          }
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
            setMissionStatus(data.status);
          }
        } catch (error) {
          console.error("Failed to load delivery", error);
        }
      }
    };
    loadMission();
  }, [missionId, deliveryId]);

  // Navigation guard - prevent accidental exit
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const isMissionComplete = missionStatus && ["delivered", "completed", "failed", "cancelled"].includes(missionStatus);
      
      if (!isMissionComplete) {
        e.preventDefault();
        window.history.pushState(null, "", window.location.href);
        setShowExitDialog(true);
      }
    };

    // Push state to enable back button detection
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [missionStatus]);

  // Browser back/close protection
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const isMissionComplete = missionStatus && ["delivered", "completed", "failed", "cancelled"].includes(missionStatus);
      
      if (!isMissionComplete && jetsonConnected) {
        e.preventDefault();
        e.returnValue = "⚠️ WARNING: You have an active drone control session. Leaving now may disconnect the drone. Are you absolutely sure?";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [missionStatus, jetsonConnected]);

  const handleExit = () => {
    const isMissionComplete = missionStatus && ["delivered", "completed", "failed", "cancelled"].includes(missionStatus);
    
    if (!isMissionComplete) {
      setShowExitDialog(true);
      return;
    }
    
    // Mission is complete, safe to exit
    navigate("/operator");
  };

  const confirmExit = () => {
    setShowExitDialog(false);
    setPendingNavigation(null);
    // Disconnect Jetson before leaving
    jetsonApi.disconnect();
    navigate("/operator");
  };

  const cancelExit = () => {
    setShowExitDialog(false);
    setPendingNavigation(null);
  };

  // Connect to Jetson on mount
  useEffect(() => {
    let telemetryInterval: NodeJS.Timeout;
    let reconnectTimeout: NodeJS.Timeout;

    const connectJetson = async () => {
      try {
        console.log("[Jetson] Attempting to connect...");
        
        // Connect WebSocket with better error handling
        const ws = jetsonApi.connectWebSocket((data) => {
          console.log("[Jetson] WebSocket message:", data);
          // Update telemetry from WebSocket if available
          if (data.bat !== undefined || data.alt !== undefined || data.armed !== undefined) {
            setJetsonTelemetry({
              bat: data.bat ?? 0,
              alt: data.alt ?? 0,
              armed: data.armed ?? false,
            });
          }
        });

        // Wait for WebSocket to open
        await new Promise((resolve, reject) => {
          if (ws.readyState === WebSocket.OPEN) {
            resolve(ws);
            return;
          }
          
          ws.onopen = () => {
            console.log("[Jetson] WebSocket connected");
            setJetsonConnected(true);
            resolve(ws);
          };
          
          ws.onerror = (error) => {
            console.error("[Jetson] WebSocket error:", error);
            reject(error);
          };
          
          ws.onclose = () => {
            console.log("[Jetson] WebSocket closed, will attempt to reconnect...");
            setJetsonConnected(false);
            reconnectTimeout = setTimeout(connectJetson, 3000);
          };
        });

        // Connect video stream
        if (videoRef.current) {
          try {
            await jetsonApi.connectVideoStream(videoRef.current);
            console.log("[Jetson] Video stream connected");
          } catch (videoError) {
            console.error("[Jetson] Video stream failed, trying MJPEG fallback:", videoError);
            // Fallback to MJPEG if WebRTC fails
            if (videoRef.current) {
              videoRef.current.src = jetsonApi.getMJPEGFeedUrl();
            }
          }
        }

        // Fetch telemetry periodically
        telemetryInterval = setInterval(async () => {
          try {
            const telemetry = await jetsonApi.getTelemetry();
            setJetsonTelemetry(telemetry);
          } catch (error) {
            console.warn("[Jetson] Failed to fetch telemetry:", error);
          }
        }, 1000);

      } catch (error) {
        console.error("[Jetson] Connection failed:", error);
        setJetsonConnected(false);
        toast.error("Failed to connect to Jetson. Check if server is running.");
        // Retry connection after 5 seconds
        reconnectTimeout = setTimeout(connectJetson, 5000);
      }
    };

    connectJetson();

    return () => {
      if (telemetryInterval) clearInterval(telemetryInterval);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      jetsonApi.disconnect();
    };
  }, []);

  useEffect(() => {
    axesRef.current = gamepad.axes;
  }, [gamepad.axes]);

  // Initialize virtual joysticks
  useEffect(() => {
    if (!leftJoystickRef.current || !rightJoystickRef.current) return;

    // Left joystick - Throttle & Yaw
    leftJoystickManager.current = nipplejs.create({
      zone: leftJoystickRef.current,
      mode: 'static',
      position: { left: '50%', top: '50%' },
      color: '#f97316', // Orange
      size: 120,
      threshold: 0.1,
    });

    leftJoystickManager.current.on('move', (evt: any, data: any) => {
      if (manualMode && jetsonConnected) {
        const y = -data.vector.y; // Invert Y (up = positive)
        const x = data.vector.x;
        jetsonApi.sendControl({
          l: { x: x, y: y },
        });
      }
    });

    leftJoystickManager.current.on('end', () => {
      if (manualMode && jetsonConnected) {
        jetsonApi.sendControl({
          l: { x: 0, y: -1 }, // Default throttle position
        });
      }
    });

    // Right joystick - Pitch & Roll
    rightJoystickManager.current = nipplejs.create({
      zone: rightJoystickRef.current,
      mode: 'static',
      position: { left: '50%', top: '50%' },
      color: '#06b6d4', // Cyan
      size: 120,
      threshold: 0.1,
    });

    rightJoystickManager.current.on('move', (evt: any, data: any) => {
      if (manualMode && jetsonConnected) {
        const y = data.vector.y;
        const x = data.vector.x;
        jetsonApi.sendControl({
          r: { x: x, y: y },
        });
      }
    });

    rightJoystickManager.current.on('end', () => {
      if (manualMode && jetsonConnected) {
        jetsonApi.sendControl({
          r: { x: 0, y: 0 },
        });
      }
    });

    return () => {
      if (leftJoystickManager.current) {
        leftJoystickManager.current.destroy();
      }
      if (rightJoystickManager.current) {
        rightJoystickManager.current.destroy();
      }
    };
  }, [manualMode, jetsonConnected]);

  useEffect(() => {
    if (!manualMode) return;
    setManualError(null);

    const interval = setInterval(() => {
      if (gamepad.connected) {
        const [roll = 0, pitch = 0, yaw = 0, throttle = 0] = axesRef.current;
        const magnitude = Math.max(Math.abs(roll), Math.abs(pitch), Math.abs(yaw), Math.abs(throttle));
        if (magnitude < 0.08) return;

        // Send to Jetson via WebSocket
        jetsonApi.sendControl({
          l: { x: roll, y: throttle },
          r: { x: yaw, y: pitch },
        });
      }
    }, 33); // ~30fps for smooth control

    return () => clearInterval(interval);
  }, [manualMode, gamepad.connected]);

  return (
    <div className="h-screen w-screen bg-black text-white relative overflow-hidden">
      {/* Video Feed - Full Screen Background */}
      <div className="absolute inset-0 z-0">
        {jetsonConnected ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
            <div className="text-center text-white/60">
              <Video className="h-24 w-24 mx-auto mb-6 text-red-500 animate-pulse" />
              <p className="text-3xl font-bold text-red-400 mb-3 tracking-wider">OFFLINE</p>
              <p className="text-base text-muted-foreground">Connecting to Jetson server...</p>
            </div>
          </div>
        )}
      </div>

      {/* Overlay Controls */}
      <div className="absolute inset-0 z-10 flex flex-col pointer-events-none">
        {/* Top Bar - Premium Design */}
        <div className="bg-gradient-to-b from-black/95 to-black/80 backdrop-blur-md border-b border-primary/30 p-4 flex items-center justify-between pointer-events-auto">
          {/* Left - Primary Controls */}
          <div className="flex items-center gap-4">
            <Button
              variant={jetsonTelemetry?.armed ? "destructive" : "default"}
              className={`h-12 px-8 font-bold text-lg shadow-lg transition-all ${
                jetsonTelemetry?.armed 
                  ? "bg-red-600 hover:bg-red-700 shadow-red-500/50" 
                  : "bg-green-600 hover:bg-green-700 shadow-green-500/50"
              }`}
              disabled={!jetsonConnected}
              onClick={() => {
                jetsonApi.sendControl({ action: jetsonTelemetry?.armed ? "DISARM" : "ARM" });
                toast.success(jetsonTelemetry?.armed ? "Disarming..." : "Arming...");
              }}
            >
              {jetsonTelemetry?.armed ? "DISARM" : "ARM"}
            </Button>
            <Button
              variant="secondary"
              className="h-12 px-8 font-bold text-lg bg-gray-700/90 hover:bg-gray-600 shadow-lg border border-gray-600/50"
              disabled={!jetsonConnected}
              onClick={() => handleCommand("LAND")}
            >
              STOP
            </Button>
            <Button
              className="h-12 px-6 font-semibold bg-amber-600/90 hover:bg-amber-700 shadow-lg"
              disabled={!jetsonConnected || commandType === "RETURN_TO_BASE"}
              onClick={() => handleCommand("RETURN_TO_BASE")}
            >
              <Home className="mr-2 h-5 w-5" />
              HOME
            </Button>
          </div>

          {/* Center - Status Badges */}
          <div className="flex items-center gap-3">
            {mission && (
              <Badge variant="outline" className="text-white border-primary/60 bg-primary/10 px-3 py-1.5 text-sm font-semibold">
                Mission #{mission.id.slice(0, 8)}
              </Badge>
            )}
            <Badge className={`px-4 py-1.5 text-sm font-bold shadow-lg ${
              jetsonConnected ? "bg-green-600 shadow-green-500/50" : "bg-red-600 shadow-red-500/50 animate-pulse"
            }`}>
              {jetsonConnected ? "● ONLINE" : "● OFFLINE"}
            </Badge>
            <Badge variant={manualMode ? "default" : "secondary"} className="px-4 py-1.5 text-sm font-bold">
              {manualMode ? "MANUAL" : "AUTO"}
            </Badge>
          </div>

          {/* Right - Secondary Controls */}
          <div className="flex items-center gap-3">
            <Button
              variant={aiEnabled ? "default" : "outline"}
              className={`h-10 px-5 font-semibold ${
                aiEnabled 
                  ? "bg-primary shadow-lg shadow-primary/50" 
                  : "bg-gray-700/90 hover:bg-gray-600 border-gray-600/50"
              }`}
              onClick={async () => {
                const newState = !aiEnabled;
                setAiEnabled(newState);
                await jetsonApi.toggleAI(newState);
                toast.success(newState ? "AI Detection Enabled" : "AI Detection Disabled");
              }}
            >
              <Eye className="mr-2 h-4 w-4" />
              AI
            </Button>
            <Button
              variant="outline"
              className="h-10 px-5 font-semibold bg-gray-700/90 hover:bg-gray-600 border-gray-600/50"
              onClick={async () => {
                const newMode = viewMode === "normal" ? "heatmap" : "normal";
                setViewMode(newMode);
                await jetsonApi.toggleViewMode(newMode);
                toast.success(`View Mode: ${newMode}`);
              }}
            >
              <Video className="mr-2 h-4 w-4" />
              VIEW
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10 h-10 w-10 rounded-lg"
              onClick={handleExit}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* HUD Info - Top Left Corner */}
        {jetsonTelemetry && (
          <div className="absolute top-24 left-6 space-y-3 z-20 pointer-events-auto">
            <div className="bg-black/95 backdrop-blur-md px-4 py-3 rounded-xl text-white border border-primary/40 shadow-2xl">
              <div className="flex items-center gap-2 mb-1">
                <Battery className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Battery</span>
              </div>
              <p className="text-2xl font-bold text-primary">{jetsonTelemetry.bat.toFixed(1)}<span className="text-lg text-white/60">V</span></p>
            </div>
            <div className="bg-black/95 backdrop-blur-md px-4 py-3 rounded-xl text-white border border-primary/40 shadow-2xl">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Altitude</span>
              </div>
              <p className="text-2xl font-bold text-primary">{jetsonTelemetry.alt.toFixed(0)}<span className="text-lg text-white/60">m</span></p>
            </div>
            <div className={`bg-black/95 backdrop-blur-md px-4 py-3 rounded-xl border shadow-2xl ${
              jetsonTelemetry.armed 
                ? 'text-green-400 border-green-500/60 bg-green-500/10' 
                : 'text-red-400 border-red-500/60 bg-red-500/10'
            }`}>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Status</p>
              <p className="text-xl font-bold">{jetsonTelemetry.armed ? 'ARMED' : 'DISARMED'}</p>
            </div>
          </div>
        )}

        {/* Virtual Joysticks - Bottom Corners (Properly Positioned) */}
        <div className="absolute bottom-24 left-8 z-20 pointer-events-auto">
          <div className="bg-black/90 backdrop-blur-md rounded-2xl border-2 border-orange-500/40 shadow-2xl p-6">
            <p className="text-xs font-bold text-orange-400 mb-3 text-center uppercase tracking-wider">Throttle & Yaw</p>
            <div 
              ref={leftJoystickRef}
              className="w-40 h-40 rounded-full relative"
              style={{ touchAction: 'none' }}
            />
            {!manualMode && (
              <p className="text-xs text-muted-foreground text-center mt-2">Enable Manual Mode</p>
            )}
          </div>
        </div>

        <div className="absolute bottom-24 right-8 z-20 pointer-events-auto">
          <div className="bg-black/90 backdrop-blur-md rounded-2xl border-2 border-cyan-500/40 shadow-2xl p-6">
            <p className="text-xs font-bold text-cyan-400 mb-3 text-center uppercase tracking-wider">Pitch & Roll</p>
            <div 
              ref={rightJoystickRef}
              className="w-40 h-40 rounded-full relative"
              style={{ touchAction: 'none' }}
            />
            {!manualMode && (
              <p className="text-xs text-muted-foreground text-center mt-2">Enable Manual Mode</p>
            )}
          </div>
        </div>

        {/* Manual Mode Toggle - Center Bottom */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20 pointer-events-auto">
          <Button
            className={`h-14 px-8 font-bold text-lg shadow-2xl transition-all ${
              manualMode 
                ? "bg-white text-black hover:bg-white/90 shadow-white/50" 
                : "bg-primary/80 hover:bg-primary shadow-primary/50"
            }`}
            disabled={!jetsonConnected}
            onClick={() => {
              setManualMode((prev) => !prev);
              toast.success(manualMode ? "Manual mode disabled" : "Manual mode enabled");
            }}
          >
            {manualMode ? "● MANUAL ACTIVE" : "○ AUTO MODE"}
          </Button>
        </div>

        {/* Bottom Panel Toggle Button */}
        <div className="absolute bottom-8 right-8 z-20 pointer-events-auto">
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-full bg-black/90 backdrop-blur-md border-primary/40 hover:bg-primary/20"
            onClick={() => setShowBottomPanel(!showBottomPanel)}
          >
            <Map className="h-5 w-5" />
          </Button>
        </div>

        {/* Bottom Panel - Map & Stats (Slide Up) */}
        {showBottomPanel && (
          <div className="absolute bottom-0 left-0 right-0 bg-black/95 backdrop-blur-md border-t-2 border-primary/30 shadow-2xl pointer-events-auto animate-in slide-in-from-bottom">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Flight Information</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/10"
                  onClick={() => setShowBottomPanel(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Map */}
                <Card className="bg-gray-900/90 border-primary/30 shadow-xl">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Map className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold text-white">Live Map</h3>
                    </div>
                    <div className="h-64 rounded-lg overflow-hidden border border-primary/20">
                      <LiveMap height="100%" showControls={false} />
                    </div>
                  </CardContent>
                </Card>

                {/* Stats Grid */}
                <Card className="bg-gray-900/90 border-primary/30 shadow-xl">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Activity className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold text-white">Flight Statistics</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-black/50 rounded-lg p-4 border border-primary/20">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Altitude</p>
                        <p className="text-2xl font-bold text-primary">{drone?.altitude ?? 0}<span className="text-sm text-white/60">m</span></p>
                      </div>
                      <div className="bg-black/50 rounded-lg p-4 border border-primary/20">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Speed</p>
                        <p className="text-2xl font-bold text-primary">{drone?.speed ?? 0}<span className="text-sm text-white/60">m/s</span></p>
                      </div>
                      <div className="bg-black/50 rounded-lg p-4 border border-primary/20">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Heading</p>
                        <p className="text-2xl font-bold text-primary">{drone?.heading ?? 0}<span className="text-sm text-white/60">°</span></p>
                      </div>
                      <div className="bg-black/50 rounded-lg p-4 border border-primary/20">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Signal</p>
                        <p className="text-2xl font-bold text-green-500">
                          {typeof drone?.signalQuality === "number" ? `${drone.signalQuality}` : "--"}
                          <span className="text-sm text-white/60">%</span>
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* Exit Confirmation Dialog - Double Confirmation */}
        <AlertDialog open={showExitDialog} onOpenChange={(open) => {
          if (!open) cancelExit();
        }}>
          <AlertDialogContent className="bg-gray-900 border-2 border-red-500/50 shadow-2xl max-w-md">
            <AlertDialogHeader>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                </div>
                <AlertDialogTitle className="text-2xl font-bold text-white">
                  ⚠️ Critical Warning
                </AlertDialogTitle>
              </div>
              <AlertDialogDescription className="text-base text-white/90 space-y-4">
                <div className="bg-red-500/10 border-l-4 border-red-500 p-4 rounded">
                  <p className="font-semibold text-red-400 mb-2 text-lg">
                    Active Drone Control Session
                  </p>
                  <p className="text-white/80 mb-3">
                    You are currently controlling a drone. Exiting now will:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-white/70 text-sm ml-2">
                    <li>Disconnect from the Jetson server</li>
                    <li>Stop all control commands</li>
                    <li>Potentially interrupt an active mission</li>
                  </ul>
                </div>
                
                {missionStatus && !["delivered", "completed", "failed", "cancelled"].includes(missionStatus) && (
                  <div className="bg-amber-500/20 border border-amber-500/50 rounded-lg p-4">
                    <p className="font-semibold text-amber-400 mb-1">
                      Mission Status: <span className="uppercase">{missionStatus}</span>
                    </p>
                    <p className="text-sm text-amber-300">
                      This mission is still active. Only exit if the mission is complete or in an emergency.
                    </p>
                  </div>
                )}
                
                <div className="bg-black/50 rounded-lg p-4 border border-white/10">
                  <p className="font-bold text-white text-center text-lg mb-1">
                    Are you absolutely certain?
                  </p>
                  <p className="text-sm text-white/70 text-center">
                    This action cannot be undone. The drone will lose connection.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-3 sm:flex-row">
              <AlertDialogCancel 
                onClick={cancelExit}
                className="bg-gray-700 hover:bg-gray-600 text-white border-gray-600 w-full sm:w-auto order-2 sm:order-1"
              >
                Cancel - Stay in Control
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmExit}
                className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto order-1 sm:order-2"
              >
                Yes, Exit Control Room
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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
    // Send to Jetson via WebSocket
    jetsonApi.sendControl({
      l: { x: controls.yaw || 0, y: controls.throttle || 0 },
      r: { x: controls.roll || 0, y: controls.pitch || 0 },
    });
  }
}
