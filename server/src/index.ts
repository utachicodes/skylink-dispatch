import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MissionStore } from "./missionStore.js";
import { MavlinkGateway } from "./mavlinkGateway.js";
import type { CommandEnvelope, MissionPayload, TelemetryFrame } from "./types.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4000);

const missionStore = new MissionStore();
const mavlinkGateway = new MavlinkGateway({
  port: Number(process.env.MAVLINK_PORT || 5761),
});

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/api/missions", (_req, res) => {
  res.json(missionStore.listAll());
});

app.get("/api/missions/active", (_req, res) => {
  res.json(missionStore.listActive());
});

app.post("/api/missions", (req, res) => {
  const payload = req.body as MissionPayload;
  if (!payload.pickup || !payload.dropoff) {
    return res.status(400).json({ error: "pickup and dropoff are required" });
  }
  const mission = missionStore.create(payload);
  res.status(201).json(mission);
});

app.post("/api/missions/:id/assign", (req, res) => {
  const { id } = req.params;
  const { operatorId } = req.body as { operatorId: string };
  if (!operatorId) return res.status(400).json({ error: "operatorId is required" });

  const mission = missionStore.assign(id, operatorId);
  if (!mission) return res.status(404).json({ error: "mission not found" });
  res.json(mission);
});

app.post("/api/missions/:id/status", (req, res) => {
  const { id } = req.params;
  const { status } = req.body as { status: string };
  const mission = missionStore.updateStatus(id, status as any);
  if (!mission) return res.status(404).json({ error: "mission not found" });
  res.json(mission);
});

app.get("/api/telemetry/latest", (_req, res) => {
  res.json(mavlinkGateway.latest());
});

app.get("/api/telemetry/stream", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    Connection: "keep-alive",
    "Cache-Control": "no-cache",
  });

  const handler = (frame: TelemetryFrame) => {
    res.write(`data: ${JSON.stringify(frame)}\n\n`);
  };

  mavlinkGateway.on("telemetry", handler);
  req.on("close", () => {
    mavlinkGateway.off("telemetry", handler);
  });
});

app.post("/api/telemetry/mock", (req, res) => {
  const frame = req.body as TelemetryFrame;
  if (!frame.droneId) return res.status(400).json({ error: "droneId required" });
  mavlinkGateway.pushMock({ ...frame, updatedAt: new Date().toISOString() });
  res.status(202).json({ status: "queued" });
});

app.post("/api/commands", (req, res) => {
  try {
    const command = req.body as CommandEnvelope;
    mavlinkGateway.sendCommand(command);
    res.json({ status: "sent" });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`[SkyLink Core] listening on port ${port}`);
});

