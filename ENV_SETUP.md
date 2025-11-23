# Environment Variables Setup

## Quick Start

1. Copy the example file:
   ```bash
   cp .env.local.example .env.local
   ```

2. Fill in your values (see below)

3. Restart your dev server

## Required Variables

### Supabase (Authentication & Database)

```env
# Option 1: Use Project ID (recommended)
VITE_SUPABASE_PROJECT_ID=adwmeolvnjfthjdepxjz

# Option 2: Use full URL (alternative)
# VITE_SUPABASE_URL=https://adwmeolvnjfthjdepxjz.supabase.co

# Supabase Anon/Public Key
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

**Get these from:** https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api

### Jetson Server (Drone Control)

```env
VITE_CORE_API_URL=http://172.24.237.66:5000
```

**Your Jetson IP and port** where the Python drone control script is running.

### Stream.io (Video Calling)

```env
# Frontend API Key (public)
VITE_STREAM_API_KEY=dtmzardkkj5a

# Backend API Key and Secret (for token generation)
STREAM_API_KEY=dtmzardkkj5a
STREAM_API_SECRET=vdtjtpexyyrkdt2h6azezqhkfs4m7jpg8acdnj4cjwyh2aszr28hsrvmc7znkgjk
```

**Get these from:** https://getstream.io/dashboard (sign up for free account)

### Optional: Video Streaming

```env
# Per-drone video URLs (defaults to Jetson MJPEG feed if not set)
VIDEO_URL_drone-001=http://172.24.237.66:5000/video_feed
```

## Complete .env.local Template

```env
# ==========================================
# SUPABASE
# ==========================================
VITE_SUPABASE_PROJECT_ID=adwmeolvnjfthjdepxjz
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# ==========================================
# JETSON SERVER
# ==========================================
VITE_CORE_API_URL=http://172.24.237.66:5000

# ==========================================
# STREAM.IO VIDEO CALLING
# ==========================================
VITE_STREAM_API_KEY=dtmzardkkj5a
STREAM_API_KEY=dtmzardkkj5a
STREAM_API_SECRET=vdtjtpexyyrkdt2h6azezqhkfs4m7jpg8acdnj4cjwyh2aszr28hsrvmc7znkgjk

# ==========================================
# VIDEO STREAMING (Optional)
# ==========================================
VIDEO_URL_drone-001=http://172.24.237.66:5000/video_feed
```

## For Production (Vercel)

Add all these variables in:
**Vercel Dashboard → Your Project → Settings → Environment Variables**

**Important:** 
- `VITE_*` variables are exposed to the browser
- Never put secrets in `VITE_*` variables
- `STREAM_API_SECRET` should only be in backend environment variables


