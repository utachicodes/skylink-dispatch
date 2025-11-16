# SkyLink Video Streaming & MAVProxy Integration

## Overview

SkyLink now supports live video streaming from drones and remote control via MAVProxy bridge. This document explains the complete implementation.

## Architecture

### 1. MAVProxy Bridge (Jetson Orion)

The Python script (`server/scripts/mavproxy_bridge.py`) runs on the Jetson to:
- Connect to CubePilot Orange via serial/USB
- Forward MAVLink telemetry to central server
- Receive commands from server and send to drone
- Handle video stream forwarding (RTSP/WebRTC)

### 2. Central Server (Node.js)

The server (`server/src/`) now includes:
- Enhanced MAVLink gateway with drone ID routing
- Video stream endpoints (`/api/video/stream/:droneId`)
- WebRTC signaling support
- Command forwarding to connected drones

### 3. Frontend (React)

The web application includes:
- `VideoStream` component for live video playback
- Integrated video feed in Pilot Control Room
- Real-time HUD overlays on video stream

## Setup Instructions

### On Jetson Orion

1. **Install dependencies**:
   ```bash
   pip3 install pyserial
   ```

2. **Configure serial port**:
   ```bash
   # Find your serial port
   ls /dev/ttyUSB*  # or /dev/ttyACM*
   ```

3. **Run MAVProxy bridge**:
   ```bash
   python3 server/scripts/mavproxy_bridge.py \
     --drone-id drone-001 \
     --serial /dev/ttyUSB0 \
     --baud 57600 \
     --server your-server.com \
     --port 5761
   ```

4. **Set up as systemd service** (optional):
   See `server/scripts/README.md` for systemd configuration

### On Central Server

1. **Configure environment**:
   ```env
   PORT=4000
   MAVLINK_PORT=5761
   VIDEO_URL_drone-001=rtsp://jetson-ip:8554/stream
   ```

2. **Start server**:
   ```bash
   cd server
   npm run dev
   ```

### Video Streaming Options

#### Option 1: RTSP (Requires conversion)
- Jetson streams RTSP via GStreamer/FFmpeg
- Server proxies to HLS/WebRTC for browser playback
- Use tools like `rtsp-simple-server` or `mediamtx`

#### Option 2: WebRTC (Recommended)
- Direct peer-to-peer connection
- Low latency (< 1 second)
- Requires WebRTC server (Janus, Kurento, or custom)

#### Option 3: HLS
- Convert RTSP to HLS on server
- Higher latency but reliable
- Works with standard video players

## Testing

### Test MAVLink Connection

1. Start the central server
2. Run MAVProxy bridge on Jetson
3. Check server logs for: `[MavlinkGateway] Drone drone-001 connected`

### Test Video Stream

1. Configure video URL in server environment
2. Open Pilot Control Room in web app
3. Video should appear when drone is connected

### Mock Testing

Send mock telemetry:
```bash
curl -X POST http://localhost:4000/api/telemetry/mock \
  -H "Content-Type: application/json" \
  -d '{
    "droneId": "drone-001",
    "battery": 85,
    "latitude": 14.7167,
    "longitude": -17.4677,
    "altitude": 150,
    "speed": 18,
    "heading": 72,
    "signalQuality": 92,
    "status": "in-flight"
  }'
```

## Protocol Details

### MAVLink Bridge Protocol

**Handshake** (on connection):
```
DRONE:drone-001
```

**Heartbeat** (every 5 seconds):
```
HEARTBEAT:drone-001
```

**Telemetry** (prefixed with drone ID):
```
drone-001:<MAVLink_Binary_Data>
```

**Commands** (from server):
```
drone-001:{"droneId":"drone-001","type":"RETURN_TO_BASE"}
```

## Security Considerations

1. **Authentication**: Add token-based auth to handshake
2. **Encryption**: Use VPN or TLS for MAVLink traffic
3. **Firewall**: Restrict UDP port 5761 to known IPs
4. **Video**: Use secure RTSP (RTSPS) or WebRTC with TURN/STUN

## Next Steps

1. **MAVLink Parsing**: Implement full MAVLink protocol parser
2. **Video Proxy**: Add RTSP-to-WebRTC conversion service
3. **Recording**: Implement video recording/playback
4. **Multi-drone**: Support multiple simultaneous connections
5. **Authentication**: Add secure drone registration

## Troubleshooting

- **No connection**: Check network, firewall, server address
- **No video**: Verify video URL, stream format, codec support
- **Commands fail**: Check drone ID matches, connection status
- **High latency**: Use WebRTC instead of RTSP, optimize network

