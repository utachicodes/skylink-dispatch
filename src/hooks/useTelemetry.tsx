import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/config";
import type { TelemetryFrame } from "@/lib/api";

interface Options {
  autoConnect?: boolean;
}

export const useTelemetry = (options: Options = {}) => {
  const { autoConnect = true } = options;
  const [frames, setFrames] = useState<Record<string, TelemetryFrame>>({});
  const [connected, setConnected] = useState(false);
  const streamUrl = useMemo(() => api.telemetry.stream(), []);

  useEffect(() => {
    if (!autoConnect) return;
    
    // Skip if CORE_API_URL is set to Jetson (which doesn't have this endpoint)
    const coreApiUrl = import.meta.env.VITE_CORE_API_URL || "";
    if (coreApiUrl.includes("172.24.237.66") || coreApiUrl.includes("jetson")) {
      console.log("[useTelemetry] Skipping telemetry stream (Jetson server doesn't have /api/telemetry/stream)");
      setConnected(false);
      return;
    }

    const eventSource = new EventSource(streamUrl);
    setConnected(true);

    eventSource.onmessage = (event) => {
      const frame = JSON.parse(event.data) as TelemetryFrame;
      setFrames((prev) => ({ ...prev, [frame.droneId]: frame }));
    };

    eventSource.onerror = () => {
      setConnected(false);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [autoConnect, streamUrl]);

  return {
    frames: Object.values(frames),
    latestById: frames,
    connected,
  };
};

