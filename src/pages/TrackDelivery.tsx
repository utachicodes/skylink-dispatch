import { BottomNav } from "@/components/BottomNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Battery, Radio, Eye } from "lucide-react";

export default function TrackDelivery() {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <header className="bg-sky-gradient text-white p-6 shadow-lg">
        <h1 className="text-2xl font-bold">Live Tracking</h1>
        <p className="text-white/90 mt-1">Monitor your delivery in real-time</p>
      </header>

      <main className="p-4 space-y-6 max-w-4xl mx-auto">
        <Card className="h-96 bg-muted/30">
          <CardContent className="p-0 h-full flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto mb-3 text-primary" />
              <p className="font-medium">Map Integration</p>
              <p className="text-sm">Real-time GPS tracking will appear here</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Delivery Status</CardTitle>
              <Badge className="bg-primary">In Flight</Badge>
            </div>
            <CardDescription>Estimated arrival: 15 minutes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <div className="flex-1">
                  <p className="font-medium">Confirmed</p>
                  <p className="text-sm text-muted-foreground">Operator accepted</p>
                </div>
                <span className="text-xs text-muted-foreground">10:30 AM</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                <div className="flex-1">
                  <p className="font-medium">In Flight</p>
                  <p className="text-sm text-muted-foreground">En route to destination</p>
                </div>
                <span className="text-xs text-muted-foreground">10:35 AM</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-2 h-2 bg-muted rounded-full"></div>
                <div className="flex-1">
                  <p className="font-medium text-muted-foreground">Arrived</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-2 h-2 bg-muted rounded-full"></div>
                <div className="flex-1">
                  <p className="font-medium text-muted-foreground">Delivered</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Drone Status</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <Battery className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-bold">85%</p>
              <p className="text-xs text-muted-foreground">Battery</p>
            </div>
            <div className="text-center">
              <Radio className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">Strong</p>
              <p className="text-xs text-muted-foreground">GPS Signal</p>
            </div>
            <div className="text-center">
              <Eye className="h-8 w-8 mx-auto mb-2 text-accent" />
              <p className="text-2xl font-bold">Auto</p>
              <p className="text-xs text-muted-foreground">Mode</p>
            </div>
          </CardContent>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
}
