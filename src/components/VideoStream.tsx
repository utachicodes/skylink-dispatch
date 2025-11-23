import { useEffect, useRef, useState } from "react";
import { Video, AlertCircle } from "lucide-react";
import { api } from "@/lib/config";

interface VideoStreamProps {
  droneId: string;
  className?: string;
}

export function VideoStream({ droneId, className = "" }: VideoStreamProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [streamType, setStreamType] = useState<'video' | 'mjpeg' | 'hls' | 'rtsp'>('video');

  useEffect(() => {
    if (!droneId) return;

    // Fetch video stream configuration
    fetch(api.video.stream(droneId))
      .then((res) => res.json())
      .then((data) => {
        if (data.streamUrl) {
          setStreamUrl(data.streamUrl);
          // Determine stream type
          if (data.type === 'mjpeg' || data.streamUrl.includes('/video_feed')) {
            setStreamType('mjpeg');
          } else if (data.type === 'hls' || data.streamUrl.includes('.m3u8')) {
            setStreamType('hls');
          } else if (data.streamUrl.startsWith('rtsp://')) {
            setStreamType('rtsp');
          } else {
            setStreamType('video');
          }
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

  // Handle MJPEG streams (simple img tag)
  useEffect(() => {
    if (streamType === 'mjpeg' && imgRef.current && streamUrl) {
      // MJPEG is just a continuous stream of JPEG images
      // Browser automatically refreshes the image
      imgRef.current.src = streamUrl;
      setError(null);
    }
  }, [streamUrl, streamType]);

  // Handle video streams (video tag)
  useEffect(() => {
    if (streamType !== 'mjpeg' && !videoRef.current || !streamUrl) return;

    const video = videoRef.current;
    
    // If it's an HLS stream (.m3u8)
    if (streamType === 'hls' || streamUrl.includes(".m3u8") || streamUrl.includes("/hls/")) {
      // Use native HLS support (Safari) or HLS.js for other browsers
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = streamUrl;
        video.play().catch((err) => {
          console.error("[VideoStream] HLS playback error", err);
          setError("Could not play HLS stream");
        });
      } else {
        // For non-Safari browsers, would need HLS.js library
        console.log("[VideoStream] HLS stream detected, but HLS.js not loaded:", streamUrl);
        setError("HLS.js required for this browser. Install hls.js library.");
      }
    }
    // If it's HTTP/HTTPS stream (MP4, WebM, or HLS via HTTP)
    else if (streamUrl.startsWith("http://") || streamUrl.startsWith("https://")) {
      video.src = streamUrl;
      video.play().catch((err) => {
        console.error("[VideoStream] Playback error", err);
        setError("Could not play video stream");
      });
    }
    // If it's RTSP, convert to HTTP HLS URL (assuming Jetson converts RTSP to HLS)
    else if (streamType === 'rtsp' || streamUrl.startsWith("rtsp://")) {
      // Convert RTSP URL to HTTP HLS URL
      // Example: rtsp://172.24.237.66:8554/stream -> http://172.24.237.66:5000/hls/stream.m3u8
      const rtspMatch = streamUrl.match(/rtsp:\/\/([^:]+):(\d+)\/(.+)/);
      if (rtspMatch) {
        const [, host, , path] = rtspMatch;
        // Try common HLS conversion paths
        const hlsUrl = `http://${host}:5000/hls/${path}.m3u8`;
        console.log("[VideoStream] Converting RTSP to HLS:", hlsUrl);
        video.src = hlsUrl;
        video.play().catch((err) => {
          console.error("[VideoStream] HLS conversion failed, trying direct HTTP", err);
          // Fallback: try direct HTTP stream
          const httpUrl = `http://${host}:5000/stream/${path}`;
          video.src = httpUrl;
          video.play().catch((e) => {
            console.error("[VideoStream] All playback methods failed", e);
            setError("Could not convert RTSP stream for browser playback");
          });
        });
      } else {
        setError("Invalid RTSP URL format");
      }
    }
    // Direct video file
    else if (streamUrl.match(/\.(mp4|webm|ogg)/i)) {
      video.src = streamUrl;
      video.play().catch((err) => {
        console.error("[VideoStream] Playback error", err);
        setError("Could not play video");
      });
    }
    else {
      setError("Unsupported stream format");
    }
  }, [streamUrl, streamType]);

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
      {streamType === 'mjpeg' ? (
        <img
          ref={imgRef}
          src={streamUrl || undefined}
          alt="Live video feed"
          className="w-full h-full object-cover"
          onError={() => setError("Failed to load MJPEG stream")}
          onLoad={() => setError(null)}
        />
      ) : (
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          playsInline
          muted
          controls={false}
        />
      )}
      <div className="absolute top-2 right-2 bg-red-500/80 px-2 py-1 rounded text-xs font-bold">
        LIVE
      </div>
    </div>
  );
}

