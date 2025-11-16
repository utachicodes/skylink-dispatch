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
}

export function LiveMap({ className = "", height = "400px", showControls = true, center, zoom = 13 }: LiveMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const { frames } = useTelemetry();

  useEffect(() => {
    if (!mapRef.current) {
      const map = L.map("live-map", {
        center: center || [14.7167, -17.4677], // Dakar default
        zoom: zoom,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;
    } else if (center) {
      // Update center if map already exists and center prop changes
      mapRef.current.setView(center, zoom);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [center, zoom]);

  useEffect(() => {
    if (!mapRef.current) return;

    frames.forEach((frame) => {
      const key = frame.droneId;
      const position: [number, number] = [frame.latitude, frame.longitude];

      if (!markersRef.current.has(key)) {
        // Create custom icon
        const icon = L.divIcon({
          className: "drone-marker",
          html: `
            <div style="
              background: ${frame.battery > 50 ? "#10b981" : frame.battery > 20 ? "#f59e0b" : "#ef4444"};
              width: 32px;
              height: 32px;
              border-radius: 50%;
              border: 3px solid white;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
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

  return (
    <div className={className} style={{ position: "relative", height }}>
      <div id="live-map" style={{ width: "100%", height: "100%", borderRadius: "8px", zIndex: 0 }} />
      {showControls && frames.length > 0 && (
        <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-sm rounded-lg p-3 space-y-2 z-[1000] min-w-[200px]">
          <div className="text-white text-sm font-semibold mb-2">Active Drones</div>
          {frames.map((frame) => (
            <div key={frame.droneId} className="flex items-center gap-2 text-white text-xs">
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  background: frame.battery > 50 ? "#10b981" : frame.battery > 20 ? "#f59e0b" : "#ef4444",
                }}
              />
              <span className="font-mono">{frame.droneId}</span>
              <span className="text-white/60">{frame.battery}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

