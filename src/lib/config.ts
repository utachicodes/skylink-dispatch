export const CORE_API_URL =
  import.meta.env.VITE_CORE_API_URL || "http://localhost:4000";

export const api = {
  mission: {
    list: () => `${CORE_API_URL}/api/missions`,
    active: () => `${CORE_API_URL}/api/missions/active`,
    create: () => `${CORE_API_URL}/api/missions`,
    assign: (id: string) => `${CORE_API_URL}/api/missions/${id}/assign`,
    status: (id: string) => `${CORE_API_URL}/api/missions/${id}/status`,
  },
  telemetry: {
    latest: () => `${CORE_API_URL}/api/telemetry/latest`,
    stream: () => `${CORE_API_URL}/api/telemetry/stream`,
  },
  commands: () => `${CORE_API_URL}/api/commands`,
  video: {
    stream: (droneId: string) => `${CORE_API_URL}/api/video/stream/${droneId}`,
    webrtc: (droneId: string) => `${CORE_API_URL}/api/video/webrtc/${droneId}`,
  },
};

