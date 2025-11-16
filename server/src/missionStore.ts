import { randomUUID } from "crypto";
import type { Mission, MissionPayload, MissionStatus } from "./types.js";

export class MissionStore {
  private missions = new Map<string, Mission>();

  create(payload: MissionPayload): Mission {
    const mission: Mission = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      status: "pending",
      priority: payload.priority ?? "standard",
      ...payload,
    };

    this.missions.set(mission.id, mission);
    return mission;
  }

  assign(missionId: string, operatorId: string): Mission | undefined {
    const mission = this.missions.get(missionId);
    if (!mission) return undefined;

    mission.operatorId = operatorId;
    mission.status = "assigned";
    this.missions.set(missionId, mission);
    return mission;
  }

  updateStatus(missionId: string, status: MissionStatus): Mission | undefined {
    const mission = this.missions.get(missionId);
    if (!mission) return undefined;

    mission.status = status;
    this.missions.set(missionId, mission);
    return mission;
  }

  listActive(): Mission[] {
    return Array.from(this.missions.values()).filter((mission) =>
      ["pending", "assigned", "in-flight"].includes(mission.status),
    );
  }

  listAll(): Mission[] {
    return Array.from(this.missions.values());
  }
}

