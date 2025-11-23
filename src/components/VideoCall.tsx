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
// Add to .env.local: VITE_STREAM_API_KEY=your_stream_api_key_from_getstream_io
const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY || '';
const STREAM_TOKEN_ENDPOINT = '/api/stream/token'; // Vercel serverless function endpoint

export function VideoCall({ isOpen, onClose, peerId, role, deliveryId }: VideoCallProps) {
  const { user: authUser } = useAuth();
  const [client, setClient] = useState<StreamVideoClient | null>(null);
  const [call, setCall] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !STREAM_API_KEY) {
      setError("Stream.io API key not configured. Add VITE_STREAM_API_KEY to .env.local");
      setLoading(false);
      return;
    }

    const initializeCall = async () => {
      try {
        setLoading(true);
        setError(null);

        // Generate Stream token from your backend (Vercel serverless function)
        // This endpoint uses Stream.io's server SDK to generate tokens securely
        const { supabase } = await import('@/integrations/supabase/client');
        const { data: { session } } = await supabase.auth.getSession();
        const tokenResponse = await fetch(STREAM_TOKEN_ENDPOINT, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || ''}`,
          },
          body: JSON.stringify({
            userId: authUser?.id || peerId,
            role,
            deliveryId,
          }),
        });

        if (!tokenResponse.ok) {
          throw new Error("Failed to get Stream token. Make sure STREAM_API_KEY and STREAM_API_SECRET are set in Vercel environment variables.");
        }

        const data = await tokenResponse.json();
        const token = data.token;

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

