// Shared mission store for Vercel serverless functions
// Note: This is in-memory and won't persist across function invocations
// In production, use Supabase or another database for persistence

export type MissionStatus =
  | "pending"
  | "confirmed"
  | "assigned"
  | "in-flight"
  | "completed"
  | "failed";

export interface MissionPayload {
  clientName?: string;
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

class MissionStore {
  private missions: Map<string, Mission> = new Map();

  create(payload: MissionPayload): Mission {
    const mission: Mission = {
      id: `mission_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...payload,
      priority: payload.priority ?? "standard",
      createdAt: new Date().toISOString(),
      status: "pending",
    };
    this.missions.set(mission.id, mission);
    return mission;
  }

  listAll(): Mission[] {
    return Array.from(this.missions.values());
  }

  listActive(): Mission[] {
    return Array.from(this.missions.values()).filter(
      (m) => ["pending", "assigned", "in-flight"].includes(m.status)
    );
  }

  findById(id: string): Mission | undefined {
    return this.missions.get(id);
  }

  assign(id: string, operatorId: string): Mission | null {
    const mission = this.missions.get(id);
    if (!mission) return null;
    mission.operatorId = operatorId;
    mission.status = "assigned";
    this.missions.set(id, mission);
    return mission;
  }

  updateStatus(id: string, status: MissionStatus): Mission | null {
    const mission = this.missions.get(id);
    if (!mission) return null;
    mission.status = status;
    this.missions.set(id, mission);
    return mission;
  }
}

// Export singleton instance
// Note: In serverless, this won't persist across cold starts
// For production, use Supabase or another database
export const missionStore = new MissionStore();

