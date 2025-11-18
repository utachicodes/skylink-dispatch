import { api } from "./config";

export interface MissionRequest {
  clientName: string;
  pickup: string;
  dropoff: string;
  priority?: "standard" | "express" | "critical";
  packageDetails?: string;
  etaMinutes?: number;
}

export interface MissionResponse extends MissionRequest {
  id: string;
  createdAt: string;
  status: string;
  operatorId?: string;
}

export interface TelemetryFrame {
  droneId: string;
  battery: number;
  latitude: number;
  longitude: number;
  altitude: number;
  speed: number;
  heading: number;
  signalQuality: number;
  updatedAt: string;
  status?: string;
}

const handleResponse = async (res: Response) => {
  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || "Request failed");
  }
  return res.json();
};

const safeFetch = async <T>(url: string, options?: RequestInit, defaultValue?: T): Promise<T> => {
  let timeoutId: NodeJS.Timeout | null = null;
  try {
    // Create abort controller for timeout (unless one is already provided)
    const controller = options?.signal ? null : new AbortController();
    if (controller) {
      timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    }
    
    const res = await fetch(url, {
      ...options,
      signal: controller?.signal || options?.signal,
    });
    
    if (timeoutId) clearTimeout(timeoutId);
    
    if (!res.ok) {
      // If it's a 404, that's OK - just return empty/default
      if (res.status === 404) {
        console.warn(`[Core API] 404 on ${url} - returning default`);
        if (defaultValue !== undefined) return defaultValue;
        if (url.includes("/missions") || url.includes("/telemetry")) {
          return [] as T;
        }
      }
      // For other errors, try to parse the error message
      const message = await res.text().catch(() => `HTTP ${res.status}`);
      throw new Error(message || `Request failed with status ${res.status}`);
    }
    
    return await handleResponse(res) as T;
  } catch (error: any) {
    if (timeoutId) clearTimeout(timeoutId);
    
    // Network errors, CORS errors, timeouts, etc.
    if (error.name === 'AbortError' || error.name === 'TypeError' || error.message?.includes('Failed to fetch')) {
      console.warn(`[Core API] Network error on ${url} - this is OK if core API is not configured`, error.message);
      if (defaultValue !== undefined) return defaultValue;
      if (url.includes("/missions") || url.includes("/telemetry")) {
        return [] as T;
      }
      // For non-list endpoints, still throw but with a clearer message
      throw new Error(`Core API unavailable: ${error.message}`);
    }
    
    console.warn(`[Core API] Request failed: ${url}`, error);
    // Return default value if provided, otherwise empty array for list endpoints
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    if (url.includes("/missions") || url.includes("/telemetry")) {
      return [] as T;
    }
    throw error;
  }
};

export const coreApi = {
  async listMissions() {
    return safeFetch<MissionResponse[]>(api.mission.list());
  },
  async listActiveMissions() {
    return safeFetch<MissionResponse[]>(api.mission.active());
  },
  async createMission(payload: MissionRequest) {
    return safeFetch<MissionResponse>(api.mission.create(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },
  async assignMission(id: string, operatorId: string) {
    return safeFetch<MissionResponse>(api.mission.assign(id), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operatorId }),
    });
  },
  async updateMissionStatus(id: string, status: string) {
    return safeFetch<MissionResponse>(api.mission.status(id), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  },
  async latestTelemetry() {
    return safeFetch<TelemetryFrame[]>(api.telemetry.latest(), undefined, [] as TelemetryFrame[]);
  },
  async sendCommand(command: {
    droneId: string;
    type:
      | "WAYPOINT"
      | "RETURN_TO_BASE"
      | "PAUSE"
      | "RESUME"
      | "LAND"
      | "CUSTOM";
    payload?: Record<string, unknown>;
  }) {
    return safeFetch<{ status: string }>(api.commands(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(command),
    });
  },
};

