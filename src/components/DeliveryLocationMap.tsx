import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Navigation, Loader2, Route, X } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";

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
  const routeLineRef = useRef<L.Polyline | null>(null);
  const [selectingMarker, setSelectingMarker] = useState<MarkerType | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [pickupSet, setPickupSet] = useState(false);
  const [dropoffSet, setDropoffSet] = useState(false);

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Draw route line between markers
  const drawRouteLine = () => {
    if (pickupMarkerRef.current && dropoffMarkerRef.current && mapRef.current) {
      const pickupPos = pickupMarkerRef.current.getLatLng();
      const dropoffPos = dropoffMarkerRef.current.getLatLng();
      
      // Remove old line
      if (routeLineRef.current) {
        routeLineRef.current.remove();
      }
      
      // Draw new line with animation
      routeLineRef.current = L.polyline(
        [pickupPos, dropoffPos],
        {
          color: '#3b82f6',
          weight: 4,
          opacity: 0.7,
          dashArray: '10, 10',
          className: 'route-line-animated'
        }
      ).addTo(mapRef.current);
      
      // Calculate and set distance
      const dist = calculateDistance(pickupPos.lat, pickupPos.lng, dropoffPos.lat, dropoffPos.lng);
      setDistance(dist);
      
      // Fit bounds to show both markers
      const bounds = L.latLngBounds([pickupPos, dropoffPos]);
      mapRef.current.fitBounds(bounds, { padding: [80, 80] });
    }
  };

  // Custom marker icons with better design
  const createMarkerIcon = (type: MarkerType, isActive: boolean = false) => {
    const colors = {
      pickup: { main: '#10b981', shadow: 'rgba(16, 185, 129, 0.3)' },
      dropoff: { main: '#ef4444', shadow: 'rgba(239, 68, 68, 0.3)' },
    };
    
    return L.divIcon({
      className: "custom-marker",
      html: `
        <div style="
          position: relative;
          width: 48px;
          height: 48px;
          filter: drop-shadow(0 10px 20px ${colors[type].shadow});
        ">
          <div style="
            background: linear-gradient(135deg, ${colors[type].main} 0%, ${colors[type].main}dd 100%);
            width: 48px;
            height: 48px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 4px solid white;
            display: flex;
            align-items: center;
            justify-content: center;
            ${isActive ? 'animation: bounce 1s infinite;' : ''}
            transition: all 0.3s ease;
          ">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white" style="transform: rotate(45deg);">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </div>
        </div>
      `,
      iconSize: [48, 48],
      iconAnchor: [24, 48],
    });
  };

  const userLocationIcon = L.divIcon({
    className: "user-location-marker",
    html: `
      <div style="position: relative;">
        <div style="
          background: #3b82f6;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 4px solid white;
          box-shadow: 0 0 0 8px rgba(59, 130, 246, 0.2);
          animation: ripple 2s infinite;
        "></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
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
                drawRouteLine();
              });
            }
            onPickupChange({ lat, lng, address });
            setPickupSet(true);
            setTimeout(drawRouteLine, 100);
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
                drawRouteLine();
              });
            }
            onDropoffChange({ lat, lng, address });
            setDropoffSet(true);
            setTimeout(drawRouteLine, 100);
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
          drawRouteLine();
        });
      }
      onPickupChange({
        lat: userLocation.lat,
        lng: userLocation.lng,
        address: "Your current location",
      });
      setPickupSet(true);
      setTimeout(drawRouteLine, 100);
    }
  };

  // Clear pickup marker
  const clearPickup = () => {
    if (pickupMarkerRef.current) {
      pickupMarkerRef.current.remove();
      pickupMarkerRef.current = null;
    }
    if (routeLineRef.current) {
      routeLineRef.current.remove();
      routeLineRef.current = null;
    }
    setPickupSet(false);
    setDistance(null);
    onPickupChange({ lat: 14.7167, lng: -17.4677 });
  };

  // Clear dropoff marker
  const clearDropoff = () => {
    if (dropoffMarkerRef.current) {
      dropoffMarkerRef.current.remove();
      dropoffMarkerRef.current = null;
    }
    if (routeLineRef.current) {
      routeLineRef.current.remove();
      routeLineRef.current = null;
    }
    setDropoffSet(false);
    setDistance(null);
    onDropoffChange({ lat: 14.7167, lng: -17.4677 });
  };

  return (
    <div className="space-y-4">
      {/* Map Container */}
      <div className="relative rounded-xl overflow-hidden border-2 border-border shadow-2xl">
        <div
          id="delivery-location-map"
          style={{ width: "100%", height: "500px" }}
          className="transition-all duration-300"
        />
        
        {/* Floating Controls - Top Left */}
        <div className="absolute top-4 left-4 z-[1000] space-y-2">
          <Card className="bg-white/95 backdrop-blur-sm p-2 shadow-xl border-0">
            <Button
              type="button"
              size="sm"
              onClick={getUserLocation}
              disabled={gettingLocation}
              className="bg-blue-600 text-white hover:bg-blue-700 w-full"
            >
              {gettingLocation ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Navigation className="h-4 w-4 mr-2" />
              )}
              {gettingLocation ? "Locating..." : "My Location"}
            </Button>
            
            {userLocation && !pickupSet && (
              <Button
                type="button"
                size="sm"
                onClick={setUserLocationAsPickup}
                className="bg-green-600 text-white hover:bg-green-700 w-full mt-2"
              >
                <MapPin className="h-4 w-4 mr-2" />
                Use as Pickup
              </Button>
            )}
          </Card>
        </div>

        {/* Distance Info - Top Right */}
        {distance !== null && (
          <div className="absolute top-4 right-4 z-[1000]">
            <Card className="bg-white/95 backdrop-blur-sm px-4 py-3 shadow-xl border-0">
              <div className="flex items-center gap-2">
                <Route className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="text-xs text-muted-foreground">Distance</div>
                  <div className="text-lg font-bold text-blue-600">
                    {distance.toFixed(2)} km
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ~{Math.ceil(distance * 2)} min by drone
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Selection Mode Indicator - Top Center */}
        {selectingMarker && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000]">
            <Card className="bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-2 shadow-xl border-0">
              <div className="flex items-center gap-2 text-white">
                <MapPin className="h-5 w-5 animate-bounce" />
                <span className="font-semibold">
                  Click map to set {selectingMarker} location
                </span>
              </div>
            </Card>
          </div>
        )}

        {/* Location Status - Bottom Left */}
        {(pickupSet || dropoffSet) && (
          <div className="absolute bottom-4 left-4 z-[1000] space-y-2">
            {pickupSet && (
              <Card className="bg-green-600 text-white px-3 py-2 shadow-xl border-0 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span className="text-sm font-medium">Pickup Set</span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={clearPickup}
                  className="h-5 w-5 p-0 ml-2 hover:bg-white/20"
                >
                  <X className="h-3 w-3" />
                </Button>
              </Card>
            )}
            {dropoffSet && (
              <Card className="bg-red-600 text-white px-3 py-2 shadow-xl border-0 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span className="text-sm font-medium">Dropoff Set</span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={clearDropoff}
                  className="h-5 w-5 p-0 ml-2 hover:bg-white/20"
                >
                  <X className="h-3 w-3" />
                </Button>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Location Selection Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <Button
          type="button"
          variant={selectingMarker === "pickup" ? "default" : "outline"}
          onClick={() => setSelectingMarker(selectingMarker === "pickup" ? null : "pickup")}
          className={`w-full h-14 text-base font-semibold transition-all ${
            selectingMarker === "pickup" 
              ? "bg-green-600 hover:bg-green-700 text-white shadow-lg scale-105" 
              : pickupSet
              ? "border-green-600 text-green-600 bg-green-50"
              : ""
          }`}
          disabled={pickupSet && selectingMarker !== "pickup"}
        >
          <MapPin className={`h-5 w-5 mr-2 ${selectingMarker === "pickup" ? "animate-bounce" : ""}`} />
          {selectingMarker === "pickup" ? "Click Map Now" : pickupSet ? "✓ Pickup Set" : "Set Pickup Location"}
        </Button>
        
        <Button
          type="button"
          variant={selectingMarker === "dropoff" ? "default" : "outline"}
          onClick={() => setSelectingMarker(selectingMarker === "dropoff" ? null : "dropoff")}
          className={`w-full h-14 text-base font-semibold transition-all ${
            selectingMarker === "dropoff" 
              ? "bg-red-600 hover:bg-red-700 text-white shadow-lg scale-105" 
              : dropoffSet
              ? "border-red-600 text-red-600 bg-red-50"
              : ""
          }`}
          disabled={dropoffSet && selectingMarker !== "dropoff"}
        >
          <MapPin className={`h-5 w-5 mr-2 ${selectingMarker === "dropoff" ? "animate-bounce" : ""}`} />
          {selectingMarker === "dropoff" ? "Click Map Now" : dropoffSet ? "✓ Dropoff Set" : "Set Dropoff Location"}
        </Button>
      </div>

      {/* Enhanced Instructions */}
      <div className="grid md:grid-cols-3 gap-3">
        <div className="flex items-start gap-3 p-4 bg-card border border-border rounded-xl hover:border-primary/50 transition-colors">
          <div className="bg-primary/10 p-2 rounded-lg shrink-0">
            <MapPin className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-1">1. Select Location Type</h4>
            <p className="text-xs text-muted-foreground">
              Click "Set Pickup" or "Set Dropoff" button
            </p>
          </div>
        </div>
        
        <div className="flex items-start gap-3 p-4 bg-card border border-border rounded-xl hover:border-primary/50 transition-colors">
          <div className="bg-green-500/10 p-2 rounded-lg shrink-0">
            <Navigation className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-1">2. Click on Map</h4>
            <p className="text-xs text-muted-foreground">
              Place marker at desired location
            </p>
          </div>
        </div>
        
        <div className="flex items-start gap-3 p-4 bg-card border border-border rounded-xl hover:border-primary/50 transition-colors">
          <div className="bg-purple-500/10 p-2 rounded-lg shrink-0">
            <Route className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-1">3. Adjust if Needed</h4>
            <p className="text-xs text-muted-foreground">
              Drag markers to fine-tune positions
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% {
            transform: translateY(0) rotate(-45deg);
          }
          50% {
            transform: translateY(-10px) rotate(-45deg);
          }
        }
        
        @keyframes ripple {
          0% {
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4);
          }
          100% {
            box-shadow: 0 0 0 20px rgba(59, 130, 246, 0);
          }
        }
        
        .route-line-animated {
          animation: dash 20s linear infinite;
        }
        
        @keyframes dash {
          to {
            stroke-dashoffset: -1000;
          }
        }
        
        .leaflet-container {
          font-family: inherit;
        }
        
        .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        }
        
        .leaflet-popup-tip {
          box-shadow: 0 3px 14px rgba(0,0,0,0.2);
        }
      `}</style>
    </div>
  );
}

