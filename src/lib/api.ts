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
  try {
    const res = await fetch(url, options);
    return await handleResponse(res) as T;
  } catch (error) {
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

