# Vercel Deployment Guide

This guide will help you deploy the entire SkyLink platform (frontend + backend) to Vercel in one deployment.

## Overview

With this setup, everything runs on Vercel:
- **Frontend**: React app (static files)
- **Backend API**: Serverless functions in `/api` directory
- **Single Deployment**: One push to GitHub = everything deploys

## Prerequisites

- GitHub account
- Vercel account (free tier works)
- Supabase account (for database and auth)

## Step 1: Prepare Your Repository

1. Make sure all changes are committed and pushed to GitHub
2. The project structure should have:
   - `/api` directory with serverless functions
   - `/src` directory with React frontend
   - `vercel.json` configuration file
   - `package.json` with build scripts

## Step 2: Deploy to Vercel

### 2.1 Connect Repository

1. Go to [vercel.com](https://vercel.com)
2. Sign up or log in
3. Click **"Add New Project"**
4. Import your GitHub repository (`skylink-dispatch`)
5. Vercel will auto-detect it's a Vite project

### 2.2 Configure Project Settings

Vercel should auto-detect:
- **Framework Preset**: Vite
- **Root Directory**: `./` (root)
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### 2.3 Set Environment Variables

Go to **Settings** → **Environment Variables** and add:

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Note**: You don't need `VITE_CORE_API_URL` anymore - API routes are on the same domain!

### 2.4 Deploy

1. Click **"Deploy"**
2. Wait for build to complete (2-3 minutes)
3. Your app will be live at `https://your-project.vercel.app`

## Step 3: Verify Deployment

### 3.1 Test Frontend

1. Visit your Vercel URL
2. Should see the SkyLink landing page
3. Try logging in/signing up

### 3.2 Test API Endpoints

Open these URLs in your browser:

- `https://your-project.vercel.app/api/` - Service info
- `https://your-project.vercel.app/api/health` - Health check
- `https://your-project.vercel.app/api/missions` - List missions (should return `[]`)

### 3.3 Test Frontend API Calls

1. Open browser DevTools → Console
2. Navigate to `/operator` or `/admin` dashboard
3. Should not see any 404 errors
4. API calls should work seamlessly

## How It Works

### API Routes

All API routes are in the `/api` directory:
- `/api/missions` → `api/missions/index.ts`
- `/api/missions/active` → `api/missions/active.ts`
- `/api/missions/[id]/assign` → `api/missions/[id]/assign.ts`
- `/api/telemetry/latest` → `api/telemetry/latest.ts`
- etc.

### Frontend API Calls

The frontend uses relative URLs:
- Development: `http://localhost:5173/api/missions`
- Production: `https://your-project.vercel.app/api/missions`

No need for separate backend URL!

## Important Notes

### Mission Store (In-Memory)

⚠️ **The mission store is currently in-memory and won't persist across serverless function invocations.**

For production, you should:
1. Use Supabase to store missions in the database
2. Update API routes to read/write from Supabase instead of in-memory store
3. This ensures data persists and works across all function invocations

### Cold Starts

Serverless functions have cold starts (first request may be slower). This is normal and subsequent requests are fast.

### Function Timeout

Vercel free tier: 10 seconds per function
Vercel Pro: 60 seconds per function

For long-running operations (like SSE streams), consider:
- Using Supabase Realtime instead
- Or upgrading to Vercel Pro

## Troubleshooting

### API Routes Return 404

- Check that files are in `/api` directory
- Verify file names match route paths
- Check Vercel deployment logs

### Frontend Can't Connect to API

- Verify API routes are deployed (check Vercel Functions tab)
- Check browser console for errors
- Ensure `CORE_API_URL` is empty string (uses relative paths)

### Build Fails

- Check Vercel build logs
- Ensure all dependencies are in `package.json`
- Verify TypeScript compiles: `npm run build`

### Mission Data Not Persisting

- This is expected with in-memory store
- Migrate to Supabase for persistence (see Important Notes above)

## Next Steps

1. **Add Supabase Integration**: Update API routes to use Supabase instead of in-memory store
2. **Add Authentication**: Protect API routes with Supabase auth
3. **Add Rate Limiting**: Use Vercel Edge Middleware for rate limiting
4. **Monitor**: Use Vercel Analytics to monitor performance

## Cost

Vercel pricing:
- **Free tier**: 100GB bandwidth, unlimited deployments
- **Pro**: $20/month - 1TB bandwidth, better performance
- **Enterprise**: Custom pricing

For most projects, free tier is sufficient!

## Support

- Vercel Docs: https://vercel.com/docs
- Vercel Discord: https://vercel.com/discord
- Check Vercel status: https://www.vercel-status.com

