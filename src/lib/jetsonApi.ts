// Jetson API integration - connects to Python server
import { CORE_API_URL } from "./config";

const JETSON_BASE_URL = CORE_API_URL || "http://172.24.237.66:5000";
const JETSON_WS_URL = JETSON_BASE_URL.replace("http://", "ws://").replace("https://", "wss://");

// Log connection URLs in development
if (import.meta.env.DEV) {
  console.log("[JetsonAPI] Base URL:", JETSON_BASE_URL);
  console.log("[JetsonAPI] WebSocket URL:", JETSON_WS_URL);
}

export interface JetsonTelemetry {
  bat: number;
  alt: number;
  armed: boolean;
  lat?: number; // GPS latitude
  lon?: number; // GPS longitude
  speed?: number;
  heading?: number;
  signalQuality?: number;
}

export class JetsonAPI {
  private ws: WebSocket | null = null;
  private pc: RTCPeerConnection | null = null;
  private videoTrack: MediaStreamTrack | null = null;

  // Test connection to Jetson server (test root endpoint or video feed)
  async testConnection(): Promise<{ success: boolean; error?: string; details?: any }> {
    try {
      console.log("[JetsonAPI] Testing connection to:", JETSON_BASE_URL);
      
      // Test root endpoint (the Python server serves HTML at /)
      const testUrl = `${JETSON_BASE_URL}/`;
      const response = await fetch(testUrl, {
        method: "GET",
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          details: { status: response.status, statusText: response.statusText, body: errorText },
        };
      }

      // If we get a response (even if it's HTML), the server is up
      return { success: true, details: { message: "Server is reachable" } };
    } catch (error: any) {
      console.error("[JetsonAPI] Connection test failed:", error);
      return {
        success: false,
        error: error.message || "Unknown error",
        details: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      };
    }
  }

  // Note: The Python server doesn't have a /api/telemetry endpoint
  // Telemetry comes from WebSocket messages or defaults
  // This method is kept for compatibility but returns default values
  async getTelemetry(): Promise<JetsonTelemetry> {
    console.warn("[JetsonAPI] /api/telemetry endpoint doesn't exist on Python server. Using defaults.");
    // Return default telemetry - actual values should come from WebSocket
    return {
      bat: 0,
      alt: 0,
      armed: false,
    };
  }

  // Connect WebSocket for control
  connectWebSocket(onMessage?: (data: any) => void): WebSocket {
    // Close existing connection if it exists and is not open
    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN) {
        console.log("[JetsonAPI] WebSocket already connected");
        return this.ws;
      }
      // Close if connecting or closing
      if (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.CLOSING) {
        console.log("[JetsonAPI] Closing existing WebSocket connection");
        this.ws.close();
      }
      this.ws = null;
    }

    // Try different WebSocket endpoints
    const possibleEndpoints = [
      `${JETSON_WS_URL}/ws/control`,
      `${JETSON_WS_URL}/ws`,
      `${JETSON_WS_URL}/control`,
    ];

    const wsUrl = possibleEndpoints[0]; // Start with the expected one
    console.log("[JetsonAPI] Connecting WebSocket to:", wsUrl);
    console.log("[JetsonAPI] If this fails, the server might use a different WebSocket path");
    
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log("[JetsonAPI] WebSocket connected successfully to:", wsUrl);
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
      console.error("[JetsonAPI] WebSocket URL was:", wsUrl);
      console.error("[JetsonAPI] WebSocket readyState:", this.ws?.readyState);
      console.error("[JetsonAPI] Make sure your Python server has WebSocket support enabled");
      console.error("[JetsonAPI] Common WebSocket libraries: Flask-SocketIO, websockets, or FastAPI WebSockets");
    };

    this.ws.onclose = (event) => {
      console.log("[JetsonAPI] WebSocket closed. Code:", event.code, "Reason:", event.reason || "No reason provided");
      console.log("[JetsonAPI] Was clean:", event.wasClean);
      console.log("[JetsonAPI] Common close codes:");
      console.log("[JetsonAPI]   1006 = Abnormal closure (connection lost, server down, etc.)");
      console.log("[JetsonAPI]   1000 = Normal closure");
      console.log("[JetsonAPI]   1001 = Going away");
      if (event.code === 1006) {
        console.error("[JetsonAPI] Connection failed - server might not be running or WebSocket endpoint doesn't exist");
      }
      this.ws = null;
    };

    return this.ws;
  }

  // Send control command
  sendControl(command: {
    action?: "ARM" | "DISARM" | "LAND" | "RETURN_TO_BASE" | "PAUSE" | "RESUME";
    l?: { x: number; y: number };
    r?: { x: number; y: number };
  }) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const commandStr = JSON.stringify(command);
      console.log("[JetsonAPI] Sending command:", commandStr);
      this.ws.send(commandStr);
    } else {
      console.warn("[JetsonAPI] WebSocket not connected. ReadyState:", this.ws?.readyState);
    }
  }

  // Toggle AI detection and view mode (Python server accepts both in one request)
  private currentAIState = false;
  private currentViewMode: "normal" | "heatmap" = "normal";

  async toggleAI(enabled: boolean): Promise<void> {
    this.currentAIState = enabled;
    return this.sendToggleRequest();
  }

  async toggleViewMode(mode: "normal" | "heatmap"): Promise<void> {
    this.currentViewMode = mode;
    return this.sendToggleRequest();
  }

  // Send toggle request with both ai and view (matches Python server format)
  private async sendToggleRequest(): Promise<void> {
    const url = `${JETSON_BASE_URL}/api/toggle`;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ai: this.currentAIState,
          view: this.currentViewMode,
        }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        // Python server returns {"error": "locked"} if controls are disabled
        if (errorText.includes("locked")) {
          throw new Error("Controls are locked by admin");
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error("[JetsonAPI] Toggle error:", error);
      throw error;
    }
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
      console.log("[JetsonAPI] Attempting WebRTC connection...");
      this.pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      });

      this.pc.ontrack = (event) => {
        console.log("[JetsonAPI] WebRTC track received");
        const [stream] = event.streams;
        videoElement.srcObject = stream;
        this.videoTrack = stream.getVideoTracks()[0];
      };

      this.pc.oniceconnectionstatechange = () => {
        console.log("[JetsonAPI] ICE connection state:", this.pc?.iceConnectionState);
      };

      this.pc.addTransceiver("video", { direction: "recvonly" });

      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);

      const offerUrl = `${JETSON_BASE_URL}/offer`;
      console.log("[JetsonAPI] Sending WebRTC offer to:", offerUrl);
      const response = await fetch(offerUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sdp: this.pc.localDescription?.sdp,
          type: this.pc.localDescription?.type,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const answer = await response.json();
      await this.pc.setRemoteDescription(
        new RTCSessionDescription({ sdp: answer.sdp, type: answer.type })
      );
      console.log("[JetsonAPI] WebRTC connection established");
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

