import { useEffect, useRef, useState } from "react";
import { Video, AlertCircle } from "lucide-react";
import { api } from "@/lib/config";

interface VideoStreamProps {
  droneId: string;
  className?: string;
}

export function VideoStream({ droneId, className = "" }: VideoStreamProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!droneId) return;

    // Fetch video stream configuration
    fetch(api.video.stream(droneId))
      .then((res) => res.json())
      .then((data) => {
        if (data.streamUrl) {
          setStreamUrl(data.streamUrl);
        } else {
          setError("No video stream available");
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("[VideoStream] Failed to get stream URL", err);
        setError("Could not connect to video feed");
        setLoading(false);
      });
  }, [droneId]);

  useEffect(() => {
    if (!videoRef.current || !streamUrl) return;

    // For RTSP streams, use HLS.js or similar for browser playback
    // For WebRTC, use RTCPeerConnection
    // For now, handle different stream types
    
    const video = videoRef.current;
    
    // If it's an HLS stream
    if (streamUrl.includes(".m3u8") || streamUrl.includes("hls")) {
      // Would use HLS.js here
      console.log("[VideoStream] HLS stream detected:", streamUrl);
    }
    // If it's a direct video URL
    else if (streamUrl.match(/\.(mp4|webm|ogg)/i)) {
      video.src = streamUrl;
      video.play().catch((err) => {
        console.error("[VideoStream] Playback error", err);
        setError("Could not play video");
      });
    }
    // RTSP requires conversion (use WebRTC or HLS proxy)
    else if (streamUrl.startsWith("rtsp://")) {
      // In production, proxy RTSP through WebRTC or HLS
      console.log("[VideoStream] RTSP stream requires proxy:", streamUrl);
      setError("RTSP streams require server-side conversion");
    }
  }, [streamUrl]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-black/50 ${className}`}>
        <div className="text-center text-white/60">
          <Video className="h-12 w-12 mx-auto mb-3 animate-pulse" />
          <p>Connecting to video feed...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-black/50 ${className}`}>
        <div className="text-center text-white/60">
          <AlertCircle className="h-12 w-12 mx-auto mb-3 text-yellow-500" />
          <p className="text-sm">{error}</p>
          <p className="text-xs mt-2 text-white/40">Stream: {droneId}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative bg-black ${className}`}>
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        autoPlay
        playsInline
        muted
        controls={false}
      />
      <div className="absolute top-2 right-2 bg-red-500/80 px-2 py-1 rounded text-xs font-bold">
        LIVE
      </div>
    </div>
  );
}

