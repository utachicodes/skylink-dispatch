// Jetson API integration - connects to Python server
import { CORE_API_URL } from "./config";

const JETSON_BASE_URL = CORE_API_URL || "http://172.24.237.66:5000";
const JETSON_WS_URL = JETSON_BASE_URL.replace("http://", "ws://").replace("https://", "wss://");

export interface JetsonTelemetry {
  bat: number;
  alt: number;
  armed: boolean;
}

export class JetsonAPI {
  private ws: WebSocket | null = null;
  private pc: RTCPeerConnection | null = null;
  private videoTrack: MediaStreamTrack | null = null;

  // Get telemetry
  async getTelemetry(): Promise<JetsonTelemetry> {
    const response = await fetch(`${JETSON_BASE_URL}/api/telemetry`);
    return response.json();
  }

  // Connect WebSocket for control
  connectWebSocket(onMessage?: (data: any) => void): WebSocket {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return this.ws;
    }

    this.ws = new WebSocket(`${JETSON_WS_URL}/ws/control`);

    this.ws.onopen = () => {
      console.log("[JetsonAPI] WebSocket connected");
    };

    this.ws.onmessage = (event) => {
      if (onMessage) {
        try {
          const data = JSON.parse(event.data);
          onMessage(data);
        } catch (e) {
          onMessage(event.data);
        }
      }
    };

    this.ws.onerror = (error) => {
      console.error("[JetsonAPI] WebSocket error:", error);
    };

    this.ws.onclose = () => {
      console.log("[JetsonAPI] WebSocket closed");
      this.ws = null;
    };

    return this.ws;
  }

  // Send control command
  sendControl(command: {
    action?: "ARM" | "DISARM";
    l?: { x: number; y: number };
    r?: { x: number; y: number };
  }) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(command));
    } else {
      console.warn("[JetsonAPI] WebSocket not connected");
    }
  }

  // Toggle AI detection
  async toggleAI(enabled: boolean): Promise<void> {
    await fetch(`${JETSON_BASE_URL}/api/toggle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ai: enabled }),
    });
  }

  // Toggle view mode (normal/heatmap)
  async toggleViewMode(mode: "normal" | "heatmap"): Promise<void> {
    await fetch(`${JETSON_BASE_URL}/api/toggle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ view: mode }),
    });
  }

  // Admin controls (lock/unlock video and controls)
  async adminControl(adminToken: string, options: {
    lock_controls?: boolean;
    lock_video?: boolean;
    emergency?: boolean;
    message?: string;
  }): Promise<{ controls: boolean; video: boolean; emergency: boolean }> {
    const response = await fetch(`${JETSON_BASE_URL}/api/admin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Token": adminToken,
      },
      body: JSON.stringify(options),
    });
    return response.json();
  }

  // Get MJPEG feed URL (always available, non-censored)
  getMJPEGFeedUrl(): string {
    return `${JETSON_BASE_URL}/video_feed`;
  }

  // Connect to WebRTC video stream
  async connectVideoStream(videoElement: HTMLVideoElement): Promise<void> {
    try {
      this.pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      });

      this.pc.ontrack = (event) => {
        const [stream] = event.streams;
        videoElement.srcObject = stream;
        this.videoTrack = stream.getVideoTracks()[0];
      };

      this.pc.addTransceiver("video", { direction: "recvonly" });

      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);

      const response = await fetch(`${JETSON_BASE_URL}/offer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sdp: this.pc.localDescription?.sdp,
          type: this.pc.localDescription?.type,
        }),
      });

      const answer = await response.json();
      await this.pc.setRemoteDescription(
        new RTCSessionDescription({ sdp: answer.sdp, type: answer.type })
      );
    } catch (error) {
      console.error("[JetsonAPI] Failed to connect video stream:", error);
      throw error;
    }
  }

  // Disconnect video stream
  disconnectVideoStream() {
    if (this.videoTrack) {
      this.videoTrack.stop();
      this.videoTrack = null;
    }
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
  }

  // Disconnect WebSocket
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.disconnectVideoStream();
  }
}

export const jetsonApi = new JetsonAPI();

