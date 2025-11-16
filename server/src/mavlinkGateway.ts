import dgram from "dgram";
import { EventEmitter } from "events";
import type { CommandEnvelope, TelemetryFrame } from "./types.js";

interface GatewayOptions {
  port?: number;
  host?: string;
}

type DroneEndpoint = { port: number; address: string };

export class MavlinkGateway extends EventEmitter {
  private server = dgram.createSocket("udp4");
  private telemetry = new Map<string, TelemetryFrame>();
  private endpoints = new Map<string, DroneEndpoint>();

  constructor(private options: GatewayOptions = {}) {
    super();
    const port = options.port ?? 5761;
    const host = options.host ?? "0.0.0.0";

    this.server.on("message", (msg, rinfo) => {
      try {
        const data = msg.toString();
        
        // Handle handshake/heartbeat from MAVProxy bridge
        if (data.startsWith("DRONE:") || data.startsWith("HEARTBEAT:")) {
          const droneId = data.split(":")[1];
          this.endpoints.set(droneId, {
            port: rinfo.port,
            address: rinfo.address,
          });
          console.log(`[MavlinkGateway] Drone ${droneId} connected from ${rinfo.address}:${rinfo.port}`);
          return;
        }

        // Handle MAVLink packets with drone ID prefix (from MAVProxy bridge)
        if (data.includes(":")) {
          const [droneId, ...rest] = data.split(":");
          const mavlinkData = rest.join(":");
          
          // Try to parse as JSON telemetry first
          try {
            const packet = JSON.parse(mavlinkData);
            if (packet.droneId || packet.battery !== undefined) {
              const frame: TelemetryFrame = {
                droneId: packet.droneId || droneId,
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

              this.endpoints.set(droneId, {
                port: rinfo.port,
                address: rinfo.address,
              });

              this.telemetry.set(droneId, frame);
              this.emit("telemetry", frame);
              return;
            }
          } catch {
            // Not JSON, treat as raw MAVLink binary
            // In production, parse MAVLink protocol here
            console.log(`[MavlinkGateway] Raw MAVLink packet from ${droneId} (${mavlinkData.length} bytes)`);
          }
        }

        // Fallback: try parsing as direct JSON (for mock/testing)
        const packet = JSON.parse(data);
        if (!packet.droneId) return;

        const frame: TelemetryFrame = {
          droneId: packet.droneId,
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

        this.endpoints.set(packet.droneId, {
          port: rinfo.port,
          address: rinfo.address,
        });

        this.telemetry.set(packet.droneId, frame);
        this.emit("telemetry", frame);
      } catch (error) {
        // Silently ignore parse errors for raw MAVLink binary
        if (!(error instanceof SyntaxError)) {
          console.error("[MavlinkGateway] Failed to parse telemetry", error);
        }
      }
    });

    this.server.bind(port, host, () => {
      console.log(`[MavlinkGateway] Listening for MAVLink UDP on ${host}:${port}`);
    });
  }

  latest(): TelemetryFrame[] {
    return Array.from(this.telemetry.values());
  }

  sendCommand(command: CommandEnvelope) {
    const endpoint = this.endpoints.get(command.droneId);
    if (!endpoint) {
      throw new Error(`Drone ${command.droneId} not connected`);
    }

    // Format command for MAVProxy bridge: "DRONE_ID:COMMAND_JSON"
    const commandJson = JSON.stringify(command);
    const envelope = Buffer.from(`${command.droneId}:${commandJson}`);
    this.server.send(envelope, endpoint.port, endpoint.address);
    console.log(`[MavlinkGateway] Sent command ${command.type} to ${command.droneId}`);
  }

  pushMock(frame: TelemetryFrame) {
    this.telemetry.set(frame.droneId, frame);
    this.emit("telemetry", frame);
  }
}

