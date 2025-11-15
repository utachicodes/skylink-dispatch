import { BottomNav } from "@/components/BottomNav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, MapPin, Calendar } from "lucide-react";

export default function History() {
  const mockDeliveries = [
    {
      id: 1,
      status: "delivered",
      pickup: "123 Main St",
      dropoff: "456 Oak Ave",
      date: "2024-11-14",
      time: "2:30 PM",
    },
    {
      id: 2,
      status: "delivered",
      pickup: "789 Pine Rd",
      dropoff: "321 Elm St",
      date: "2024-11-13",
      time: "11:15 AM",
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <header className="bg-sky-gradient text-white p-6 shadow-lg">
        <h1 className="text-2xl font-bold">Delivery History</h1>
        <p className="text-white/90 mt-1">Your past deliveries</p>
      </header>

      <main className="p-4 space-y-4 max-w-4xl mx-auto">
        {mockDeliveries.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No deliveries yet</p>
            </CardContent>
          </Card>
        ) : (
          mockDeliveries.map((delivery) => (
            <Card key={delivery.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    <span className="font-semibold">Delivery #{delivery.id}</span>
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    {delivery.status}
                  </Badge>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">From: {delivery.pickup}</p>
                      <p className="text-muted-foreground">To: {delivery.dropoff}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {delivery.date} at {delivery.time}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </main>

      <BottomNav />
    </div>
  );
}
