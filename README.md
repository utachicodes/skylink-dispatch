# SkyLink Dispatch Platform

<div align="center">
  <img src="public/logo-final.png" alt="SkyLink Logo" width="200" />
  
  <p><strong>Multi-sector drone dispatch platform for emergency services, delivery networks, and remote operations</strong></p>
  
  [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB)](https://reactjs.org/)
  [![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
  [![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
  [![License](https://img.shields.io/badge/License-Proprietary-red?style=flat-square)](LICENSE)
</div>

---

## Overview

SkyLink is a comprehensive drone dispatch platform designed to facilitate critical operations in challenging environments. Based in **Senegal**, the platform serves multiple sectors including emergency services, delivery companies, restaurants, and law enforcement agencies. SkyLink creates new economic opportunities by enabling operators worldwide to become certified drone pilots without requiring advanced education, providing a sustainable income source through semi-autonomous mission execution.

### Key Features

- **Dual-Mode Interface**: Separate client and operator dashboards for mission creation and execution
- **Real-Time Telemetry**: Live drone tracking with battery, location, speed, and signal quality monitoring
- **Semi-Autonomous Control**: Operator-assisted flight with virtual joystick controls and emergency overrides
- **Multi-Sector Support**: Designed for police facial recognition, firefighter operations, medical deliveries, and commercial logistics
- **Mission Management**: Complete lifecycle tracking from request to completion with operator earnings tracking

## Architecture

SkyLink follows a three-tier architecture:

### Step 1: Field Client (Drone Hardware)
- **CubePilot Orange**: Flight controller
- **Jetson Orion**: Onboard computer
- **4G/5G Connectivity**: Internet connection via mobile network
- **MAVProxy Bridge**: Lightweight script connecting CubePilot to central server

### Step 2: Backend API (Vercel Serverless Functions)
- **Location**: Vercel Serverless Functions (same deployment as frontend)
- **REST API**: Mission management endpoints
- **Event Streaming**: Server-Sent Events (SSE) for real-time updates
- **Database**: Supabase PostgreSQL for persistent storage
- **Note**: All backend logic runs as serverless functions, no separate server needed

### Step 3: Client Application (Web/Mobile)
- **Client Dashboard**: Request deliveries, track missions, view history
- **Operator Dashboard**: Accept missions, view available jobs, monitor earnings
- **Pilot Control Room**: Real-time telemetry, virtual joysticks, emergency controls
- **WebSocket/SSE Integration**: Live updates without polling

## Technology Stack

### Frontend
- **Vite**: Build tool and development server
- **React 18**: UI framework with TypeScript
- **shadcn/ui**: Component library
- **Tailwind CSS**: Utility-first styling
- **React Router**: Client-side routing
- **Supabase**: Authentication and user management
- **Sonner**: Toast notifications

### Backend
- **Node.js**: Runtime environment
- **Express**: Web framework
- **TypeScript**: Type-safe development
- **tsx**: ES module execution for development
- **CORS**: Cross-origin resource sharing
- **dotenv**: Environment configuration

### Deployment
- **Frontend**: Vercel (automatic deployments from GitHub)
- **Backend API**: Vercel Serverless Functions (same deployment)
- **Database**: Supabase (PostgreSQL with RLS)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Git
- Supabase account (for authentication)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd skylink-dispatch
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

2. **Configure environment variables**
   
   See `ENV_SETUP.md` for complete environment variable setup guide.
   
   Create a `.env.local` file in the root directory with:
   ```env
   # Supabase
   VITE_SUPABASE_PROJECT_ID=your_project_id
   VITE_SUPABASE_ANON_KEY=your_anon_key
   
   # Jetson Server
   VITE_CORE_API_URL=http://172.24.237.66:5000
   
   # Stream.io Video Calling
   VITE_STREAM_API_KEY=your_stream_api_key
   STREAM_API_KEY=your_stream_api_key
   STREAM_API_SECRET=your_stream_api_secret
   ```
   
   **Note**: For local development, API routes will be available at `/api/*` when using `vercel dev`

### Running the Application

#### Development Mode

**Option 1: Using Vite (Frontend only, API routes won't work)**
```bash
npm run dev
```
Application will start on `http://localhost:5173`

**Option 2: Using Vercel CLI (Recommended - Full stack)**
```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Run development server
vercel dev
```
This will start both frontend and API routes on `http://localhost:3000`

#### Production Build

```bash
npm run build
```
The build output in `dist/` can be deployed to Vercel, which will automatically handle API routes.

## Project Structure

```
skylink-dispatch/
├── api/                         # Vercel Serverless Functions (Backend API)
│   ├── _supabase.ts            # Supabase helper utilities
│   ├── missions/               # Mission management endpoints
│   ├── telemetry/              # Telemetry endpoints
│   ├── commands.ts             # Drone command endpoints
│   └── video/                  # Video streaming endpoints
├── public/
│   ├── logo-final.png          # Main logo asset
│   └── robots.txt
├── src/
│   ├── components/             # React components
│   │   ├── ui/                # shadcn/ui components
│   │   ├── BottomNav.tsx
│   │   └── ProtectedRoute.tsx
│   ├── contexts/
│   │   └── AuthContext.tsx    # Authentication state
│   ├── hooks/
│   │   ├── useTelemetry.tsx   # Telemetry streaming hook
│   │   └── useGamepad.ts      # Gamepad/joystick support
│   ├── integrations/
│   │   └── supabase/          # Supabase client
│   ├── lib/
│   │   ├── api.ts             # Core API client
│   │   └── config.ts          # Configuration
│   ├── pages/
│   │   ├── Index.tsx          # Landing page
│   │   ├── Auth.tsx           # Login/signup
│   │   ├── Dashboard.tsx      # Dual-mode dashboard
│   │   ├── CreateDelivery.tsx # Client delivery request
│   │   ├── OperatorDashboard.tsx
│   │   ├── PilotControl.tsx   # Operator control room
│   │   └── ...
│   ├── App.tsx
│   └── main.tsx
├── index.html
├── package.json
└── README.md
```

## API Endpoints

All endpoints are available at `/api/*` when deployed to Vercel.

### Missions
- `GET /api/missions` - List all missions/deliveries
- `POST /api/missions` - Create new mission (requires auth)
- `GET /api/missions/active` - List active missions
- `POST /api/missions/[id]/assign` - Assign mission to operator (requires operator role)
- `POST /api/missions/[id]/status` - Update mission status (requires auth)

### Telemetry
- `GET /api/telemetry/latest` - Get latest telemetry for all drones
- `GET /api/telemetry/stream` - SSE stream of real-time telemetry

### Commands
- `POST /api/commands` - Send command to drone (requires auth)

### Video
- `GET /api/video/stream/[droneId]` - Get video stream URL (requires auth)
- `GET /api/video/webrtc/[droneId]` - Get WebRTC connection info (requires auth)

### Health
- `GET /api/health` - Health check
- `GET /api` - API info

**Note**: See [VERCEL_BACKEND_SETUP.md](./VERCEL_BACKEND_SETUP.md) for detailed API documentation.

## Testing

### Local Development
Use Vercel CLI for full-stack development:
```bash
vercel dev
```

### Testing API Endpoints
```bash
# Health check
curl http://localhost:3000/api/health

# List missions (requires auth token)
curl http://localhost:3000/api/missions \
  -H "Authorization: Bearer YOUR_SUPABASE_TOKEN"
```

## Deployment

### Deploy to Vercel (Everything in One Place)

**Everything runs on Vercel - no separate backend server needed!**

1. **Connect Repository to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub/GitLab repository
   - Vercel will auto-detect the project

2. **Set Environment Variables**
   In Vercel dashboard → Settings → Environment Variables:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

3. **Deploy**
   - Push to main branch → Vercel auto-deploys
   - API routes available at `https://your-domain.vercel.app/api/*`
   - Frontend at `https://your-domain.vercel.app`

**That's it!** No separate backend hosting needed. See [VERCEL_BACKEND_SETUP.md](./VERCEL_BACKEND_SETUP.md) for detailed setup instructions.

## Contributing

This is a proprietary platform. For contribution guidelines, please contact the development team.

## License

Proprietary - All rights reserved

## Support

For technical support or inquiries:
- Base of Operations: Senegal
- Platform: Multi-sector drone dispatch
- Focus: Emergency services, delivery, and remote operations

---

<div align="center">
  <p>Built with precision for critical operations worldwide</p>
  <p><strong>SkyLink Dispatch Platform</strong></p>
</div>
