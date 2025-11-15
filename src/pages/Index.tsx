import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Plane, MapPin, Zap, Shield } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-sky-gradient opacity-10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center space-y-8 animate-fade-in">
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-sky-gradient rounded-3xl flex items-center justify-center animate-pulse-glow">
                <Plane className="h-10 w-10 text-white" />
              </div>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
              Welcome to <span className="bg-clip-text text-transparent bg-sky-gradient">SkyLink</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
              The future of delivery is here. Fast, reliable drone deliveries at your fingertips.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
              <Button
                size="lg"
                className="bg-sky-gradient hover:opacity-90 text-lg px-8 py-6"
                onClick={() => navigate("/auth")}
              >
                Get Started
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 py-6"
                onClick={() => navigate("/auth")}
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
            Why Choose SkyLink?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center space-y-4 p-6 rounded-2xl bg-background hover:shadow-lg transition-shadow animate-slide-up">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
                <Zap className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-semibold">Lightning Fast</h3>
              <p className="text-muted-foreground">
                Deliveries in minutes, not hours. Our drones fly directly to your destination.
              </p>
            </div>

            <div className="text-center space-y-4 p-6 rounded-2xl bg-background hover:shadow-lg transition-shadow animate-slide-up" style={{ animationDelay: "0.1s" }}>
              <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto">
                <MapPin className="h-8 w-8 text-accent" />
              </div>
              <h3 className="text-2xl font-semibold">Real-Time Tracking</h3>
              <p className="text-muted-foreground">
                Watch your package every step of the way with live GPS tracking and updates.
              </p>
            </div>

            <div className="text-center space-y-4 p-6 rounded-2xl bg-background hover:shadow-lg transition-shadow animate-slide-up" style={{ animationDelay: "0.2s" }}>
              <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto">
                <Shield className="h-8 w-8 text-green-500" />
              </div>
              <h3 className="text-2xl font-semibold">Secure & Safe</h3>
              <p className="text-muted-foreground">
                Advanced AI systems and professional operators ensure your delivery is safe.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <h2 className="text-3xl md:text-5xl font-bold">
            Ready to experience the future?
          </h2>
          <p className="text-xl text-muted-foreground">
            Join thousands of users already using SkyLink for their deliveries.
          </p>
          <Button
            size="lg"
            className="bg-sky-gradient hover:opacity-90 text-lg px-12 py-6"
            onClick={() => navigate("/auth")}
          >
            Create Your Account
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Index;
