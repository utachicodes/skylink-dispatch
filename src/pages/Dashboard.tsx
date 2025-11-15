import { useAuth } from "@/contexts/AuthContext";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, MapPin, Clock, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <header className="bg-sky-gradient text-white p-6 shadow-lg">
        <h1 className="text-2xl font-bold">Welcome back!</h1>
        <p className="text-white/90 mt-1">Ready for your next delivery?</p>
      </header>

      <main className="p-4 space-y-6 max-w-4xl mx-auto">
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Quick Actions
            </CardTitle>
            <CardDescription>Start a new delivery request</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full bg-sky-gradient hover:opacity-90"
              size="lg"
              onClick={() => navigate("/create-delivery")}
            >
              Request Drone Delivery
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/track")}>
            <CardHeader>
              <MapPin className="h-8 w-8 text-primary mb-2" />
              <CardTitle className="text-lg">Track Delivery</CardTitle>
              <CardDescription>Real-time GPS tracking</CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/history")}>
            <CardHeader>
              <Clock className="h-8 w-8 text-primary mb-2" />
              <CardTitle className="text-lg">History</CardTitle>
              <CardDescription>Past deliveries</CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/profile")}>
            <CardHeader>
              <Package className="h-8 w-8 text-primary mb-2" />
              <CardTitle className="text-lg">Active Orders</CardTitle>
              <CardDescription>0 in progress</CardDescription>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>How it works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">1</div>
              <div>
                <h3 className="font-semibold">Create Request</h3>
                <p className="text-sm text-muted-foreground">Enter pickup and delivery locations</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">2</div>
              <div>
                <h3 className="font-semibold">Operator Confirms</h3>
                <p className="text-sm text-muted-foreground">Wait for an available drone operator</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">3</div>
              <div>
                <h3 className="font-semibold">Track Live</h3>
                <p className="text-sm text-muted-foreground">Monitor your delivery in real-time</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
}
