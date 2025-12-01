import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  StreamCall,
  StreamTheme,
  StreamVideo,
  StreamVideoClient,
  CallControls,
  SpeakerLayout,
  CallingState,
  useCallStateHooks,
  type User,
} from '@stream-io/video-react-sdk';
import '@stream-io/video-react-sdk/dist/css/styles.css';
import { useAuth } from "@/contexts/AuthContext";

interface VideoCallProps {
  isOpen: boolean;
  onClose: () => void;
  peerId: string; // Client or Operator ID
  role: "client" | "operator";
  deliveryId?: string;
}

// Stream.io configuration - Stream.io is a video calling service that requires an API key
// Get your API key from https://getstream.io (free account)
// Add to .env.local: 
//   VITE_STREAM_API_KEY=your_stream_api_key_from_getstream_io
//   VITE_STREAM_API_SECRET=your_stream_api_secret_from_getstream_io
const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY || '';
// Support both VITE_STREAM_API_SECRET and STREAM_API_SECRET for backwards compatibility
const STREAM_API_SECRET = import.meta.env.VITE_STREAM_API_SECRET || import.meta.env.STREAM_API_SECRET || '';
const IS_DEV = import.meta.env.DEV;

const base64UrlEncode = (input: string | ArrayBuffer) => {
  let bytes: Uint8Array;
  if (typeof input === "string") {
    bytes = new TextEncoder().encode(input);
  } else {
    bytes = new Uint8Array(input);
  }

  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
};

const generateStreamJwt = async (userId: string): Promise<string> => {
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    throw new Error("Web Crypto API not available. Stream token cannot be signed in this environment.");
  }

  if (!STREAM_API_SECRET) {
    throw new Error("STREAM_API_SECRET is required for token generation");
  }

  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    user_id: userId,
    iat: now,
    exp: now + 60 * 60, // 1 hour expiry
    iss: STREAM_API_KEY,
  };

  const unsignedToken = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(payload))}`;
  const encoder = new TextEncoder();
  
  try {
    const key = await window.crypto.subtle.importKey(
      "raw",
      encoder.encode(STREAM_API_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signature = await window.crypto.subtle.sign("HMAC", key, encoder.encode(unsignedToken));
    const signatureBase64 = base64UrlEncode(signature);
    return `${unsignedToken}.${signatureBase64}`;
  } catch (err) {
    console.error('[VideoCall] Crypto signing error:', err);
    throw new Error("Failed to sign JWT token. Check that STREAM_API_SECRET is valid.");
  }
};

const getStreamToken = async (userId: string): Promise<string> => {
  // Always use Web Crypto API for token generation (browser-compatible, no jsonwebtoken needed)
  if (STREAM_API_SECRET && STREAM_API_SECRET.trim() !== '') {
    try {
      const token = await generateStreamJwt(userId);
      console.log('[VideoCall] Token generated using Web Crypto API');
      return token;
    } catch (err: any) {
      console.error('[VideoCall] JWT generation failed:', err);
      throw new Error(`Failed to generate Stream token: ${err.message || 'Unknown error'}`);
    }
  }

  // Fallback: Use Stream's dev token only in development (no secret needed, browser-only)
  if (IS_DEV) {
    try {
      // Use dynamic import to avoid bundling issues
      const { StreamChat } = await import("stream-chat");
      // Create a new instance to avoid any cached state
      const browserClient = StreamChat.getInstance(STREAM_API_KEY, {
        // Ensure we're using browser-compatible methods only
        logger: 'error', // Reduce logging
      });
      // devToken is browser-safe and doesn't require jsonwebtoken
      const devToken = browserClient.devToken(userId);
      console.log('[VideoCall] Dev token generated');
      return devToken;
    } catch (err: any) {
      console.error('[VideoCall] Dev token generation failed:', err);
      throw new Error(`Failed to generate dev token: ${err.message || 'Make sure stream-chat is installed'}`);
    }
  }

  throw new Error("Stream API secret missing. Add VITE_STREAM_API_SECRET to .env.local to enable video calls.");
};

export function VideoCall({ isOpen, onClose, peerId, role, deliveryId }: VideoCallProps) {
  const { user: authUser } = useAuth();
  const [client, setClient] = useState<StreamVideoClient | null>(null);
  const [call, setCall] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (!STREAM_API_KEY) {
      setError("Stream.io API key not configured. Add VITE_STREAM_API_KEY to .env.local");
      setLoading(false);
      return;
    }

    console.log('[VideoCall] Initializing call with:', {
      isOpen,
      hasApiKey: !!STREAM_API_KEY,
      hasApiSecret: !!STREAM_API_SECRET,
      isDev: IS_DEV,
      peerId,
      role,
      deliveryId,
    });

    const initializeCall = async () => {
      try {
        setLoading(true);
        setError(null);

        const userId = authUser?.id || peerId;
        console.log('[VideoCall] Generating token for userId:', userId);
        const token = await getStreamToken(userId);
        console.log('[VideoCall] Token generated successfully');

        // Create user object
        const user: User = {
          id: authUser?.id || peerId,
          name: authUser?.email?.split('@')[0] || (role === "operator" ? "Operator" : "Client"),
          image: `https://getstream.io/random_svg/?id=${peerId}&name=${role}`,
        };

        // Initialize Stream client
        const streamClient = new StreamVideoClient({
          apiKey: STREAM_API_KEY,
          user,
          token,
        });

        setClient(streamClient);

        // Create call with delivery ID as call ID
        const callId = deliveryId || `call-${peerId}-${Date.now()}`;
        const streamCall = streamClient.call('default', callId);
        
        // Join the call
        await streamCall.join({ create: true });
        setCall(streamCall);

        setLoading(false);
      } catch (err: any) {
        console.error("Failed to initialize Stream call:", err);
        setError(err.message || "Failed to start video call");
        setLoading(false);
      }
    };

    initializeCall();

    return () => {
      // Cleanup on unmount
      if (call) {
        call.leave().catch(console.error);
      }
      if (client) {
        client.disconnectUser().catch(console.error);
      }
    };
  }, [isOpen, peerId, role, deliveryId, authUser]);

  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Connecting to call...</p>
        </div>
      </div>
    );
  }

  if (error || !client || !call) {
    return (
      <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-destructive mb-4">{error || "Failed to initialize call"}</p>
            <Button onClick={onClose}>Close</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <StreamVideo client={client}>
        <StreamCall call={call}>
          <CallUI onClose={onClose} role={role} />
        </StreamCall>
      </StreamVideo>
    </div>
  );
}

function CallUI({ onClose, role }: { onClose: () => void; role: string }) {
  const { useCallCallingState } = useCallStateHooks();
  const callingState = useCallCallingState();

  if (callingState !== CallingState.JOINED) {
    return (
      <div className="flex items-center justify-center h-full text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Joining call...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <StreamTheme>
        <div className="absolute top-4 right-4 z-10">
          <Button variant="ghost" size="icon" onClick={onClose} className="bg-black/50 text-white hover:bg-black/70">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <SpeakerLayout participantsBarPosition="bottom" />
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
          <CallControls onLeave={onClose} />
        </div>
      </StreamTheme>
    </div>
  );
}

