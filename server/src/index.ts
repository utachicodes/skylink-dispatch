import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MissionStore } from "./missionStore.js";
import type { MissionPayload } from "./types.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4000);

const missionStore = new MissionStore();

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ 
    service: "SkyLink Core API",
    status: "running",
    version: "1.0.0",
    timestamp: new Date().toISOString()
  });
});

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

app.post("/api/missions/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body as { status: string };
  const mission = missionStore.updateStatus(id, status as any);
  if (!mission) return res.status(404).json({ error: "mission not found" });
  
  // If mission is completed and has an operator, create earnings record
  if (status === "completed" && mission.operatorId) {
    try {
      // Calculate earnings (same logic as database trigger)
      const baseRate = 10.0;
      const sizeMultiplier = mission.packageDetails?.includes("large") ? 2.0 : 
                            mission.packageDetails?.includes("small") ? 1.0 : 1.5;
      const weightMatch = mission.packageDetails?.match(/(\d+(?:\.\d+)?)kg/);
      const weight = weightMatch ? parseFloat(weightMatch[1]) : 2;
      const weightMultiplier = Math.max(1.0, weight / 2.0);
      const amount = baseRate * sizeMultiplier * weightMultiplier;
      
      // Note: In production, this would insert into Supabase operator_earnings table
      // For now, we just log it. The frontend can handle creating the earnings record.
      console.log(`[Mission ${id}] Earnings calculated: $${amount.toFixed(2)} for operator ${mission.operatorId}`);
    } catch (error) {
      console.error("[Mission] Failed to calculate earnings", error);
    }
  }
  
  res.json(mission);
});

// Telemetry endpoints - simplified (no MAVLink)
app.get("/api/telemetry/latest", (_req, res) => {
  // Return empty array - telemetry will be handled by your separate server
  res.json([]);
});

app.get("/api/telemetry/stream", (req, res) => {
  // SSE endpoint - returns empty stream
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    Connection: "keep-alive",
    "Cache-Control": "no-cache",
  });
  
  // Send initial empty data
  res.write(`data: ${JSON.stringify([])}\n\n`);
  
  // Keep connection alive
  const interval = setInterval(() => {
    res.write(`: keepalive\n\n`);
  }, 30000);
  
  req.on("close", () => {
    clearInterval(interval);
  });
});

app.post("/api/telemetry/mock", (req, res) => {
  // Mock endpoint - accepts but doesn't process
  res.status(202).json({ status: "accepted (telemetry handled by separate server)" });
});

app.post("/api/commands", (req, res) => {
  // Command endpoint - accepts but doesn't process
  // Commands will be handled by your separate server
  res.json({ status: "accepted (commands handled by separate server)" });
});

// Video streaming endpoints
app.get("/api/video/stream/:droneId", (req, res) => {
  const { droneId } = req.params;
  
  // In production, this would proxy RTSP/WebRTC stream from the drone
  // For now, return stream URL configuration
  const videoUrl = process.env[`VIDEO_URL_${droneId}`] || 
                   `rtsp://localhost:8554/${droneId}`;
  
  res.json({
    droneId,
    streamUrl: videoUrl,
    type: "rtsp", // or "webrtc", "hls", etc.
    status: "active"
  });
});

app.get("/api/video/webrtc/:droneId", (req, res) => {
  const { droneId } = req.params;
  
  // WebRTC signaling endpoint (simplified)
  // In production, integrate with WebRTC server (Janus, Kurento, etc.)
  res.json({
    droneId,
    sdpOffer: null, // Would contain WebRTC SDP
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" }
    ]
  });
});

app.listen(port, () => {
  console.log(`[SkyLink Core] listening on port ${port}`);
  console.log(`[SkyLink Core] Mission management API ready`);
  console.log(`[SkyLink Core] Telemetry and commands handled by separate server`);
});

