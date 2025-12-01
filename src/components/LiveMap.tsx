import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useTelemetry } from "@/hooks/useTelemetry";
import { Plane, Battery, Radio } from "lucide-react";

// Fix default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface LiveMapProps {
  className?: string;
  height?: string;
  showControls?: boolean;
  center?: [number, number];
  zoom?: number;
  droneLocation?: { lat: number; lon: number };
}

export function LiveMap({ className = "", height = "400px", showControls = true, center, zoom = 13, droneLocation }: LiveMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const droneMarkerRef = useRef<L.Marker | null>(null);
  const { frames } = useTelemetry();
  
  // Log when component mounts/updates
  useEffect(() => {
    console.log("[LiveMap] Component rendered with:", { height, center, droneLocation, showControls });
  }, [height, center, droneLocation, showControls]);

  useEffect(() => {
    // Wait a bit to ensure the DOM element exists
    const initMap = () => {
      const mapElement = document.getElementById("live-map");
      if (!mapElement) {
        console.warn("[LiveMap] Map element not found, retrying...");
        setTimeout(initMap, 100);
        return;
      }

      // Check if element has dimensions
      const rect = mapElement.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        console.warn("[LiveMap] Map element has no dimensions, retrying...", rect);
        setTimeout(initMap, 200);
        return;
      }

      if (!mapRef.current) {
        const initialCenter = center || (droneLocation ? [droneLocation.lat, droneLocation.lon] : [14.7167, -17.4677]); // Dakar default
        console.log("[LiveMap] Initializing map with center:", initialCenter, "Element size:", rect);
        
        try {
          const map = L.map("live-map", {
            center: initialCenter,
            zoom: zoom,
            zoomControl: true,
          });

          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19,
          }).addTo(map);

          // Force map to invalidate size after a short delay to ensure proper rendering
          setTimeout(() => {
            map.invalidateSize();
            console.log("[LiveMap] Map size invalidated");
          }, 200);

          mapRef.current = map;
          console.log("[LiveMap] Map initialized successfully");
        } catch (error) {
          console.error("[LiveMap] Error initializing map:", error);
        }
      } else {
        // Update center if map already exists and center prop or droneLocation changes
        const newCenter = center || (droneLocation ? [droneLocation.lat, droneLocation.lon] : undefined);
        if (newCenter) {
          mapRef.current.setView(newCenter, zoom);
          setTimeout(() => {
            mapRef.current?.invalidateSize();
          }, 100);
        }
      }
    };

    // Small delay to ensure DOM is ready
    const timeout = setTimeout(initMap, 50);

    return () => {
      clearTimeout(timeout);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [center, zoom, droneLocation]);

  useEffect(() => {
    if (!mapRef.current) return;

    frames.forEach((frame) => {
      const key = frame.droneId;
      const position: [number, number] = [frame.latitude, frame.longitude];

      if (!markersRef.current.has(key)) {
        // Create custom icon - Neutral gray professional style
        const batteryColor = frame.battery > 50 ? "#9ca3af" : frame.battery > 20 ? "#6b7280" : "#4b5563"; // Neutral grays
        const icon = L.divIcon({
          className: "drone-marker",
          html: `
            <div style="
              background: ${batteryColor};
              width: 32px;
              height: 32px;
              border-radius: 50%;
              border: 3px solid #1f2937;
              box-shadow: 0 2px 8px rgba(0,0,0,0.5);
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#e5e7eb">
                <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
              </svg>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const marker = L.marker(position, { icon }).addTo(mapRef.current!);
        
        const popup = L.popup({ maxWidth: 250 }).setContent(`
          <div style="padding: 8px;">
            <h3 style="margin: 0 0 8px 0; font-weight: bold;">${frame.droneId}</h3>
            <div style="font-size: 12px; line-height: 1.6;">
              <div><strong>Battery:</strong> ${frame.battery}%</div>
              <div><strong>Altitude:</strong> ${frame.altitude.toFixed(0)}m</div>
              <div><strong>Speed:</strong> ${frame.speed.toFixed(1)} m/s</div>
              <div><strong>Heading:</strong> ${frame.heading.toFixed(0)}°</div>
              <div><strong>Signal:</strong> ${frame.signalQuality}%</div>
              <div><strong>Status:</strong> ${frame.status || "active"}</div>
            </div>
          </div>
        `);

        marker.bindPopup(popup);
        markersRef.current.set(key, marker);
      } else {
        const marker = markersRef.current.get(key);
        if (marker) {
          marker.setLatLng(position);
          marker.setPopupContent(`
            <div style="padding: 8px;">
              <h3 style="margin: 0 0 8px 0; font-weight: bold;">${frame.droneId}</h3>
              <div style="font-size: 12px; line-height: 1.6;">
                <div><strong>Battery:</strong> ${frame.battery}%</div>
                <div><strong>Altitude:</strong> ${frame.altitude.toFixed(0)}m</div>
                <div><strong>Speed:</strong> ${frame.speed.toFixed(1)} m/s</div>
                <div><strong>Heading:</strong> ${frame.heading.toFixed(0)}°</div>
                <div><strong>Signal:</strong> ${frame.signalQuality}%</div>
                <div><strong>Status:</strong> ${frame.status || "active"}</div>
              </div>
            </div>
          `);
        }
      }
    });

    // Remove markers for drones no longer in frames
    const currentIds = new Set(frames.map((f) => f.droneId));
    markersRef.current.forEach((marker, key) => {
      if (!currentIds.has(key)) {
        marker.remove();
        markersRef.current.delete(key);
      }
    });
  }, [frames]);

  // Handle real-time drone location from Jetson
  useEffect(() => {
    if (!mapRef.current || !droneLocation) return;

    const position: [number, number] = [droneLocation.lat, droneLocation.lon];

    if (!droneMarkerRef.current) {
      // Create custom icon for current drone
      const icon = L.divIcon({
        className: "current-drone-marker",
        html: `
          <div style="
            background: #9ca3af;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border: 4px solid #1f2937;
            box-shadow: 0 4px 12px rgba(0,0,0,0.6);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#e5e7eb">
              <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
            </svg>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      const marker = L.marker(position, { icon }).addTo(mapRef.current);
      marker.bindPopup(`
        <div style="padding: 8px;">
          <h3 style="margin: 0 0 8px 0; font-weight: bold; color: #1f2937;">Current Drone</h3>
          <div style="font-size: 12px; line-height: 1.6; color: #374151;">
            <div><strong>Latitude:</strong> ${droneLocation.lat.toFixed(6)}</div>
            <div><strong>Longitude:</strong> ${droneLocation.lon.toFixed(6)}</div>
            <div><strong>Status:</strong> Active</div>
          </div>
        </div>
      `);
      droneMarkerRef.current = marker;
    } else {
      // Update existing marker position
      droneMarkerRef.current.setLatLng(position);
      // Center map on drone location
      mapRef.current.setView(position, mapRef.current.getZoom());
    }
  }, [droneLocation]);

  return (
    <div 
      className={className} 
      style={{ 
        position: "relative", 
        height: height === "100%" ? "100%" : height,
        width: "100%",
        minHeight: "400px"
      }}
    >
      <div 
        id="live-map" 
        style={{ 
          width: "100%", 
          height: "100%", 
          minHeight: "400px",
          borderRadius: "8px", 
          zIndex: 0,
          backgroundColor: "#1a1a1a" // Dark background while loading
        }} 
      />
      {showControls && frames.length > 0 && (
        <div className="absolute top-4 right-4 bg-gray-900/95 backdrop-blur-sm rounded-lg p-3 space-y-2 z-[1000] min-w-[200px] border border-gray-700/50">
          <div className="text-gray-200 text-sm font-semibold mb-2 uppercase tracking-wider">Active Drones</div>
          {frames.map((frame) => {
            const batteryColor = frame.battery > 50 ? "#9ca3af" : frame.battery > 20 ? "#6b7280" : "#4b5563";
            return (
              <div key={frame.droneId} className="flex items-center gap-2 text-gray-300 text-xs">
                <div
                  className="w-3 h-3 rounded-full border border-gray-600"
                  style={{ background: batteryColor }}
                />
                <span className="font-mono text-gray-200">{frame.droneId}</span>
                <span className="text-gray-400">{frame.battery}%</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

