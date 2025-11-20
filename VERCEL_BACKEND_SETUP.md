# Vercel Backend Setup Guide

This project uses Vercel Serverless Functions for the backend API. All API routes are located in the `/api` directory and automatically deploy with your frontend.

## Environment Variables

Set these in your Vercel project settings (Settings → Environment Variables):

### Required
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (bypasses RLS)
- `VITE_SUPABASE_URL` - Same as SUPABASE_URL (for frontend)
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anon/public key (for frontend)

### Optional
- `WEBRTC_SIGNALING_URL` - WebRTC signaling server URL (if using WebRTC video streaming)
- `VITE_CORE_API_URL` - Override API base URL (leave empty to use same domain)

## API Endpoints

All endpoints are prefixed with `/api`:

### Missions
- `GET /api/missions` - List all missions/deliveries
- `POST /api/missions` - Create a new mission (requires auth)
- `GET /api/missions/active` - List active missions
- `POST /api/missions/[id]/assign` - Assign operator to mission (requires operator role)
- `POST /api/missions/[id]/status` - Update mission status (requires auth)

### Telemetry
- `GET /api/telemetry/latest` - Get latest telemetry for all drones
- `GET /api/telemetry/stream` - Server-Sent Events stream for real-time telemetry

### Commands
- `POST /api/commands` - Send command to drone (requires auth)

### Video
- `GET /api/video/stream/[droneId]` - Get video stream URL for drone (requires auth)
- `GET /api/video/webrtc/[droneId]` - Get WebRTC connection info (requires auth)

### Health
- `GET /api/health` - Health check endpoint
- `GET /api` - API info endpoint

## Authentication

Most endpoints require authentication via Bearer token in the Authorization header:

```
Authorization: Bearer <supabase-session-token>
```

The frontend automatically includes this token when making API calls.

## Deployment

1. **Connect your repository to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub/GitLab repository
   - Vercel will auto-detect the project settings

2. **Set environment variables**
   - In Vercel dashboard, go to Settings → Environment Variables
   - Add all required variables listed above
   - Make sure to add them for Production, Preview, and Development environments

3. **Deploy**
   - Push to your main branch or create a pull request
   - Vercel will automatically build and deploy
   - API routes will be available at `https://your-domain.vercel.app/api/*`

## Local Development

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   Create a `.env.local` file (not committed to git):
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

3. **Run development server**
   ```bash
   npm run dev
   ```

4. **Test API routes locally**
   - API routes are available at `http://localhost:5173/api/*`
   - Use Vercel CLI for better local testing: `vercel dev`

## Database Integration

All API routes use Supabase for data persistence:
- **Missions** are stored in the `deliveries` table
- **Telemetry** is stored in the `drone_tracking` table
- **Commands** are logged in the `logs` table
- **User roles** are checked from the `user_roles` table

## Notes

- Serverless functions have a 30-second timeout (configured in `vercel.json`)
- All API routes handle CORS automatically
- Authentication is handled via Supabase JWT tokens
- The service role key bypasses Row Level Security (RLS) for server-side operations
- Frontend uses anon key which respects RLS policies

## Troubleshooting

### API routes return 500 errors
- Check that environment variables are set correctly in Vercel
- Verify Supabase credentials are valid
- Check Vercel function logs in the dashboard

### Authentication fails
- Ensure the Authorization header includes a valid Supabase session token
- Verify the token hasn't expired
- Check that user exists in Supabase auth

### CORS errors
- CORS is configured in `vercel.json`
- Ensure frontend is making requests to the correct domain
- Check browser console for specific CORS error messages

