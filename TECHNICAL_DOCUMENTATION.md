# SkyLink Dispatch Platform - Technical Documentation

**Version:** 1.0.0  
**Last Updated:** 2024  
**Base of Operations:** Dakar, Senegal

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Component Specifications](#component-specifications)
5. [API Reference](#api-reference)
6. [Protocol Specifications](#protocol-specifications)
7. [Deployment Guide](#deployment-guide)
8. [Development Guide](#development-guide)
9. [Security Architecture](#security-architecture)
10. [Performance & Scalability](#performance--scalability)
11. [Troubleshooting](#troubleshooting)
12. [Appendix](#appendix)

---

## System Overview

SkyLink is a multi-sector drone dispatch platform designed to facilitate critical operations in challenging environments. The system enables remote drone control, real-time telemetry monitoring, live video streaming, and mission management across emergency services, delivery networks, restaurants, and law enforcement agencies.

### Key Features

- **Dual-Mode Interface**: Separate client and operator dashboards
- **Real-Time Telemetry**: Live drone tracking with battery, location, speed, and signal quality
- **Semi-Autonomous Control**: Operator-assisted flight with virtual joystick controls
- **Live Video Streaming**: RTSP/WebRTC video feed integration
- **Mission Management**: Complete lifecycle tracking from request to completion
- **MAVLink Integration**: Protocol-compliant drone communication
- **Multi-Drone Support**: Concurrent operation of multiple drones

### Use Cases

- Emergency services (fire, police, medical)
- Critical deliveries (hospitals, remote locations)
- Commercial logistics (restaurants, couriers)
- Law enforcement (facial recognition, surveillance)
- Remote workforce (certified operators worldwide)

---

## Architecture

### Three-Tier Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    TIER 1: FIELD CLIENT                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │ CubePilot    │  │ Jetson Orion │  │ 4G/5G Modem│        │
│  │ Orange       │◄─┤ (Onboard PC) │◄─┤            │        │
│  │ (Flight Ctrl)│  │              │  │            │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
│         │                  │                                  │
│         └──────────────────┘                                  │
│                  │                                            │
│         MAVProxy Bridge Script                                │
└──────────────────┼────────────────────────────────────────────┘
                   │
                   │ UDP/MAVLink (Port 5761)
                   │
┌──────────────────┼────────────────────────────────────────────┐
│                  │    TIER 2: CENTRAL SERVER                  │
│                  │  ┌──────────────────────────┐            │
│                  │  │  Express.js Server        │            │
│                  │  │  - MAVLink Gateway        │            │
│                  │  │  - Mission Store          │            │
│                  │  │  - Video Proxy            │            │
│                  │  │  - REST API               │            │
│                  │  │  - SSE Telemetry Stream   │            │
│                  │  └──────────────────────────┘            │
│                  │                                            │
│                  │  ┌──────────────────────────┐            │
│                  │  │  Database (Supabase)      │            │
│                  │  │  - User Management       │            │
│                  │  │  - Mission History       │            │
│                  │  │  - Operator Records      │            │
│                  │  └──────────────────────────┘            │
└──────────────────┼────────────────────────────────────────────┘
                   │
                   │ HTTPS/WebSocket/SSE
                   │
┌──────────────────┼────────────────────────────────────────────┐
│                  │    TIER 3: CLIENT APPLICATION              │
│                  │  ┌──────────────────────────┐            │
│                  │  │  React Web Application   │            │
│                  │  │  - Client Dashboard      │            │
│                  │  │  - Operator Dashboard    │            │
│                  │  │  - Pilot Control Room    │            │
│                  │  │  - Video Streaming       │            │
│                  │  │  - Real-time Telemetry   │            │
│                  │  └──────────────────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Telemetry Flow**: Drone → MAVProxy → Central Server → Web App (SSE)
2. **Command Flow**: Web App → Central Server → MAVProxy → Drone
3. **Video Flow**: Drone Camera → Jetson → RTSP Server → Central Server → Web App
4. **Mission Flow**: Client → Web App → Central Server → Operator → Drone

---

## Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.x | UI Framework |
| TypeScript | 5.x | Type Safety |
| Vite | Latest | Build Tool |
| Tailwind CSS | Latest | Styling |
| shadcn/ui | Latest | Component Library |
| React Router | Latest | Routing |
| Supabase JS | Latest | Authentication |
| Sonner | Latest | Notifications |
| Lucide React | Latest | Icons |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 18+ | Runtime |
| Express.js | 4.x | Web Framework |
| TypeScript | 5.x | Type Safety |
| tsx | Latest | ES Module Execution |
| dgram (UDP) | Built-in | MAVLink Gateway |

### Infrastructure

| Component | Purpose |
|-----------|---------|
| Supabase | Authentication, Database |
| MAVProxy Bridge | Python script for Jetson |
| RTSP/WebRTC | Video streaming |
| UDP Socket | MAVLink communication |

### Hardware

| Component | Specification |
|-----------|---------------|
| CubePilot Orange | Flight controller |
| Jetson Orion | Onboard computer |
| 4G/5G Modem | Internet connectivity |
| Camera | Video capture |

---

## Component Specifications

### 1. MAVProxy Bridge (`server/scripts/mavproxy_bridge.py`)

**Purpose**: Bridge between CubePilot and central server

**Responsibilities**:
- Serial/USB communication with CubePilot
- UDP communication with central server
- Bidirectional MAVLink forwarding
- Heartbeat management
- Error handling and reconnection

**Configuration**:
```python
--serial /dev/ttyUSB0    # Serial port
--baud 57600            # Baud rate
--server your-server.com # Server address
--port 5761             # UDP port
--drone-id drone-001    # Unique identifier
```

**Protocol**:
- Handshake: `DRONE:drone-id`
- Heartbeat: `HEARTBEAT:drone-id` (every 5s)
- Telemetry: `drone-id:<MAVLink_data>`
- Commands: `drone-id:<command_json>`

### 2. MAVLink Gateway (`server/src/mavlinkGateway.ts`)

**Purpose**: Handle MAVLink communication on central server

**Features**:
- UDP socket listener (port 5761)
- Drone endpoint tracking
- Telemetry frame parsing
- Command routing
- Event emission for SSE

**Class Methods**:
```typescript
latest(): TelemetryFrame[]
sendCommand(command: CommandEnvelope): void
pushMock(frame: TelemetryFrame): void
```

### 3. Mission Store (`server/src/missionStore.ts`)

**Purpose**: In-memory mission state management

**Operations**:
- Create mission
- Assign to operator
- Update status
- List active/pending missions
- Query by ID

**Mission States**:
- `pending`: Awaiting operator
- `assigned`: Operator accepted
- `in-flight`: Active delivery
- `completed`: Successfully finished
- `failed`: Mission failed

### 4. Video Stream Component (`src/components/VideoStream.tsx`)

**Purpose**: Display live video feed from drone

**Features**:
- RTSP/HLS/WebRTC support
- Loading states
- Error handling
- Auto-reconnect
- Stream URL configuration

**Props**:
```typescript
interface VideoStreamProps {
  droneId: string;
  className?: string;
}
```

### 5. Telemetry Hook (`src/hooks/useTelemetry.tsx`)

**Purpose**: Real-time telemetry subscription

**Features**:
- Server-Sent Events (SSE) connection
- Automatic reconnection
- Frame buffering
- Connection status tracking

**Return Value**:
```typescript
{
  frames: TelemetryFrame[];
  latestById: Record<string, TelemetryFrame>;
  connected: boolean;
}
```

### 6. Gamepad Hook (`src/hooks/useGamepad.ts`)

**Purpose**: Physical joystick/gamepad support

**Features**:
- Web Gamepad API integration
- Joystick axis mapping
- Button event handling
- Manual control mode

---

## API Reference

### Base URL

```
Production: https://api.skylink.com
Development: http://localhost:4000
```

### Authentication

Most endpoints require authentication via Supabase JWT token (sent in `Authorization` header).

### Endpoints

#### Health Check

```http
GET /health
```

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### Missions

##### List All Missions

```http
GET /api/missions
```

**Response**:
```json
[
  {
    "id": "mission-001",
    "clientName": "Hospital Alpha",
    "pickup": "Dakar Plateau",
    "dropoff": "Almadies",
    "status": "in-flight",
    "priority": "critical",
    "createdAt": "2024-01-15T10:00:00Z",
    "operatorId": "operator-123"
  }
]
```

##### List Active Missions

```http
GET /api/missions/active
```

**Response**: Same as above, filtered to active missions

##### Create Mission

```http
POST /api/missions
Content-Type: application/json

{
  "clientName": "Hospital Alpha",
  "pickup": "Dakar Plateau",
  "dropoff": "Almadies",
  "priority": "critical",
  "packageDetails": "Blood units - 2.5kg",
  "etaMinutes": 12
}
```

**Response**: Created mission object

##### Assign Mission

```http
POST /api/missions/:id/assign
Content-Type: application/json

{
  "operatorId": "operator-123"
}
```

**Response**: Updated mission object

##### Update Mission Status

```http
POST /api/missions/:id/status
Content-Type: application/json

{
  "status": "completed"
}
```

**Response**: Updated mission object

#### Telemetry

##### Get Latest Telemetry

```http
GET /api/telemetry/latest
```

**Response**:
```json
[
  {
    "droneId": "drone-001",
    "battery": 85,
    "latitude": 14.7167,
    "longitude": -17.4677,
    "altitude": 150,
    "speed": 18,
    "heading": 72,
    "signalQuality": 92,
    "status": "in-flight",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
]
```

##### Telemetry Stream (SSE)

```http
GET /api/telemetry/stream
Accept: text/event-stream
```

**Response**: Server-Sent Events stream
```
data: {"droneId":"drone-001","battery":85,...}

data: {"droneId":"drone-001","battery":84,...}
```

##### Mock Telemetry (Testing)

```http
POST /api/telemetry/mock
Content-Type: application/json

{
  "droneId": "drone-001",
  "battery": 85,
  "latitude": 14.7167,
  "longitude": -17.4677,
  "altitude": 150,
  "speed": 18,
  "heading": 72,
  "signalQuality": 92,
  "status": "in-flight"
}
```

**Response**:
```json
{
  "status": "queued"
}
```

#### Commands

##### Send Command

```http
POST /api/commands
Content-Type: application/json

{
  "droneId": "drone-001",
  "type": "RETURN_TO_BASE"
}
```

**Command Types**:
- `WAYPOINT`: Navigate to coordinates
- `RETURN_TO_BASE`: Return to home
- `PAUSE`: Pause flight
- `RESUME`: Resume flight
- `LAND`: Emergency land
- `CUSTOM`: Custom command with payload

**Response**:
```json
{
  "status": "sent"
}
```

**Error Response** (400):
```json
{
  "error": "Drone drone-001 not connected"
}
```

#### Video

##### Get Video Stream URL

```http
GET /api/video/stream/:droneId
```

**Response**:
```json
{
  "droneId": "drone-001",
  "streamUrl": "rtsp://jetson-ip:8554/stream",
  "type": "rtsp",
  "status": "active"
}
```

##### WebRTC Signaling

```http
GET /api/video/webrtc/:droneId
```

**Response**:
```json
{
  "droneId": "drone-001",
  "sdpOffer": null,
  "iceServers": [
    { "urls": "stun:stun.l.google.com:19302" }
  ]
}
```

---

## Protocol Specifications

### MAVLink Bridge Protocol

#### Handshake

When MAVProxy bridge connects:

```
DRONE:drone-001
```

Server responds by registering endpoint and logging connection.

#### Heartbeat

Sent every 5 seconds to maintain connection:

```
HEARTBEAT:drone-001
```

#### Telemetry Forwarding

All MAVLink packets from drone are prefixed with drone ID:

```
drone-001:<MAVLink_Binary_Data>
```

Or JSON telemetry:

```
drone-001:{"droneId":"drone-001","battery":85,"latitude":14.7167,...}
```

#### Command Forwarding

Commands from server to drone:

```
drone-001:{"droneId":"drone-001","type":"RETURN_TO_BASE"}
```

### MAVLink Message Format

Standard MAVLink 2.0 protocol:
- Header: 10 bytes
- Payload: Variable length
- Checksum: 2 bytes

Common message types:
- `HEARTBEAT` (0): System status
- `SYS_STATUS` (1): Battery, sensors
- `GPS_RAW_INT` (24): GPS coordinates
- `ATTITUDE` (30): Orientation
- `LOCAL_POSITION_NED` (32): Local position
- `COMMAND_LONG` (76): Command execution

### Video Streaming Protocols

#### RTSP

```
rtsp://jetson-ip:8554/stream
```

Requires server-side conversion to HLS or WebRTC for browser playback.

#### HLS

```
http://server.com/hls/stream.m3u8
```

Compatible with HTML5 video element, higher latency.

#### WebRTC

Direct peer-to-peer connection:
- SDP offer/answer exchange
- ICE candidate gathering
- DTLS encryption
- Low latency (< 1 second)

---

## Deployment Guide

### Prerequisites

- Node.js 18+ installed
- Python 3.8+ (for MAVProxy bridge)
- Supabase account and project
- Domain name (production)
- SSL certificate (production)

### Environment Variables

#### Frontend (`.env`)

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_CORE_API_URL=https://api.skylink.com
```

#### Backend (`server/.env`)

```env
PORT=4000
MAVLINK_PORT=5761
VIDEO_URL_drone-001=rtsp://jetson-ip:8554/stream
VIDEO_URL_drone-002=rtsp://jetson-ip:8554/stream2
```

### Frontend Deployment

#### Vercel

1. Connect GitHub repository
2. Set environment variables
3. Deploy

#### Netlify

1. Connect repository
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Set environment variables

#### AWS Amplify

1. Connect repository
2. Configure build settings
3. Set environment variables
4. Deploy

### Backend Deployment

#### Fly.io

```bash
fly launch
fly secrets set PORT=4000 MAVLINK_PORT=5761
fly deploy
```

#### Railway

1. Connect repository
2. Set environment variables
3. Deploy

#### AWS EC2

1. Launch EC2 instance
2. Install Node.js
3. Clone repository
4. Install dependencies
5. Set up PM2 or systemd
6. Configure firewall (UDP 5761)

#### DigitalOcean App Platform

1. Connect repository
2. Configure build settings
3. Set environment variables
4. Deploy

### MAVProxy Bridge Deployment

#### On Jetson Orion

1. Copy script to Jetson:
   ```bash
   scp server/scripts/mavproxy_bridge.py jetson@jetson-ip:/opt/skylink/
   ```

2. Install dependencies:
   ```bash
   pip3 install pyserial
   ```

3. Create systemd service:
   ```bash
   sudo nano /etc/systemd/system/skylink-bridge.service
   ```

4. Enable and start:
   ```bash
   sudo systemctl enable skylink-bridge
   sudo systemctl start skylink-bridge
   ```

### Database Setup

1. Create Supabase project
2. Run migrations (if any)
3. Configure RLS policies
4. Set up user roles table

### Network Configuration

#### Firewall Rules

- **UDP 5761**: MAVLink gateway (restrict to known IPs)
- **TCP 4000**: API server (HTTPS in production)
- **TCP 443**: HTTPS (production)
- **UDP 8554**: RTSP video (if direct access needed)

#### VPN Setup (Recommended)

Use VPN for secure drone connections:
- WireGuard
- OpenVPN
- Tailscale

---

## Development Guide

### Local Development Setup

1. **Clone repository**:
   ```bash
   git clone <repository-url>
   cd skylink-dispatch
   ```

2. **Install frontend dependencies**:
   ```bash
   npm install
   ```

3. **Install backend dependencies**:
   ```bash
   cd server
   npm install
   cd ..
   ```

4. **Configure environment**:
   - Copy `.env.example` to `.env`
   - Set Supabase credentials
   - Set `VITE_CORE_API_URL=http://localhost:4000`

5. **Start backend**:
   ```bash
   cd server
   npm run dev
   ```

6. **Start frontend**:
   ```bash
   npm run dev
   ```

### Project Structure

```
skylink-dispatch/
├── public/                 # Static assets
│   ├── logo-final.png
│   └── robots.txt
├── server/                 # Backend server
│   ├── src/
│   │   ├── index.ts        # Express server
│   │   ├── mavlinkGateway.ts
│   │   ├── missionStore.ts
│   │   └── types.ts
│   ├── scripts/
│   │   ├── mavproxy_bridge.py
│   │   └── README.md
│   ├── package.json
│   └── tsconfig.json
├── src/                    # Frontend
│   ├── components/         # React components
│   │   ├── ui/            # shadcn/ui components
│   │   ├── VideoStream.tsx
│   │   └── ...
│   ├── contexts/          # React contexts
│   │   └── AuthContext.tsx
│   ├── hooks/             # Custom hooks
│   │   ├── useTelemetry.tsx
│   │   └── useGamepad.ts
│   ├── lib/               # Utilities
│   │   ├── api.ts
│   │   └── config.ts
│   ├── pages/             # Page components
│   │   ├── Index.tsx
│   │   ├── Auth.tsx
│   │   ├── Dashboard.tsx
│   │   └── ...
│   ├── App.tsx
│   └── main.tsx
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### Code Style

- **TypeScript**: Strict mode enabled
- **ESLint**: Configured for React/TypeScript
- **Prettier**: Code formatting
- **Conventions**:
  - PascalCase for components
  - camelCase for functions/variables
  - UPPER_CASE for constants

### Testing

#### Unit Tests

```bash
npm run test
```

#### Integration Tests

```bash
npm run test:integration
```

#### E2E Tests

```bash
npm run test:e2e
```

### Building

#### Frontend

```bash
npm run build
```

Output: `dist/` directory

#### Backend

```bash
cd server
npm run build
```

Output: `server/dist/` directory

---

## Security Architecture

### Authentication

- **Supabase Auth**: JWT-based authentication
- **Role-Based Access**: Client, Operator, Admin roles
- **Session Management**: Secure cookie handling

### Authorization

- **Protected Routes**: React Router guards
- **API Middleware**: JWT verification
- **RLS Policies**: Database-level security

### Data Encryption

- **HTTPS/TLS**: All API communication
- **JWT Tokens**: Signed and encrypted
- **Database**: Encrypted at rest (Supabase)

### Network Security

- **Firewall Rules**: Restrict UDP port access
- **VPN**: Recommended for drone connections
- **Rate Limiting**: API request throttling
- **CORS**: Configured for allowed origins

### Vulnerability Management

- **Dependencies**: Regular updates
- **Security Audits**: `npm audit`
- **Penetration Testing**: Regular assessments
- **Incident Response**: Documented procedures

---

## Performance & Scalability

### Current Limits

- **Concurrent Drones**: 100+ (tested)
- **Telemetry Updates**: 10 Hz per drone
- **API Requests**: 1000 req/min
- **Video Streams**: 10 concurrent (depends on server)

### Optimization Strategies

1. **Telemetry Batching**: Aggregate updates
2. **Video Compression**: H.264/H.265 encoding
3. **CDN**: Static asset delivery
4. **Database Indexing**: Optimize queries
5. **Caching**: Redis for frequent data
6. **Load Balancing**: Multiple server instances

### Monitoring

- **Uptime**: Health check endpoints
- **Latency**: Response time tracking
- **Errors**: Error logging and alerting
- **Resource Usage**: CPU, memory, network

### Scaling

#### Horizontal Scaling

- Multiple API server instances
- Load balancer (nginx, HAProxy)
- Database read replicas

#### Vertical Scaling

- Increase server resources
- Optimize database queries
- Upgrade network bandwidth

---

## Troubleshooting

### Common Issues

#### MAVProxy Bridge Not Connecting

**Symptoms**: No telemetry, drone not appearing

**Solutions**:
1. Check serial port: `ls /dev/ttyUSB*`
2. Verify baud rate matches CubePilot
3. Check network connectivity
4. Verify server address and port
5. Check firewall rules

#### Video Stream Not Loading

**Symptoms**: Black screen, loading forever

**Solutions**:
1. Verify video URL in environment
2. Check RTSP server is running
3. Test stream with VLC player
4. Check codec compatibility
5. Verify network bandwidth

#### Commands Not Executing

**Symptoms**: Commands sent but drone doesn't respond

**Solutions**:
1. Verify drone is connected
2. Check command format
3. Verify MAVLink protocol version
4. Check serial connection
5. Review server logs

#### High Latency

**Symptoms**: Delayed telemetry, laggy video

**Solutions**:
1. Check network latency
2. Use WebRTC instead of RTSP
3. Reduce video quality
4. Optimize network path
5. Check server load

### Debug Mode

Enable verbose logging:

```bash
# Backend
DEBUG=* npm run dev

# MAVProxy Bridge
python3 mavproxy_bridge.py --drone-id drone-001 --verbose
```

### Log Files

- **Backend**: Console output or log file
- **MAVProxy**: Console output or systemd journal
- **Frontend**: Browser console

---

## Appendix

### A. MAVLink Message Reference

Common MAVLink 2.0 messages used:

| Message ID | Name | Purpose |
|------------|------|---------|
| 0 | HEARTBEAT | System status |
| 1 | SYS_STATUS | Battery, sensors |
| 24 | GPS_RAW_INT | GPS coordinates |
| 30 | ATTITUDE | Orientation |
| 32 | LOCAL_POSITION_NED | Local position |
| 33 | GLOBAL_POSITION_INT | Global position |
| 76 | COMMAND_LONG | Execute command |
| 77 | COMMAND_ACK | Command acknowledgment |

### B. Error Codes

| Code | Meaning |
|------|---------|
| 400 | Bad Request |
| 401 | Unauthorized |
| 404 | Not Found |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

### C. Environment Variables Reference

#### Frontend

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_SUPABASE_URL` | Yes | - | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | - | Supabase anonymous key |
| `VITE_CORE_API_URL` | No | `http://localhost:4000` | API server URL |

#### Backend

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `4000` | HTTP server port |
| `MAVLINK_PORT` | No | `5761` | UDP MAVLink port |
| `VIDEO_URL_*` | No | - | Video stream URLs (per drone) |

### D. Hardware Compatibility

#### Flight Controllers

- CubePilot Orange (tested)
- Pixhawk 4 (compatible)
- APM 2.8+ (compatible)

#### Onboard Computers

- Jetson Orion (tested)
- Jetson Nano (compatible)
- Raspberry Pi 4 (compatible with modifications)

#### Cameras

- USB cameras (UVC compatible)
- CSI cameras (Jetson)
- IP cameras (RTSP)

### E. License

Proprietary - All rights reserved

### F. Support

For technical support:
- Email: ops@skylink.com
- Documentation: This file
- Issues: Internal ticketing system

---

**Document Version**: 1.0.0  
**Last Updated**: 2024  
**Maintained By**: SkyLink Development Team

