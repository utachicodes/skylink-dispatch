import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Navigation, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

// Fix default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface DeliveryLocationMapProps {
  onPickupChange: (location: { lat: number; lng: number; address?: string }) => void;
  onDropoffChange: (location: { lat: number; lng: number; address?: string }) => void;
  initialPickup?: { lat: number; lng: number };
  initialDropoff?: { lat: number; lng: number };
}

type MarkerType = "pickup" | "dropoff";

export function DeliveryLocationMap({
  onPickupChange,
  onDropoffChange,
  initialPickup,
  initialDropoff,
}: DeliveryLocationMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const pickupMarkerRef = useRef<L.Marker | null>(null);
  const dropoffMarkerRef = useRef<L.Marker | null>(null);
  const userLocationMarkerRef = useRef<L.Marker | null>(null);
  const [selectingMarker, setSelectingMarker] = useState<MarkerType | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Custom marker icons
  const createMarkerIcon = (type: MarkerType, isActive: boolean = false) => {
    const colors = {
      pickup: isActive ? "#10b981" : "#059669",
      dropoff: isActive ? "#ef4444" : "#dc2626",
    };
    
    return L.divIcon({
      className: "custom-marker",
      html: `
        <div style="
          position: relative;
          width: 40px;
          height: 40px;
        ">
          <div style="
            background: ${colors[type]};
            width: 40px;
            height: 40px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 3px solid white;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            ${isActive ? 'animation: pulse 2s infinite;' : ''}
          ">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white" style="transform: rotate(45deg);">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 40],
    });
  };

  const userLocationIcon = L.divIcon({
    className: "user-location-marker",
    html: `
      <div style="
        background: #3b82f6;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 4px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        animation: pulse 2s infinite;
      "></div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) {
      const map = L.map("delivery-location-map", {
        center: [14.7167, -17.4677], // Dakar, Senegal default
        zoom: 12,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Click handler for setting locations
      map.on("click", (e: L.LeafletMouseEvent) => {
        if (selectingMarker) {
          const { lat, lng } = e.latlng;
          
          // Reverse geocode to get address (simplified - in production use a geocoding API)
          const address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
          
          if (selectingMarker === "pickup") {
            if (pickupMarkerRef.current) {
              pickupMarkerRef.current.setLatLng([lat, lng]);
            } else {
              pickupMarkerRef.current = L.marker([lat, lng], {
                icon: createMarkerIcon("pickup"),
                draggable: true,
              })
                .addTo(map)
                .bindPopup(`<strong>Pickup Location</strong><br/>${address}`)
                .openPopup();

              // Update on drag
              pickupMarkerRef.current.on("dragend", () => {
                const pos = pickupMarkerRef.current!.getLatLng();
                onPickupChange({ lat: pos.lat, lng: pos.lng, address: `${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}` });
              });
            }
            onPickupChange({ lat, lng, address });
          } else if (selectingMarker === "dropoff") {
            if (dropoffMarkerRef.current) {
              dropoffMarkerRef.current.setLatLng([lat, lng]);
            } else {
              dropoffMarkerRef.current = L.marker([lat, lng], {
                icon: createMarkerIcon("dropoff"),
                draggable: true,
              })
                .addTo(map)
                .bindPopup(`<strong>Dropoff Location</strong><br/>${address}`)
                .openPopup();

              // Update on drag
              dropoffMarkerRef.current.on("dragend", () => {
                const pos = dropoffMarkerRef.current!.getLatLng();
                onDropoffChange({ lat: pos.lat, lng: pos.lng, address: `${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}` });
              });
            }
            onDropoffChange({ lat, lng, address });
          }
          
          setSelectingMarker(null);
        }
      });

      mapRef.current = map;
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update map cursor when selecting
  useEffect(() => {
    if (mapRef.current) {
      const container = mapRef.current.getContainer();
      if (selectingMarker) {
        container.style.cursor = "crosshair";
      } else {
        container.style.cursor = "";
      }
    }
  }, [selectingMarker]);

  // Get user's current location
  const getUserLocation = () => {
    setGettingLocation(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          setUserLocation({ lat, lng });
          
          // Add or update user location marker
          if (mapRef.current) {
            if (userLocationMarkerRef.current) {
              userLocationMarkerRef.current.setLatLng([lat, lng]);
            } else {
              userLocationMarkerRef.current = L.marker([lat, lng], {
                icon: userLocationIcon,
              })
                .addTo(mapRef.current)
                .bindPopup("<strong>Your Location</strong>")
                .openPopup();
            }
            
            mapRef.current.setView([lat, lng], 15);
          }
          
          setGettingLocation(false);
        },
        (error) => {
          console.error("Error getting location:", error);
          alert("Unable to get your location. Please enable location services.");
          setGettingLocation(false);
        }
      );
    } else {
      alert("Geolocation is not supported by your browser");
      setGettingLocation(false);
    }
  };

  // Set user location as pickup
  const setUserLocationAsPickup = () => {
    if (userLocation && mapRef.current) {
      if (pickupMarkerRef.current) {
        pickupMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
      } else {
        pickupMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], {
          icon: createMarkerIcon("pickup"),
          draggable: true,
        })
          .addTo(mapRef.current)
          .bindPopup(`<strong>Pickup Location</strong><br/>Your current location`)
          .openPopup();

        pickupMarkerRef.current.on("dragend", () => {
          const pos = pickupMarkerRef.current!.getLatLng();
          onPickupChange({ lat: pos.lat, lng: pos.lng, address: `${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}` });
        });
      }
      onPickupChange({
        lat: userLocation.lat,
        lng: userLocation.lng,
        address: "Your current location",
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Map Container */}
      <div className="relative rounded-lg overflow-hidden border-2 border-border">
        <div
          id="delivery-location-map"
          style={{ width: "100%", height: "450px" }}
        />
        
        {/* Floating Controls */}
        <div className="absolute top-4 left-4 z-[1000] space-y-2">
          <Button
            type="button"
            size="sm"
            onClick={getUserLocation}
            disabled={gettingLocation}
            className="bg-white text-black hover:bg-white/90 shadow-lg"
          >
            {gettingLocation ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Navigation className="h-4 w-4 mr-2" />
            )}
            {gettingLocation ? "Getting..." : "My Location"}
          </Button>
          
          {userLocation && (
            <Button
              type="button"
              size="sm"
              onClick={setUserLocationAsPickup}
              className="bg-green-600 text-white hover:bg-green-700 shadow-lg w-full"
            >
              <MapPin className="h-4 w-4 mr-2" />
              Set as Pickup
            </Button>
          )}
        </div>

        {/* Selection Mode Indicator */}
        {selectingMarker && (
          <div className="absolute top-4 right-4 z-[1000]">
            <Badge className="bg-black/80 text-white text-sm py-2 px-3 shadow-lg">
              <MapPin className="h-4 w-4 mr-2" />
              Click map to set {selectingMarker} location
            </Badge>
          </div>
        )}
      </div>

      {/* Location Selection Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <Button
          type="button"
          variant={selectingMarker === "pickup" ? "default" : "outline"}
          onClick={() => setSelectingMarker(selectingMarker === "pickup" ? null : "pickup")}
          className="w-full"
        >
          <MapPin className="h-4 w-4 mr-2 text-green-500" />
          {selectingMarker === "pickup" ? "Selecting Pickup..." : "Set Pickup"}
        </Button>
        
        <Button
          type="button"
          variant={selectingMarker === "dropoff" ? "default" : "outline"}
          onClick={() => setSelectingMarker(selectingMarker === "dropoff" ? null : "dropoff")}
          className="w-full"
        >
          <MapPin className="h-4 w-4 mr-2 text-red-500" />
          {selectingMarker === "dropoff" ? "Selecting Dropoff..." : "Set Dropoff"}
        </Button>
      </div>

      {/* Instructions */}
      <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
        <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
        <p>
          Click "Set Pickup" or "Set Dropoff" buttons, then click on the map to place markers.
          You can also drag markers to adjust locations. Green marker = Pickup, Red marker = Dropoff.
        </p>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.8;
          }
        }
      `}</style>
    </div>
  );
}

