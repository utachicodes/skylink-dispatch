import { BottomNav } from "@/components/BottomNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, MapPin, Clock, Check, X } from "lucide-react";

export default function OperatorDashboard() {
  const mockRequests = [
    {
      id: 1,
      pickup: "123 Main St",
      dropoff: "456 Oak Ave",
      distance: "3.2 km",
      weight: "2.5 kg",
      time: "5 min ago",
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <header className="bg-sky-gradient text-white p-6 shadow-lg">
        <h1 className="text-2xl font-bold">Operator Dashboard</h1>
        <p className="text-white/90 mt-1">Incoming delivery requests</p>
      </header>

      <main className="p-4 space-y-6 max-w-4xl mx-auto">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">0</p>
                <p className="text-sm text-muted-foreground">Active Jobs</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-accent">12</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-500">95%</p>
                <p className="text-sm text-muted-foreground">Success Rate</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pending Requests</CardTitle>
            <CardDescription>New delivery requests waiting for your response</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {mockRequests.map((request) => (
              <div key={request.id} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    <span className="font-semibold">Request #{request.id}</span>
                  </div>
                  <Badge variant="secondary">{request.time}</Badge>
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
                    <span>Distance: {request.distance}</span>
                    <span>Weight: {request.weight}</span>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button className="flex-1 bg-sky-gradient hover:opacity-90">
                    <Check className="mr-2 h-4 w-4" />
                    Accept
                  </Button>
                  <Button variant="destructive" className="flex-1">
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
