// Use environment variable or default to relative API path (same domain as frontend)
// When deployed on Vercel, API routes are at /api/*
// Set VITE_CORE_API_URL to override (e.g., for separate backend server)
export const CORE_API_URL =
  import.meta.env.VITE_CORE_API_URL || "";

// Log info about which API URL is being used
if (import.meta.env.DEV) {
  console.log(`[SkyLink] Using Core API: ${CORE_API_URL}`);
}

// Warn if using default in production (should set env var for flexibility)
if (import.meta.env.PROD && !import.meta.env.VITE_CORE_API_URL) {
  console.info(
    "[SkyLink] Using default Core API URL. " +
    "Set VITE_CORE_API_URL in Vercel environment variables to customize."
  );
}

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

