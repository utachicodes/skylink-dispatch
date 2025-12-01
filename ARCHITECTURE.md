# SkyLink Dispatch - System Architecture

## Overview

SkyLink Dispatch is a multi-tier drone operations platform that connects clients, operators, and drone hardware through a web-based interface with real-time control capabilities.

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER (Web Browser)                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────────┐         ┌──────────────────┐                      │
│  │  Client Portal   │         │ Operator Portal  │                      │
│  │                  │         │                  │                      │
│  │  • Create        │         │  • Accept        │                      │
│  │    Deliveries    │         │    Missions      │                      │
│  │  • Track Status  │         │  • Control Room  │                      │
│  │  • View History  │         │  • Virtual       │                      │
│  │  • Video Call    │         │    Joysticks     │                      │
│  │                  │         │  • Live Map      │                      │
│  └────────┬─────────┘         └────────┬─────────┘                      │
│           │                            │                                │
│           └────────────┬────────────────┘                                │
│                        │                                                 │
│              ┌─────────▼─────────┐                                      │
│              │  React Frontend    │                                      │
│              │  (Vite + TypeScript)│                                     │
│              │                     │                                      │
│              │  • React Router    │                                      │
│              │  • Tailwind CSS    │                                      │
│              │  • shadcn/ui       │                                      │
│              │  • Stream.io SDK    │                                      │
│              │  • Leaflet Maps    │                                      │
│              │  • nipplejs        │                                      │
│              └─────────┬───────────┘                                      │
└────────────────────────┼────────────────────────────────────────────────┘
                         │
                         │ HTTPS/WSS
                         │
┌────────────────────────▼────────────────────────────────────────────────┐
│                    APPLICATION LAYER                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────┐      │
│  │              Supabase (Backend as a Service)                  │      │
│  │                                                               │      │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │      │
│  │  │  PostgreSQL  │  │  Auth API   │  │  Realtime    │      │      │
│  │  │  Database    │  │             │  │  Subscriptions│      │      │
│  │  │              │  │             │              │      │      │
│  │  │ • profiles   │  │ • Email/Pass│  │ • Delivery   │      │      │
│  │  │ • deliveries │  │ • OAuth     │  │   Updates     │      │      │
│  │  │ • user_roles│  │ • JWT Tokens │  │ • Status      │      │      │
│  │  │ • drones     │  │             │  │   Changes     │      │      │
│  │  └──────────────┘  └──────────────┘  └──────────────┘      │      │
│  └──────────────────────────────────────────────────────────────┘      │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────┐      │
│  │              Stream.io (Video Calling Service)                │      │
│  │                                                               │      │
│  │  • WebRTC-based video/audio calls                            │      │
│  │  • Client ↔ Operator communication                           │      │
│  │  • Token-based authentication                                │      │
│  └──────────────────────────────────────────────────────────────┘      │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
                         │
                         │ HTTP/WebSocket
                         │
┌────────────────────────▼────────────────────────────────────────────────┐
│                      JETSON SERVER LAYER                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────┐      │
│  │         Python Server (aiohttp + WebSocket)                    │      │
│  │         Port: 5000                                              │      │
│  │                                                                 │      │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │      │
│  │  │   WebSocket  │  │   HTTP API   │  │  Video Feed  │      │      │
│  │  │   /ws/control│  │              │  │  /video_feed │      │      │
│  │  │              │  │ • /api/admin│  │              │      │      │
│  │  │ • Real-time  │  │ • /api/toggle│  │ • MJPEG      │      │      │
│  │  │   commands   │  │ • /offer     │  │   Stream     │      │      │
│  │  │ • Telemetry  │  │              │  │ • WebRTC     │      │      │
│  │  │   updates    │  │              │  │   (optional) │      │      │
│  │  └──────┬───────┘  └──────────────┘  └──────────────┘      │      │
│  │         │                                                      │      │
│  │  ┌──────▼──────────────────────────────────────────────┐      │      │
│  │  │         Drone Controller (pymavlink)               │      │      │
│  │  │                                                    │      │      │
│  │  │  • MAVLink Protocol                                │      │      │
│  │  │  • ARM/DISARM commands                            │      │      │
│  │  │  • Joystick input (roll, pitch, yaw, throttle)    │      │      │
│  │  │  • Telemetry reading (battery, altitude, GPS)     │      │      │
│  │  │  • Safety locks & emergency controls               │      │      │
│  │  └──────┬─────────────────────────────────────────────┘      │      │
│  │         │                                                      │      │
│  │  ┌──────▼──────────────────────────────────────────────┐      │      │
│  │  │         AI Processing (YOLO + RealSense)           │      │      │
│  │  │                                                    │      │      │
│  │  │  • Object Detection (YOLO model)                  │      │      │
│  │  │  • Depth Sensing (Intel RealSense)                 │      │      │
│  │  │  • View Modes (normal/heatmap)                     │      │      │
│  │  │  • AI Toggle on/off                                │      │      │
│  │  └────────────────────────────────────────────────────┘      │      │
│  └──────────────────────────────────────────────────────────────┘      │
│                                                                           │
└────────────────────────┬─────────────────────────────────────────────────┘
                         │
                         │ Serial/USB (MAVLink)
                         │
┌────────────────────────▼────────────────────────────────────────────────┐
│                      HARDWARE LAYER                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────────┐         ┌──────────────────┐                     │
│  │  Flight Controller│         │  Jetson Orion     │                     │
│  │  (CubePilot/Pixhawk)│       │  (Onboard Computer)│                    │
│  │                  │         │                  │                     │
│  │  • MAVLink       │◄────────┤  • Python Server │                     │
│  │    Protocol      │  Serial  │  • AI Processing │                     │
│  │  • Motor Control │         │  • Video Capture │                     │
│  │  • GPS/IMU       │         │  • 4G/5G Modem   │                     │
│  │  • Telemetry     │         │                  │                     │
│  └──────────────────┘         └──────────────────┘                     │
│                                                                           │
│  ┌──────────────────┐         ┌──────────────────┐                     │
│  │  Intel RealSense │         │  Camera Module   │                     │
│  │  Depth Camera    │         │  (RGB Video)     │                     │
│  │                  │         │                  │                     │
│  │  • Depth Data    │         │  • Live Feed     │                     │
│  │  • RGB Stream    │         │  • MJPEG/WebRTC  │                     │
│  └──────────────────┘         └──────────────────┘                     │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Authentication Flow
```
User → React App → Supabase Auth API → JWT Token → Stored in Context
```

### 2. Mission Creation Flow
```
Client → React App → Supabase Database → Delivery Record Created
                ↓
         Realtime Subscription → Operator Dashboard (New Mission Alert)
```

### 3. Mission Acceptance Flow
```
Operator → React App → Supabase Database → Update delivery.operator_id
                ↓
         Navigate to Pilot Control Room → Connect to Jetson Server
```

### 4. Real-Time Control Flow
```
Operator Joystick Input → React App → WebSocket → Jetson Server
                                                      ↓
                                              MAVLink → Flight Controller
                                                      ↓
                                              Telemetry ← Flight Controller
                                                      ↓
                                              WebSocket → React App (Display)
```

### 5. Video Streaming Flow
```
RealSense Camera → Jetson Server → MJPEG Stream (/video_feed)
                                            ↓
                                    React App (<img> tag)
                                    
Alternative:
RealSense Camera → Jetson Server → WebRTC Offer → React App
                                                      ↓
                                              RTCPeerConnection → Video Display
```

### 6. Video Call Flow (Client ↔ Operator)
```
Client → React App → Stream.io SDK → Generate Token → Join Call
                                                          ↓
Operator → React App → Stream.io SDK → Generate Token → Join Call
                                                          ↓
                                              WebRTC Connection Established
```

## Component Architecture

### Frontend Components

```
src/
├── pages/
│   ├── Index.tsx              # Landing page
│   ├── Auth.tsx               # Login/Signup
│   ├── RoleSelection.tsx      # Role selection after auth
│   ├── Dashboard.tsx          # Client dashboard
│   ├── EnhancedOperatorDashboard.tsx  # Operator dashboard
│   ├── PilotControl.tsx       # Real-time drone control interface
│   ├── CreateDelivery.tsx    # Delivery creation form
│   ├── TrackDelivery.tsx      # Delivery tracking
│   └── History.tsx            # Delivery history
│
├── components/
│   ├── VideoCall.tsx          # Stream.io video call component
│   ├── LiveMap.tsx            # Leaflet map with drone markers
│   ├── DeliveryLocationMap.tsx  # Map for delivery locations
│   └── ui/                    # shadcn/ui components
│
├── lib/
│   ├── jetsonApi.ts           # Jetson server integration
│   ├── deliveryService.ts     # Supabase delivery operations
│   ├── config.ts              # API configuration
│   └── api.ts                 # Core API client
│
├── contexts/
│   └── AuthContext.tsx        # Authentication state management
│
└── hooks/
    ├── useDeliveries.ts       # Delivery data fetching
    └── useTelemetry.tsx       # Telemetry streaming (legacy)
```

### Backend Services

```
Jetson Server (Python)
├── drone_control_V2.py
│   ├── DroneController        # MAVLink communication
│   ├── VideoStream            # MJPEG/WebRTC streaming
│   ├── AIProcessor            # YOLO object detection
│   ├── SystemGuard            # Safety locks
│   └── WebSocket Handler      # Real-time commands
│
Supabase
├── PostgreSQL Database
│   ├── profiles               # User profiles
│   ├── user_roles             # Role assignments
│   ├── deliveries             # Mission/delivery records
│   └── drones                 # Drone inventory
│
├── Auth Service
│   ├── Email/Password auth
│   ├── JWT token generation
│   └── Row Level Security (RLS)
│
└── Realtime Subscriptions
    └── Delivery status updates
```

## Communication Protocols

### HTTP REST API
- **Supabase**: `https://[project].supabase.co/rest/v1/`
- **Jetson**: `http://[jetson-ip]:5000/api/*`

### WebSocket
- **Jetson Control**: `ws://[jetson-ip]:5000/ws/control`
  - Bidirectional: Commands → Server, Telemetry ← Server
  - Protocol: JSON messages
  - Reconnection: Automatic with exponential backoff

### Video Streaming
- **MJPEG**: `http://[jetson-ip]:5000/video_feed`
  - Format: Motion JPEG stream
  - Latency: ~100-200ms
  - Usage: Primary video feed in React `<img>` tag

- **WebRTC** (Optional): `http://[jetson-ip]:5000/offer`
  - Format: Real-time peer connection
  - Latency: ~50-100ms
  - Usage: Low-latency alternative (if available)

### Video Calling
- **Stream.io**: `wss://[stream-endpoint]`
  - Protocol: WebRTC via Stream.io infrastructure
  - Usage: Client ↔ Operator communication
  - Authentication: JWT tokens generated client-side

## Security Architecture

### Authentication & Authorization
```
User → Supabase Auth → JWT Token → Row Level Security (RLS)
                                    ↓
                            Database Access Control
```

### Jetson Server Security
- **Admin Token**: `admin_secret_999` (for admin controls)
- **Pilot Token**: `pilot_access_123` (for operator access)
- **SystemGuard**: Software killswitch and control locks
- **CORS**: Enabled for cross-origin requests

### Data Protection
- **Supabase RLS**: Row-level security policies
- **JWT Tokens**: Secure, time-limited authentication
- **HTTPS/WSS**: Encrypted communication (production)

## Deployment Architecture

### Frontend Deployment
```
GitHub Repository
    ↓
Vercel (Automatic Deploy)
    ↓
CDN Distribution
    ↓
User Browsers
```

### Backend Services
```
Supabase Cloud
├── PostgreSQL (Managed)
├── Auth Service (Managed)
└── Realtime (Managed)

Stream.io Cloud
└── Video Calling Infrastructure

Jetson Server (On-Premise)
├── Python Server (Port 5000)
├── MAVLink Bridge
└── AI Processing
```

## Real-Time Features

1. **Telemetry Updates**: WebSocket → React state → UI updates (~30fps)
2. **Joystick Commands**: Touch/Mouse → WebSocket → Jetson → MAVLink (~30fps)
3. **Delivery Status**: Supabase Realtime → React state → UI updates
4. **Video Stream**: MJPEG stream → React `<img>` tag (continuous)
5. **Video Call**: Stream.io WebRTC → Bidirectional audio/video

## Scalability Considerations

- **Frontend**: Stateless React app, scales with CDN
- **Supabase**: Managed scaling (PostgreSQL + Auth)
- **Jetson Server**: Single instance per drone (can run multiple)
- **Stream.io**: Managed infrastructure, auto-scaling
- **WebSocket**: Single connection per operator session

## Technology Stack Summary

| Layer | Technology |
|-------|-----------|
| Frontend Framework | React 18 + TypeScript |
| Build Tool | Vite 5 |
| UI Components | shadcn/ui + Tailwind CSS |
| Routing | React Router DOM 6 |
| State Management | React Context + TanStack Query |
| Database | Supabase (PostgreSQL) |
| Authentication | Supabase Auth |
| Video Calling | Stream.io React SDK |
| Maps | Leaflet.js |
| Joysticks | nipplejs |
| Backend (Jetson) | Python 3 + aiohttp |
| Drone Protocol | MAVLink (pymavlink) |
| AI Processing | YOLO (Ultralytics) |
| Video Capture | Intel RealSense (pyrealsense2) |
| Deployment | Vercel (Frontend) + On-Premise (Jetson) |

