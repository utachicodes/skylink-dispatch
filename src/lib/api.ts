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

export const coreApi = {
  async listMissions() {
    const res = await fetch(api.mission.list());
    return handleResponse(res) as Promise<MissionResponse[]>;
  },
  async listActiveMissions() {
    const res = await fetch(api.mission.active());
    return handleResponse(res) as Promise<MissionResponse[]>;
  },
  async createMission(payload: MissionRequest) {
    const res = await fetch(api.mission.create(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleResponse(res) as Promise<MissionResponse>;
  },
  async assignMission(id: string, operatorId: string) {
    const res = await fetch(api.mission.assign(id), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operatorId }),
    });
    return handleResponse(res) as Promise<MissionResponse>;
  },
  async updateMissionStatus(id: string, status: string) {
    const res = await fetch(api.mission.status(id), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    return handleResponse(res) as Promise<MissionResponse>;
  },
  async latestTelemetry() {
    const res = await fetch(api.telemetry.latest());
    return handleResponse(res) as Promise<TelemetryFrame[]>;
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
    const res = await fetch(api.commands(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(command),
    });
    return handleResponse(res) as Promise<{ status: string }>;
  },
};

