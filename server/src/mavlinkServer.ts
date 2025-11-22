import dgram from "dgram";
import { createClient } from "@supabase/supabase-js";
import type { TelemetryFrame } from "./types.js";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface DroneConnection {
  droneId: string;
  address: string;
  port: number;
  lastHeartbeat: Date;
}

export class MavlinkServer {
  private server = dgram.createSocket("udp4");
  private connections = new Map<string, DroneConnection>();
  private telemetryCache = new Map<string, TelemetryFrame>();

  constructor(private port: number = 5761) {
    this.setupServer();
  }

  private setupServer() {
    this.server.on("message", async (msg, rinfo) => {
      try {
        const data = msg.toString();

        // Handle handshake
        if (data.startsWith("DRONE:")) {
          const droneId = data.split(":")[1].trim();
          this.handleDroneConnection(droneId, rinfo);
          return;
        }

        // Handle heartbeat
        if (data.startsWith("HEARTBEAT:")) {
          const droneId = data.split(":")[1].trim();
          this.updateHeartbeat(droneId);
          return;
        }

        // Handle telemetry (JSON format from bridge)
        if (data.includes(":")) {
          const [droneId, ...rest] = data.split(":");
          const telemetryData = rest.join(":");

          try {
            const packet = JSON.parse(telemetryData);
            if (packet.latitude !== undefined || packet.battery !== undefined) {
              await this.handleTelemetry(droneId.trim(), packet, rinfo);
            }
          } catch {
            // Not JSON, might be raw MAVLink binary
            // In production, parse MAVLink protocol here
            console.log(`[MavlinkServer] Raw MAVLink from ${droneId}`);
          }
        }
      } catch (error) {
        console.error("[MavlinkServer] Error processing message:", error);
      }
    });

    this.server.on("error", (err) => {
      console.error("[MavlinkServer] UDP error:", err);
    });

    this.server.bind(this.port, "0.0.0.0", () => {
      console.log(`[MavlinkServer] Listening on UDP port ${this.port}`);
    });

    // Cleanup stale connections every 30 seconds
    setInterval(() => this.cleanupStaleConnections(), 30000);

    // Store telemetry to database every 5 seconds
    setInterval(() => this.flushTelemetryToDatabase(), 5000);
  }

  private handleDroneConnection(droneId: string, rinfo: dgram.RemoteInfo) {
    this.connections.set(droneId, {
      droneId,
      address: rinfo.address,
      port: rinfo.port,
      lastHeartbeat: new Date(),
    });

    console.log(`[MavlinkServer] Drone ${droneId} connected from ${rinfo.address}:${rinfo.port}`);

    // Update drone status in database
    this.updateDroneStatus(droneId, true);
  }

  private updateHeartbeat(droneId: string) {
    const conn = this.connections.get(droneId);
    if (conn) {
      conn.lastHeartbeat = new Date();
    }
  }

  private async handleTelemetry(
    droneId: string,
    packet: any,
    rinfo: dgram.RemoteInfo
  ) {
    // Update connection info
    if (!this.connections.has(droneId)) {
      this.handleDroneConnection(droneId, rinfo);
    } else {
      this.updateHeartbeat(droneId);
    }

    // Create telemetry frame
    const frame: TelemetryFrame = {
      droneId,
      battery: packet.battery ?? 100,
      latitude: packet.latitude ?? 0,
      longitude: packet.longitude ?? 0,
      altitude: packet.altitude ?? 0,
      speed: packet.speed ?? 0,
      heading: packet.heading ?? 0,
      signalQuality: packet.signalQuality ?? 100,
      status: packet.status,
      updatedAt: new Date().toISOString(),
    };

    // Cache telemetry
    this.telemetryCache.set(droneId, frame);

    // Update drone location in database
    await this.updateDroneLocation(droneId, frame);
  }

  private async updateDroneStatus(droneId: string, isActive: boolean) {
    try {
      // Find drone by name or ID
      const { data: drones } = await supabase
        .from("drones")
        .select("id")
        .or(`id.eq.${droneId},drone_name.eq.${droneId}`)
        .limit(1);

      if (drones && drones.length > 0) {
        await supabase
          .from("drones")
          .update({
            is_active: isActive,
            updated_at: new Date().toISOString(),
          })
          .eq("id", drones[0].id);
      }
    } catch (error) {
      console.error("[MavlinkServer] Error updating drone status:", error);
    }
  }

  private async updateDroneLocation(droneId: string, frame: TelemetryFrame) {
    try {
      // Find drone
      const { data: drones } = await supabase
        .from("drones")
        .select("id")
        .or(`id.eq.${droneId},drone_name.eq.${droneId}`)
        .limit(1);

      if (drones && drones.length > 0) {
        const droneId_db = drones[0].id;

        // Update drone location
        await supabase
          .from("drones")
          .update({
            current_lat: frame.latitude,
            current_lng: frame.longitude,
            battery_level: frame.battery,
            gps_signal: frame.signalQuality > 50,
            updated_at: new Date().toISOString(),
          })
          .eq("id", droneId_db);

        // Insert tracking record
        await supabase.from("drone_tracking").insert({
          drone_id: droneId_db,
          latitude: frame.latitude,
          longitude: frame.longitude,
          altitude: frame.altitude,
          speed: frame.speed,
          battery_level: frame.battery,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("[MavlinkServer] Error updating drone location:", error);
    }
  }

  private async flushTelemetryToDatabase() {
    // This is already handled in updateDroneLocation
    // But we can add batch processing here if needed
  }

  private cleanupStaleConnections() {
    const now = new Date();
    const staleThreshold = 30000; // 30 seconds

    for (const [droneId, conn] of this.connections.entries()) {
      const age = now.getTime() - conn.lastHeartbeat.getTime();
      if (age > staleThreshold) {
        console.log(`[MavlinkServer] Drone ${droneId} connection stale, removing`);
        this.connections.delete(droneId);
        this.updateDroneStatus(droneId, false);
      }
    }
  }

  sendCommand(droneId: string, command: Buffer) {
    const conn = this.connections.get(droneId);
    if (!conn) {
      throw new Error(`Drone ${droneId} not connected`);
    }

    const envelope = Buffer.from(`${droneId}:${command.toString("base64")}`);
    this.server.send(envelope, conn.port, conn.address, (err) => {
      if (err) {
        console.error(`[MavlinkServer] Error sending command to ${droneId}:`, err);
      } else {
        console.log(`[MavlinkServer] Command sent to ${droneId}`);
      }
    });
  }

  getLatestTelemetry(): TelemetryFrame[] {
    return Array.from(this.telemetryCache.values());
  }

  getConnectedDrones(): string[] {
    return Array.from(this.connections.keys());
  }
}

