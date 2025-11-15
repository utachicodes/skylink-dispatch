import { useState } from "react";
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

export default function PilotControl() {
  const navigate = useNavigate();
  const [battery, setBattery] = useState(85);

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
            <h1 className="text-xl font-bold">Pilot Control Room</h1>
            <Badge className="bg-green-500">Connected</Badge>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Battery className="h-4 w-4 text-green-500" />
              <span className="text-sm font-mono">{battery}%</span>
            </div>
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-primary" />
              <span className="text-sm">GPS: Strong</span>
            </div>
            <Badge variant="secondary">AUTO MODE</Badge>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4 p-4 max-w-7xl mx-auto">
        {/* Left Panel - Camera Feed */}
        <div className="md:col-span-2 space-y-4">
          <Card className="bg-gray-900 border-primary/20">
            <CardContent className="p-0">
              <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-20">
                  {[...Array(9)].map((_, i) => (
                    <div key={i} className="border border-primary/30"></div>
                  ))}
                </div>
                <div className="text-center z-10">
                  <Video className="h-16 w-16 mx-auto mb-3 text-primary/50" />
                  <p className="text-muted-foreground">Live Camera Feed</p>
                  <p className="text-sm text-muted-foreground/60">Simulated view</p>
                </div>
                {/* HUD Overlays */}
                <div className="absolute top-4 left-4 space-y-1 text-xs font-mono">
                  <div className="bg-black/50 px-2 py-1 rounded">ALT: 120m</div>
                  <div className="bg-black/50 px-2 py-1 rounded">SPD: 15 m/s</div>
                  <div className="bg-black/50 px-2 py-1 rounded">HDG: 045°</div>
                </div>
                <div className="absolute top-4 right-4">
                  <div className="bg-red-500/80 px-3 py-1 rounded text-xs font-bold animate-pulse">
                    REC
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Virtual Joysticks */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-gray-900 border-primary/20">
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-3 text-center">Altitude & Yaw</h3>
                <div className="relative w-full aspect-square max-w-[200px] mx-auto">
                  <div className="absolute inset-0 border-2 border-primary/30 rounded-full"></div>
                  <div className="absolute inset-4 border border-primary/20 rounded-full"></div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-0 left-1/2 -translate-x-1/2 text-white hover:bg-primary/20"
                  >
                    <ArrowUp className="h-6 w-6" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 text-white hover:bg-primary/20"
                  >
                    <ArrowDown className="h-6 w-6" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-0 top-1/2 -translate-y-1/2 text-white hover:bg-primary/20"
                  >
                    <RotateCcw className="h-6 w-6" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-1/2 -translate-y-1/2 text-white hover:bg-primary/20"
                  >
                    <RotateCcw className="h-6 w-6 scale-x-[-1]" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-primary/20">
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-3 text-center">Direction</h3>
                <div className="relative w-full aspect-square max-w-[200px] mx-auto">
                  <div className="absolute inset-0 border-2 border-accent/30 rounded-full"></div>
                  <div className="absolute inset-4 border border-accent/20 rounded-full"></div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-0 left-1/2 -translate-x-1/2 text-white hover:bg-accent/20"
                  >
                    <ArrowUp className="h-6 w-6" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 text-white hover:bg-accent/20"
                  >
                    <ArrowDown className="h-6 w-6" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-0 top-1/2 -translate-y-1/2 text-white hover:bg-accent/20"
                  >
                    <ArrowLeft className="h-6 w-6" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-1/2 -translate-y-1/2 text-white hover:bg-accent/20"
                  >
                    <ArrowRight className="h-6 w-6" />
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
              <Button variant="destructive" className="w-full">
                <X className="mr-2 h-4 w-4" />
                Emergency Brake
              </Button>
              <Button className="w-full bg-amber-600 hover:bg-amber-700">
                <Home className="mr-2 h-4 w-4" />
                Return to Home
              </Button>
              <Button className="w-full bg-green-600 hover:bg-green-700">
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
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3">Flight Stats</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Flight Time:</span>
                  <span className="font-mono">12:34</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Distance:</span>
                  <span className="font-mono">2.4 km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Max Speed:</span>
                  <span className="font-mono">18 m/s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Packets Lost:</span>
                  <span className="font-mono text-green-500">0</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
