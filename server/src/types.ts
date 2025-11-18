export type MissionStatus =
  | "pending"
  | "confirmed"
  | "assigned"
  | "in-flight"
  | "completed"
  | "failed";

export interface MissionPayload {
  clientName: string;
  pickup: string;
  dropoff: string;
  priority?: "standard" | "express" | "critical";
  packageDetails?: string;
  etaMinutes?: number;
}

export interface Mission extends MissionPayload {
  id: string;
  createdAt: string;
  status: MissionStatus;
  operatorId?: string;
}

export interface TelemetryFrame {
  droneId: string;
  battery: number;
  latitude: number;
  longitude: number;
  altitude: number;
  speed: number;
  signalQuality: number;
  heading: number;
  updatedAt: string;
  status?: MissionStatus;
}

export interface CommandEnvelope {
  droneId: string;
  type:
    | "WAYPOINT"
    | "RETURN_TO_BASE"
    | "PAUSE"
    | "RESUME"
    | "LAND"
    | "CUSTOM";
  payload?: Record<string, unknown>;
}

