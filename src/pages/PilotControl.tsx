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
  const [commandType, setCommandType] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);
  const [mission, setMission] = useState<any>(null);
  const [jetsonTelemetry, setJetsonTelemetry] = useState<JetsonTelemetry | null>(null);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [viewMode, setViewMode] = useState<"normal" | "heatmap">("normal");
  const [jetsonConnected, setJetsonConnected] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null); // For MJPEG stream
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
  const [armCountdown, setArmCountdown] = useState<number | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [tutorialCancelled, setTutorialCancelled] = useState(false);
  const [highlightElement, setHighlightElement] = useState<string | null>(null);
  const [highlightPosition, setHighlightPosition] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  // Check if user has seen tutorial
  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('skylink_pilot_tutorial_completed');
    if (!hasSeenTutorial) {
      // Show tutorial after a short delay to let the page load
      setTimeout(() => {
        setShowTutorial(true);
        setTutorialStep(0);
      }, 1500);
    }
  }, []);

  // Update highlight position based on tutorial step
  useEffect(() => {
    if (!showTutorial || tutorialCancelled || tutorialStep === 0 || tutorialStep === 5) {
      setHighlightElement(null);
      setHighlightPosition(null);
      return;
    }

    const elementIds: Record<number, string> = {
      1: 'tutorial-connection-status',
      2: 'tutorial-arm-button',
      3: 'tutorial-manual-mode',
      4: 'tutorial-video-feed',
    };

    const elementId = elementIds[tutorialStep];
    if (!elementId) {
      setHighlightElement(null);
      setHighlightPosition(null);
      return;
    }

    setHighlightElement(elementId);
    
    // Calculate position after a short delay to ensure element is rendered
    const timer = setTimeout(() => {
      const element = document.getElementById(elementId);
      if (element) {
        const rect = element.getBoundingClientRect();
        setHighlightPosition({
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height,
        });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [showTutorial, tutorialStep, tutorialCancelled]);

  // Load mission/delivery data
  useEffect(() => {
    const loadMission = async () => {
      if (missionId) {
        // Mission loading - can be implemented later if needed
        console.log("[PilotControl] Mission ID provided:", missionId);
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

  // Arm countdown effect
  useEffect(() => {
    if (armCountdown === null) return;

    if (armCountdown > 0) {
      const timer = setTimeout(() => {
        setArmCountdown(armCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (armCountdown === 0) {
      // Countdown finished, arm the drone
      jetsonApi.sendControl({ action: "ARM" });
      toast.success("Drone armed successfully");
      setArmCountdown(null);
    }
  }, [armCountdown]);

  // Cancel countdown handler
  const cancelArmCountdown = () => {
    setArmCountdown(null);
    toast.info("Arming cancelled");
  };

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
    let isConnecting = false;
    let isMounted = true;

    const connectJetson = async () => {
      // Prevent multiple simultaneous connection attempts
      if (isConnecting) {
        console.log("[Jetson] Connection already in progress, skipping...");
        return;
      }

      if (!isMounted) {
        console.log("[Jetson] Component unmounted, aborting connection");
        return;
      }

      isConnecting = true;

      try {
        console.log("[Jetson] Attempting to connect...");
        
        // First, test HTTP connection (skip if CORS is blocking - we'll try WebSocket anyway)
        try {
          const connectionTest = await jetsonApi.testConnection();
          if (!connectionTest.success) {
            console.warn("[Jetson] HTTP connection test failed (CORS issue?):", connectionTest.error);
            // Don't throw - WebSocket might still work
          } else {
            console.log("[Jetson] HTTP connection test passed:", connectionTest.details);
          }
        } catch (testError) {
          console.warn("[Jetson] HTTP test failed, but continuing with WebSocket attempt:", testError);
        }
        
        // Connect WebSocket with better error handling
        const ws = jetsonApi.connectWebSocket((data) => {
          console.log("[Jetson] WebSocket message:", data);
          // Update telemetry from WebSocket if available
          if (data.bat !== undefined || data.alt !== undefined || data.armed !== undefined || data.lat !== undefined || data.lon !== undefined) {
            setJetsonTelemetry({
              bat: data.bat ?? 0,
              alt: data.alt ?? 0,
              armed: data.armed ?? false,
              lat: data.lat,
              lon: data.lon,
              speed: data.speed,
              heading: data.heading,
              signalQuality: data.signalQuality,
            });
          }
        });

        // Wait for WebSocket to open with timeout
        await new Promise<void>((resolve, reject) => {
          if (ws.readyState === WebSocket.OPEN) {
            console.log("[Jetson] WebSocket already open");
            setJetsonConnected(true);
            isConnecting = false;
            resolve();
            return;
          }

          const timeout = setTimeout(() => {
            if (ws.readyState !== WebSocket.OPEN) {
              ws.close();
              reject(new Error("WebSocket connection timeout"));
            }
          }, 10000); // 10 second timeout
          
          ws.onopen = () => {
            clearTimeout(timeout);
            console.log("[Jetson] WebSocket connected");
            setJetsonConnected(true);
            isConnecting = false;
            resolve();
          };
          
          ws.onerror = (error) => {
            clearTimeout(timeout);
            console.error("[Jetson] WebSocket error:", error);
            isConnecting = false;
            reject(new Error("WebSocket connection failed"));
          };
          
          ws.onclose = (event) => {
            clearTimeout(timeout);
            console.log("[Jetson] WebSocket closed. Code:", event.code, "Reason:", event.reason);
            setJetsonConnected(false);
            isConnecting = false;
            
            // Only reconnect if component is still mounted and it wasn't a clean close
            if (isMounted && event.code !== 1000) {
              console.log("[Jetson] Will attempt to reconnect in 5 seconds...");
              reconnectTimeout = setTimeout(() => {
                if (isMounted) connectJetson();
              }, 5000);
            }
          };
        });

        // Connect video stream - Use MJPEG directly (Python server provides /video_feed)
        // MJPEG works with <img> tag, not <video>
        if (imgRef.current && isMounted) {
          const mjpegUrl = jetsonApi.getMJPEGFeedUrl();
          console.log("[Jetson] Connecting to MJPEG stream:", mjpegUrl);
          
          // MJPEG streams work as simple image sources
          imgRef.current.src = mjpegUrl;
          
          imgRef.current.onerror = () => {
            console.error("[Jetson] MJPEG stream failed to load");
            toast.error("Video stream failed to load. Check Jetson server.");
          };
          
          imgRef.current.onload = () => {
            console.log("[Jetson] MJPEG stream loaded successfully");
          };
        }
        
        // Also try WebRTC for better latency (optional)
        if (videoRef.current && isMounted) {
          setTimeout(() => {
            jetsonApi.connectVideoStream(videoRef.current!).then(() => {
              console.log("[Jetson] WebRTC video stream connected (better latency)");
              // If WebRTC works, hide the MJPEG img
              if (imgRef.current) {
                imgRef.current.style.display = 'none';
              }
            }).catch((videoError) => {
              console.log("[Jetson] WebRTC not available, using MJPEG:", videoError.message);
              // MJPEG is already set, so we're good
            });
          }, 1000);
        }

        // Note: Python server doesn't have /api/telemetry endpoint
        // Telemetry is stored in drone.telemetry but not exposed via HTTP
        // We'll use default values and update if WebSocket sends telemetry data
        if (isMounted) {
          setJetsonTelemetry({
            bat: 0,
            alt: 0,
            armed: false,
          });
        }

      } catch (error: any) {
        console.error("[Jetson] Connection failed:", error);
        isConnecting = false;
        
        if (!isMounted) return;
        
        setJetsonConnected(false);
        
        // Only show toast if it's a new error (not a retry)
        // Don't show CORS-related messages since we're using a CORS-disabled browser
        if (!reconnectTimeout) {
          const errorMessage = error?.message || "Connection failed";
          // Filter out CORS-related messages
          const cleanMessage = errorMessage
            .replace(/CORS.*?enabled.*?Jetson.*?server/gi, "")
            .replace(/See.*?JETSON_CORS_FIX.*?help/gi, "")
            .replace(/Make sure CORS.*?/gi, "")
            .trim();
          
          if (cleanMessage && !cleanMessage.toLowerCase().includes("cors")) {
            toast.error(
              `Connecting to Jetson... Retrying...`,
              { duration: 3000 }
            );
          } else {
            // Silent retry - no toast for connection issues
            console.log("[Jetson] Retrying connection silently...");
          }
        }
        
        // Retry connection after 5 seconds (only if mounted)
        if (isMounted) {
          reconnectTimeout = setTimeout(() => {
            if (isMounted) connectJetson();
          }, 5000);
        }
      }
    };

    connectJetson();

    return () => {
      isMounted = false;
      isConnecting = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      jetsonApi.disconnect();
    };
  }, []);

  useEffect(() => {
    axesRef.current = gamepad.axes;
  }, [gamepad.axes]);

  // Initialize virtual joysticks
  // Python server expects both 'l' and 'r' in the same message (see drone_control_V2.py line 295)
  const joystickCommand = useRef({ l: { x: 0, y: -1 }, r: { x: 0, y: 0 } });

  useEffect(() => {
    if (!leftJoystickRef.current || !rightJoystickRef.current) return;

    // Left joystick - Throttle & Yaw
    // Python mapping: l_x = yaw, l_y = throttle (range -1 to 1, throttle: -1=down, +1=up)
    leftJoystickManager.current = nipplejs.create({
      zone: leftJoystickRef.current,
      mode: 'static',
      position: { left: '50%', top: '50%' },
      color: '#9ca3af', // Neutral gray/silver - professional DJI style
      size: 150, // Larger for precision
      threshold: 0.01, // Very sensitive - no dead zone
      lockX: false,
      lockY: false,
      restOpacity: 0.8,
      fadeTime: 150,
    });

    leftJoystickManager.current.on('start', () => {
      if (leftJoystickRef.current) {
        leftJoystickRef.current.style.borderColor = 'rgba(156, 163, 175, 0.6)';
        leftJoystickRef.current.style.boxShadow = '0 0 30px rgba(156, 163, 175, 0.3)';
      }
    });

    leftJoystickManager.current.on('move', (evt: any, data: any) => {
      if (manualMode && jetsonConnected) {
        // Direct mapping: x = yaw (left/right), y = throttle (down/up)
        // nipplejs gives -1 to +1 range, which matches Python exactly
        const x = data.vector.x; // Yaw: -1 (left) to +1 (right)
        const y = data.vector.y; // Throttle: -1 (down) to +1 (up), but we need to invert for throttle
        // Python expects: l_y from -1 (down) to +1 (up), so we invert Y
        joystickCommand.current.l = { x, y: -y }; // Invert Y for throttle (up = positive)
        
        // Send immediately for precision
        jetsonApi.sendControl({
          l: joystickCommand.current.l,
          r: joystickCommand.current.r,
        });
      }
    });

    leftJoystickManager.current.on('end', () => {
      if (leftJoystickRef.current) {
        leftJoystickRef.current.style.borderColor = 'rgba(156, 163, 175, 0.2)';
        leftJoystickRef.current.style.boxShadow = 'none';
      }
      if (manualMode && jetsonConnected) {
        // Reset to center (no yaw) and minimum throttle
        joystickCommand.current.l = { x: 0, y: -1 }; // y: -1 = throttle down (minimum)
        jetsonApi.sendControl({
          l: joystickCommand.current.l,
          r: joystickCommand.current.r,
        });
      }
    });

    // Right joystick - Pitch & Roll
    // Python mapping: r_x = roll, r_y = pitch
    rightJoystickManager.current = nipplejs.create({
      zone: rightJoystickRef.current,
      mode: 'static',
      position: { left: '50%', top: '50%' },
      color: '#9ca3af', // Neutral gray/silver - professional DJI style
      size: 150, // Larger for precision
      threshold: 0.01, // Very sensitive - no dead zone
      lockX: false,
      lockY: false,
      restOpacity: 0.8,
      fadeTime: 150,
    });

    rightJoystickManager.current.on('start', () => {
      if (rightJoystickRef.current) {
        rightJoystickRef.current.style.borderColor = 'rgba(156, 163, 175, 0.6)';
        rightJoystickRef.current.style.boxShadow = '0 0 30px rgba(156, 163, 175, 0.3)';
      }
    });

    rightJoystickManager.current.on('move', (evt: any, data: any) => {
      if (manualMode && jetsonConnected) {
        // Direct mapping: x = roll (left/right), y = pitch (forward/backward)
        // nipplejs gives -1 to +1 range, which matches Python exactly
        const x = data.vector.x; // Roll: -1 (left) to +1 (right)
        const y = data.vector.y; // Pitch: -1 (backward) to +1 (forward)
        joystickCommand.current.r = { x, y };
        
        // Send immediately for precision
        jetsonApi.sendControl({
          l: joystickCommand.current.l,
          r: joystickCommand.current.r,
        });
      }
    });

    rightJoystickManager.current.on('end', () => {
      if (rightJoystickRef.current) {
        rightJoystickRef.current.style.borderColor = 'rgba(156, 163, 175, 0.2)';
        rightJoystickRef.current.style.boxShadow = 'none';
      }
      if (manualMode && jetsonConnected) {
        // Reset to center (no pitch, no roll)
        joystickCommand.current.r = { x: 0, y: 0 };
        jetsonApi.sendControl({
          l: joystickCommand.current.l,
          r: joystickCommand.current.r,
        });
      }
    });

    // Send joystick commands periodically for smooth control (matches Python server - 33ms = ~30fps)
    // This ensures commands are sent even if move events are missed
    const sendInterval = setInterval(() => {
      if (manualMode && jetsonConnected) {
        jetsonApi.sendControl({
          l: joystickCommand.current.l,
          r: joystickCommand.current.r,
        });
      }
    }, 33); // ~30fps update rate

    return () => {
      clearInterval(sendInterval);
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
    <div className="h-screen w-screen bg-black text-white relative overflow-y-auto pilot-control-container">
      {/* Video Feed - Full Screen Background */}
      <div id="tutorial-video-feed" className="absolute inset-0 z-0">
        {jetsonConnected ? (
          <>
            {/* MJPEG Stream (primary, works with img tag) - Python server provides /video_feed */}
            <img
              ref={imgRef}
              src={jetsonApi.getMJPEGFeedUrl()}
              alt="Drone Camera Feed"
              className="w-full h-full object-cover"
              style={{ display: 'block' }}
              crossOrigin="anonymous"
            />
            {/* WebRTC Stream (optional, better latency if available) */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ display: 'none', position: 'absolute', top: 0, left: 0 }}
            />
                  </>
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
        {/* Top Bar - Professional DJI-Style Design */}
        <div className="bg-gradient-to-b from-black/80 via-black/60 to-black/40 backdrop-blur-md border-b border-white/5 shadow-[0_4px_16px_rgba(0,0,0,0.4)] p-4 sm:p-5 flex items-center justify-between pointer-events-auto pilot-top-bar">
          {/* Left - Primary Controls */}
          <div className="flex items-center gap-3 control-buttons">
            <Button
              id="tutorial-arm-button"
              variant={jetsonTelemetry?.armed ? "destructive" : "default"}
              className={`h-11 px-7 font-bold text-sm uppercase tracking-wider shadow-xl transition-all duration-200 border-2 pilot-control-button ${
                jetsonTelemetry?.armed 
                  ? "bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-800 hover:to-gray-900 text-white border-gray-600/50 shadow-[0_4px_20px_rgba(0,0,0,0.5)]" 
                  : "bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white border-gray-500/50 shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
              }`}
              disabled={!jetsonConnected || armCountdown !== null}
              onClick={() => {
                if (jetsonTelemetry?.armed) {
                  // Disarm immediately
                  jetsonApi.sendControl({ action: "DISARM" });
                  toast.success("Disarming drone...");
                } else {
                  // Start 5-second countdown before arming
                  setArmCountdown(5);
                }
              }}
            >
              {jetsonTelemetry?.armed ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-white mr-2 animate-pulse" />
                  Disarm
                </>
              ) : (
                <>
                  <div className="w-2 h-2 rounded-full bg-white mr-2" />
                  Arm
                </>
              )}
            </Button>
                  <Button
              variant="secondary"
              className="h-11 px-7 font-bold text-sm uppercase tracking-wider bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-900 hover:to-black text-white border-2 border-gray-700/50 shadow-xl pilot-control-button"
              disabled={!jetsonConnected}
              onClick={() => handleCommand("LAND")}
            >
              <X className="mr-2 h-4 w-4" />
              Stop
            </Button>
          </div>

          {/* Center - Status Badges */}
          <div className="flex items-center gap-3 status-badges">
            {mission && (
              <Badge variant="outline" className="text-gray-200/90 border-gray-600/40 bg-gray-800/30 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
                #{mission.id.slice(0, 8)}
              </Badge>
            )}
            <Badge 
              id="tutorial-connection-status"
              className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider shadow-lg border-2 ${
                jetsonConnected 
                  ? "bg-gradient-to-r from-gray-600 to-gray-700 text-white border-gray-500/50 shadow-[0_4px_16px_rgba(0,0,0,0.4)]" 
                  : "bg-gradient-to-r from-gray-800 to-gray-900 text-gray-400 border-gray-700/50 shadow-[0_4px_16px_rgba(0,0,0,0.5)] animate-pulse"
              }`}
            >
              <div className={`w-2 h-2 rounded-full mr-2 ${jetsonConnected ? 'bg-white' : 'bg-white animate-pulse'}`} />
              {jetsonConnected ? "Online" : "Offline"}
            </Badge>
            <Badge variant={manualMode ? "default" : "secondary"} className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider border-2 ${
              manualMode 
                ? "bg-gray-700/30 text-gray-200 border-gray-600/40" 
                : "bg-gray-800/50 text-gray-400 border-gray-700/40"
            }`}>
              {manualMode ? "Manual" : "Auto"}
            </Badge>
          </div>

          {/* Right - Secondary Controls */}
            <div className="flex items-center gap-2">
            <Button
              id="tutorial-ai-button"
              variant={aiEnabled ? "default" : "outline"}
              className={`h-10 px-4 font-semibold text-xs uppercase tracking-wider transition-all duration-200 ${
                aiEnabled 
                  ? "bg-gradient-to-r from-gray-600 to-gray-700 text-white border-2 border-gray-500/50 shadow-[0_4px_16px_rgba(0,0,0,0.4)]" 
                  : "bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 border-2 border-gray-700/50"
              }`}
              onClick={async () => {
                const newState = !aiEnabled;
                setAiEnabled(newState);
                await jetsonApi.toggleAI(newState);
                toast.success(newState ? "AI Detection Enabled" : "AI Detection Disabled");
              }}
            >
              <Eye className="mr-1.5 h-3.5 w-3.5" />
              AI
                  </Button>
                  <Button
              variant="outline"
              className="h-10 px-4 font-semibold text-xs uppercase tracking-wider bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 border-2 border-gray-700/50 transition-all duration-200"
              onClick={async () => {
                const newMode = viewMode === "normal" ? "heatmap" : "normal";
                setViewMode(newMode);
                await jetsonApi.toggleViewMode(newMode);
                toast.success(`View Mode: ${newMode}`);
              }}
            >
              <Video className="mr-1.5 h-3.5 w-3.5" />
              View
                  </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white/80 hover:text-white hover:bg-white/10 h-10 w-10 rounded-lg transition-all duration-200"
              onClick={handleExit}
            >
              <X className="h-5 w-5" />
            </Button>
        </div>
      </div>


        {/* Virtual Joysticks - Premium DJI-Style Design */}
        {/* Left Joystick - Throttle & Yaw */}
        <div id="tutorial-left-joystick" className="absolute bottom-16 left-6 sm:left-12 z-20 pointer-events-auto joystick-container">
          <div className="relative">
            {/* Outer glow effect */}
            <div className="absolute -inset-1 bg-primary/5 blur-xl rounded-full opacity-60" />
            {/* Main container */}
            <div className="relative bg-black/25 backdrop-blur-sm rounded-[2rem] border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.35)] p-5 sm:p-7 transition-all duration-300 hover:border-white/20">
              {/* Label */}
              <div className="flex items-center justify-center gap-2 mb-5">
                <div className="w-1.5 h-1.5 rounded-full bg-primary/60 shadow-[0_0_6px_rgba(197,233,255,0.5)]" />
                <p className="text-[11px] sm:text-xs font-bold text-white/90 text-center uppercase tracking-[0.2em]">Throttle & Yaw</p>
                <div className="w-1.5 h-1.5 rounded-full bg-primary/60 shadow-[0_0_6px_rgba(197,233,255,0.5)]" />
                </div>
              {/* Joystick zone */}
              <div 
                ref={leftJoystickRef}
                className="w-56 h-56 sm:w-72 sm:h-72 rounded-full relative mx-auto transition-all duration-200"
                style={{ 
                  touchAction: 'none',
                  background: `
                    radial-gradient(circle at 30% 30%, rgba(197,233,255,0.06) 0%, transparent 50%),
                    radial-gradient(circle at center, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 55%, transparent 75%)
                  `,
                  border: '1px solid rgba(255,255,255,0.25)',
                  boxShadow: `
                    inset 0 0 30px rgba(0,0,0,0.3),
                    inset 0 2px 6px rgba(255,255,255,0.08),
                    0 6px 20px rgba(0,0,0,0.35)
                  `,
                }}
              >
                {/* Precision crosshair */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-[1px] h-full bg-gradient-to-b from-transparent via-gray-500/20 to-transparent" />
                  <div className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-gray-500/20 to-transparent" />
                  </div>
                {/* Center dot */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-gray-400/40 shadow-[0_0_8px_rgba(156,163,175,0.3)]" />
                {/* Direction indicators */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 text-primary/60 text-xs font-bold">↑</div>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-primary/60 text-xs font-bold">↓</div>
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/60 text-xs font-bold">←</div>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-primary/60 text-xs font-bold">→</div>
                </div>
              </div>
              {/* Active indicator */}
              {manualMode && (
                <div className="mt-5 flex items-center justify-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary/80 shadow-[0_0_12px_rgba(197,233,255,0.6)] animate-pulse" />
                  <p className="text-[10px] text-primary/90 font-bold uppercase tracking-wider">Active</p>
                </div>
                )}
              </div>
          </div>
        </div>

        {/* Right Joystick - Pitch & Roll */}
        <div id="tutorial-right-joystick" className="absolute bottom-16 right-6 sm:right-12 z-20 pointer-events-auto joystick-container">
          <div className="relative">
            {/* Outer glow effect */}
            <div className="absolute -inset-1 bg-primary/5 blur-xl rounded-full opacity-60" />
            {/* Main container */}
            <div className="relative bg-black/25 backdrop-blur-sm rounded-[2rem] border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.35)] p-5 sm:p-7 transition-all duration-300 hover:border-white/20">
              {/* Label */}
              <div className="flex items-center justify-center gap-2 mb-5">
                <div className="w-1.5 h-1.5 rounded-full bg-primary/60 shadow-[0_0_6px_rgba(197,233,255,0.5)]" />
                <p className="text-[11px] sm:text-xs font-bold text-white/90 text-center uppercase tracking-[0.2em]">Pitch & Roll</p>
                <div className="w-1.5 h-1.5 rounded-full bg-primary/60 shadow-[0_0_6px_rgba(197,233,255,0.5)]" />
              </div>
              {/* Joystick zone */}
              <div 
                ref={rightJoystickRef}
                className="w-56 h-56 sm:w-72 sm:h-72 rounded-full relative mx-auto transition-all duration-200"
                style={{ 
                  touchAction: 'none',
                  background: `
                    radial-gradient(circle at 30% 30%, rgba(197,233,255,0.06) 0%, transparent 50%),
                    radial-gradient(circle at center, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 55%, transparent 75%)
                  `,
                  border: '1px solid rgba(255,255,255,0.25)',
                  boxShadow: `
                    inset 0 0 30px rgba(0,0,0,0.3),
                    inset 0 2px 6px rgba(255,255,255,0.08),
                    0 6px 20px rgba(0,0,0,0.35)
                  `,
                }}
              >
                {/* Precision crosshair */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-[1px] h-full bg-gradient-to-b from-transparent via-gray-500/20 to-transparent" />
                  <div className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-gray-500/20 to-transparent" />
                </div>
                {/* Center dot */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-gray-400/40 shadow-[0_0_8px_rgba(156,163,175,0.3)]" />
                {/* Direction indicators */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 text-primary/60 text-xs font-bold">↑</div>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-primary/60 text-xs font-bold">↓</div>
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/60 text-xs font-bold">←</div>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-primary/60 text-xs font-bold">→</div>
                </div>
              </div>
              {/* Active indicator */}
              {manualMode && (
                <div className="mt-5 flex items-center justify-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary/80 shadow-[0_0_12px_rgba(197,233,255,0.6)] animate-pulse" />
                  <p className="text-[10px] text-primary/90 font-bold uppercase tracking-wider">Active</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Manual Mode Toggle - Center Bottom - Professional DJI-Style Design */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20 pointer-events-auto">
          <div className="relative">
            <div className="absolute inset-0 bg-gray-500/10 blur-xl rounded-full" />
                  <Button
              id="tutorial-manual-mode"
              className={`relative h-12 px-10 font-bold text-sm uppercase tracking-wider shadow-2xl transition-all duration-300 manual-mode-button pilot-control-button ${
                manualMode 
                  ? "bg-gradient-to-r from-gray-200 to-gray-300 text-gray-900 hover:from-gray-300 hover:to-gray-200 shadow-[0_8px_32px_rgba(156,163,175,0.3)] border-2 border-gray-400/50" 
                  : "bg-gradient-to-r from-gray-700 to-gray-800 text-white hover:from-gray-800 hover:to-gray-700 shadow-[0_8px_32px_rgba(0,0,0,0.5)] border-2 border-gray-600/50"
              }`}
              disabled={!jetsonConnected}
              onClick={() => {
                setManualMode((prev) => !prev);
                toast.success(manualMode ? "Auto mode enabled" : "Manual control activated");
              }}
              >
              {manualMode ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-gray-400 mr-2 shadow-[0_0_8px_rgba(156,163,175,0.5)]" />
                  Manual Control
                </>
              ) : (
                <>
                  <div className="w-2 h-2 rounded-full bg-gray-500 mr-2" />
                  Auto Mode
                </>
              )}
                  </Button>
          </div>
        </div>

        {/* Bottom Panel Toggle Button - Map Button (The circular button you asked about) */}
        <div className="absolute bottom-8 right-8 z-20 pointer-events-auto">
                  <Button
            id="tutorial-map-button"
            variant="outline"
            size="icon"
            className={`h-12 w-12 rounded-full backdrop-blur-md border-2 transition-all duration-200 ${
              showBottomPanel
                ? "bg-gray-700/90 border-gray-500/50 hover:bg-gray-600/90 text-gray-200"
                : "bg-gray-900/90 border-gray-600/50 hover:bg-gray-800/90 text-gray-300"
            }`}
            onClick={() => setShowBottomPanel(!showBottomPanel)}
            title={showBottomPanel ? "Close Map" : "Open Map"}
              >
            <Map className="h-5 w-5" />
                  </Button>
        </div>

        {/* Map Panel - Positioned to not block controls */}
        {showBottomPanel && (
          <div className="absolute top-20 left-4 right-4 bottom-32 sm:bottom-40 bg-black/98 backdrop-blur-xl border border-gray-800/50 shadow-2xl pointer-events-auto z-30 rounded-2xl overflow-y-auto touch-pan-y map-panel-mobile map-panel-tablet" style={{ WebkitOverflowScrolling: 'touch' }}>
            <div className="min-h-full flex flex-col p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3 flex-shrink-0">
                <h2 className="text-lg font-bold text-gray-200 uppercase tracking-wider">Live Map</h2>
                  <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-300 hover:bg-gray-800/50 hover:text-white border border-gray-700/50 h-8 w-8"
                  onClick={() => setShowBottomPanel(false)}
              >
                  <X className="h-4 w-4" />
                  </Button>
                  </div>
              <div className="flex-1 min-h-[400px] rounded-lg overflow-hidden border border-gray-700/50" style={{ position: 'relative', height: '100%' }}>
                <LiveMap 
                  height="100%" 
                  showControls={false}
                  center={jetsonTelemetry?.lat && jetsonTelemetry?.lon ? [jetsonTelemetry.lat, jetsonTelemetry.lon] : undefined}
                  droneLocation={jetsonTelemetry?.lat && jetsonTelemetry?.lon ? { lat: jetsonTelemetry.lat, lon: jetsonTelemetry.lon } : undefined}
                />
                  </div>
                </div>
              </div>
        )}

        {/* Arm Countdown Overlay - Minimal */}
        {armCountdown !== null && (
          <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center">
            <div className="flex flex-col items-center gap-6 text-center">
              <div
                className={`text-[180px] sm:text-[220px] font-black leading-none ${
                  armCountdown <= 3 ? 'text-red-500 drop-shadow-[0_0_40px_rgba(239,68,68,0.8)] animate-pulse' : 'text-white'
                }`}
              >
                {armCountdown}
              </div>
              {armCountdown > 0 ? (
                <>
                  <p className="text-white/80 text-xl tracking-wide">Arming in {armCountdown}s</p>
                  <Button
                    variant="destructive"
                    size="lg"
                    onClick={cancelArmCountdown}
                    className="px-8 py-6 font-semibold"
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <p className="text-white/80 text-xl tracking-wide">Armed</p>
              )}
            </div>
          </div>
        )}

        {/* Interactive Highlight Overlay */}
        {showTutorial && !tutorialCancelled && highlightElement && highlightPosition && tutorialStep > 0 && tutorialStep < 5 && (
          <div className="fixed inset-0 z-[85] pointer-events-none">
            {/* Dark overlay with spotlight */}
            <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
              <defs>
                <mask id="highlight-mask">
                  <rect width="100%" height="100%" fill="black" />
                  <rect
                    x={highlightPosition.left}
                    y={highlightPosition.top}
                    width={highlightPosition.width}
                    height={highlightPosition.height}
                    fill="white"
                    rx="8"
                  />
                </mask>
              </defs>
              <rect width="100%" height="100%" fill="rgba(0,0,0,0.85)" mask="url(#highlight-mask)" />
            </svg>
            
            {/* Pulsing border around highlighted element */}
            <div
              className="absolute border-4 border-primary rounded-lg animate-pulse"
              style={{
                top: highlightPosition.top - 4,
                left: highlightPosition.left - 4,
                width: highlightPosition.width + 8,
                height: highlightPosition.height + 8,
                boxShadow: '0 0 30px rgba(197, 233, 255, 0.6), 0 0 60px rgba(197, 233, 255, 0.3)',
                pointerEvents: 'none',
              }}
            />
            
            {/* Arrow pointing to element */}
            {tutorialStep === 1 && (
              <div
                className="absolute text-primary"
                style={{
                  top: highlightPosition.top - 60,
                  left: highlightPosition.left + highlightPosition.width / 2 - 20,
                  transform: 'translateX(-50%)',
                }}
              >
                <div className="text-4xl animate-bounce">↓</div>
                <div className="text-sm font-bold text-white bg-primary/20 px-3 py-1 rounded mt-2 whitespace-nowrap">
                  Connection Status
                    </div>
              </div>
            )}
            {tutorialStep === 2 && (
              <div
                className="absolute text-primary"
                style={{
                  top: highlightPosition.top - 60,
                  left: highlightPosition.left + highlightPosition.width / 2 - 20,
                  transform: 'translateX(-50%)',
                }}
              >
                <div className="text-4xl animate-bounce">↓</div>
                <div className="text-sm font-bold text-white bg-red-500/20 px-3 py-1 rounded mt-2 whitespace-nowrap">
                  Arm Button
                    </div>
              </div>
            )}
            {tutorialStep === 3 && (
              <div
                className="absolute text-primary"
                style={{
                  top: highlightPosition.top - 60,
                  left: highlightPosition.left + highlightPosition.width / 2 - 20,
                  transform: 'translateX(-50%)',
                }}
              >
                <div className="text-4xl animate-bounce">↓</div>
                <div className="text-sm font-bold text-white bg-primary/20 px-3 py-1 rounded mt-2 whitespace-nowrap">
                  Manual Mode Toggle
                    </div>
              </div>
            )}
            {tutorialStep === 4 && (
              <div
                className="absolute text-primary"
                style={{
                  top: highlightPosition.top + highlightPosition.height + 20,
                  left: highlightPosition.left + highlightPosition.width / 2 - 20,
                  transform: 'translateX(-50%)',
                }}
              >
                <div className="text-4xl animate-bounce">↑</div>
                <div className="text-sm font-bold text-white bg-primary/20 px-3 py-1 rounded mt-2 whitespace-nowrap">
                  Video Feed
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tutorial Overlay - Game-like onboarding */}
        {showTutorial && !tutorialCancelled && (
          <div className="fixed inset-0 z-[90] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto">
            <Card className="max-w-2xl w-full glass-panel border-white/20 shadow-2xl pointer-events-auto">
              <CardContent className="p-8 space-y-6 pointer-events-auto">
                {tutorialStep === 0 && (
                  <div className="space-y-4 text-center">
                    <div className="text-6xl mb-4">🎮</div>
                    <h2 className="text-3xl font-bold text-white">Welcome to SkyLink Pilot Control</h2>
                    <p className="text-lg text-white/80">
                      Let's take a quick tour of the controls. This will only take a minute!
                    </p>
                    <div className="flex gap-4 justify-center pt-4">
              <Button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          localStorage.setItem('skylink_pilot_tutorial_completed', 'true');
                          setShowTutorial(false);
                          setTutorialCancelled(true);
                        }} 
                        variant="outline" 
                        className="text-white border-white/20 hover:bg-white/10 pointer-events-auto"
                        type="button"
                      >
                        Skip Tutorial
              </Button>
              <Button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setTutorialStep(1);
                        }} 
                        className="bg-primary text-background hover:bg-primary/90 pointer-events-auto"
                        type="button"
                      >
                        Start Tutorial
              </Button>
                    </div>
                  </div>
                )}

                {tutorialStep === 1 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                        <Radio className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="text-2xl font-bold text-white">Connection Status</h3>
                    </div>
                    <p className="text-white/80">
                      The top bar shows your connection to the Jetson drone. Make sure you see "Connected" before attempting to control the drone.
                    </p>
                    <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                      <p className="text-sm text-white/60">💡 Tip: Always verify connection before arming!</p>
                    </div>
                    <div className="flex gap-4 justify-end pt-4">
                      <Button onClick={() => setTutorialStep(0)} variant="outline" className="text-white border-white/20">
                        Back
              </Button>
                      <Button onClick={() => setTutorialStep(2)} className="bg-primary text-background">
                        Next
                      </Button>
                    </div>
                  </div>
                )}

                {tutorialStep === 2 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                        <AlertTriangle className="h-6 w-6 text-red-500" />
                  </div>
                      <h3 className="text-2xl font-bold text-white">Arming the Drone</h3>
                </div>
                    <p className="text-white/80">
                      When you click "Arm", there's a <strong className="text-white">5-second safety countdown</strong>. This gives you time to:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-white/70 ml-4">
                      <li>Verify the area is clear</li>
                      <li>Check all systems are ready</li>
                      <li>Cancel if needed</li>
                    </ul>
                    <div className="bg-red-500/10 border-l-4 border-red-500 p-4 rounded">
                      <p className="text-sm text-white/90 font-semibold">⚠️ Safety First: Always ensure the drone is on a flat surface and propellers are clear before arming!</p>
                  </div>
                    <div className="flex gap-4 justify-end pt-4">
                      <Button onClick={() => setTutorialStep(1)} variant="outline" className="text-white border-white/20">
                        Back
                      </Button>
                      <Button onClick={() => setTutorialStep(3)} className="bg-primary text-background">
                        Next
                      </Button>
                </div>
                  </div>
                )}

                {tutorialStep === 3 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                        <Activity className="h-6 w-6 text-primary" />
                </div>
                      <h3 className="text-2xl font-bold text-white">Manual Control Mode</h3>
              </div>
                    <p className="text-white/80">
                      Toggle "Manual Control" (highlighted below) to enable the virtual joysticks. In manual mode:
                    </p>
                    <div className="grid grid-cols-2 gap-4 my-4">
                      <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                        <p className="text-sm font-semibold text-white mb-2">Left Joystick</p>
                        <p className="text-xs text-white/70">↑ Throttle Up<br/>↓ Throttle Down<br/>← Yaw Left<br/>→ Yaw Right</p>
                      </div>
                      <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                        <p className="text-sm font-semibold text-white mb-2">Right Joystick</p>
                        <p className="text-xs text-white/70">↑ Pitch Forward<br/>↓ Pitch Back<br/>← Roll Left<br/>→ Roll Right</p>
                      </div>
                    </div>
                    <div className="bg-primary/10 border-l-4 border-primary p-4 rounded">
                      <p className="text-sm text-white/90">💡 The joysticks will appear at the bottom corners when manual mode is enabled</p>
                    </div>
                    <div className="flex gap-4 justify-end pt-4">
                      <Button onClick={() => setTutorialStep(2)} variant="outline" className="text-white border-white/20">
                        Back
                      </Button>
                      <Button onClick={() => setTutorialStep(4)} className="bg-primary text-background">
                        Next
                      </Button>
                    </div>
                  </div>
                )}

                {tutorialStep === 4 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                        <Video className="h-6 w-6 text-primary" />
              </div>
                      <h3 className="text-2xl font-bold text-white">Video Feed & Map</h3>
                  </div>
                    <p className="text-white/80">
                      Use the controls to:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-white/70 ml-4">
                      <li><strong className="text-white">Toggle AI Detection</strong> - Enable object detection overlay</li>
                      <li><strong className="text-white">View Mode</strong> - Switch between normal and heatmap view</li>
                      <li><strong className="text-white">Map Button</strong> - Open/close the live map panel</li>
                    </ul>
                    <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                      <p className="text-sm text-white/60">💡 The video feed shows the drone's camera view in real-time</p>
              </div>
                    <div className="flex gap-4 justify-end pt-4">
                      <Button onClick={() => setTutorialStep(3)} variant="outline" className="text-white border-white/20">
                        Back
                      </Button>
                      <Button onClick={() => setTutorialStep(5)} className="bg-primary text-background">
                        Next
                      </Button>
                    </div>
                  </div>
                )}

                {tutorialStep === 5 && (
                  <div className="space-y-4 text-center">
                    <div className="text-6xl mb-4">✅</div>
                    <h2 className="text-3xl font-bold text-white">You're All Set!</h2>
                    <p className="text-lg text-white/80">
                      You now know the basics of controlling the drone. Remember:
                    </p>
                    <div className="bg-primary/10 border-l-4 border-primary p-4 rounded text-left my-4">
                      <ul className="space-y-2 text-white/90">
                        <li>✓ Always check connection before arming</li>
                        <li>✓ Use the 5-second countdown to verify safety</li>
                        <li>✓ Enable manual mode to use joysticks</li>
                        <li>✓ Monitor telemetry and video feed</li>
                      </ul>
                    </div>
                    <div className="flex gap-4 justify-center pt-4">
              <Button
                        onClick={() => {
                          localStorage.setItem('skylink_pilot_tutorial_completed', 'true');
                          setShowTutorial(false);
                        }} 
                        className="bg-primary text-background px-8"
                      >
                        Start Flying! 🚁
              </Button>
                    </div>
                  </div>
                )}
            </CardContent>
          </Card>
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
                  Critical Warning
                </AlertDialogTitle>
                </div>
              <AlertDialogDescription asChild>
                <div className="text-base text-white/90 space-y-4">
                  <div className="bg-red-500/10 border-l-4 border-red-500 p-4 rounded">
                    <div className="font-semibold text-red-400 mb-2 text-lg">
                      Active Drone Control Session
                </div>
                    <div className="text-white/80 mb-3">
                      You are currently controlling a drone. Exiting now will:
                </div>
                    <ul className="list-disc list-inside space-y-1 text-white/70 text-sm ml-2">
                      <li>Disconnect from the Jetson server</li>
                      <li>Stop all control commands</li>
                      <li>Potentially interrupt an active mission</li>
                    </ul>
              </div>
                  
                  {missionStatus && !["delivered", "completed", "failed", "cancelled"].includes(missionStatus) && (
                    <div className="bg-amber-500/20 border border-amber-500/50 rounded-lg p-4">
                      <div className="font-semibold text-amber-400 mb-1">
                        Mission Status: <span className="uppercase">{missionStatus}</span>
        </div>
                      <div className="text-sm text-amber-300">
                        This mission is still active. Only exit if the mission is complete or in an emergency.
                </div>
              </div>
                  )}
                  
                  <div className="bg-black/50 rounded-lg p-4 border border-white/10">
                    <div className="font-bold text-white text-center text-lg mb-1">
                      Are you absolutely certain?
                    </div>
                    <div className="text-sm text-white/70 text-center">
                      This action cannot be undone. The drone will lose connection.
        </div>
                  </div>
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
    if (!jetsonConnected) {
      toast.error("Not connected to Jetson drone.");
      return;
    }
    setCommandType(type);
    // Send command to Jetson via WebSocket
    if (type === "LAND") {
      jetsonApi.sendControl({ action: "DISARM" });
      toast.success("Landing command sent");
    } else {
      // Other commands can be implemented in Python server if needed
      toast.info(`${type} command - Sending to Jetson`);
      jetsonApi.sendControl({ action: type as any });
    }
    setCommandType(null);
  }

  function sendManualControl(controls: { roll?: number; pitch?: number; yaw?: number; throttle?: number }) {
    // Send to Jetson via WebSocket
    jetsonApi.sendControl({
      l: { x: controls.yaw || 0, y: controls.throttle || 0 },
      r: { x: controls.roll || 0, y: controls.pitch || 0 },
    });
  }
}
