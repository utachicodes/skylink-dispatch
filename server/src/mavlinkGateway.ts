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
        const packet = JSON.parse(msg.toString());
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
        console.error("[MavlinkGateway] Failed to parse telemetry", error);
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

    const envelope = Buffer.from(JSON.stringify(command));
    this.server.send(envelope, endpoint.port, endpoint.address);
  }

  pushMock(frame: TelemetryFrame) {
    this.telemetry.set(frame.droneId, frame);
    this.emit("telemetry", frame);
  }
}

