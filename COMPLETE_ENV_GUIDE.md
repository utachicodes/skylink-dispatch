# Complete Environment Variables Guide

## Required Variables (Must Have)

### 1. Supabase Configuration

**For Frontend (Browser):**
```env
# Option 1: Use Project ID (recommended)
VITE_SUPABASE_PROJECT_ID=adwmeolvnjfthjdepxjz

# Option 2: Use full URL (alternative)
# VITE_SUPABASE_URL=https://adwmeolvnjfthjdepxjz.supabase.co

# Supabase Anon/Public Key (required)
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
# Alternative name (also works):
# VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key_here
```

**For Backend API (Serverless Functions):**
```env
# Optional: If you need service role key for admin operations
# SUPABASE_URL=https://adwmeolvnjfthjdepxjz.supabase.co
# SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Where to get:** https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api

---

### 2. Jetson Server Configuration

**For Frontend:**
```env
VITE_CORE_API_URL=http://172.24.237.66:5000
```

**For Backend (Optional - has defaults):**
```env
# Optional: Override Jetson IP/Port separately
JETSON_IP=172.24.237.66
JETSON_PORT=5000
```

**Your Jetson IP and port** where the Python drone control script is running.

---

### 3. Stream.io Video Calling

**For Frontend (Browser):**
```env
VITE_STREAM_API_KEY=dtmzardkkj5a
```

**For Backend (Token Generation):**
```env
STREAM_API_KEY=dtmzardkkj5a
STREAM_API_SECRET=vdtjtpexyyrkdt2h6azezqhkfs4m7jpg8acdnj4cjwyh2aszr28hsrvmc7znkgjk
```

**Where to get:** https://getstream.io/dashboard (sign up for free account)

---

## Optional Variables

### 4. Video Streaming (Per-Drone)

```env
# Per-drone video stream URLs
# Format: VIDEO_URL_<drone-id>
VIDEO_URL_drone-001=http://172.24.237.66:5000/video_feed
VIDEO_URL_drone-002=http://172.24.237.66:5000/video_feed
# ... add more as needed
```

**Note:** If not set, defaults to `http://JETSON_IP:JETSON_PORT/video_feed`

---

### 5. Jetson Admin Controls (Optional)

```env
# Admin token for Jetson security controls
# Must match ADMIN_TOKEN in your Jetson Python script
JETSON_ADMIN_TOKEN=admin_secret_999
```

---

## Complete .env.local Template

Copy this into your `.env.local` file:

```env
# ==========================================
# SUPABASE (REQUIRED)
# ==========================================
# Get from: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api

# Option 1: Use Project ID (recommended)
VITE_SUPABASE_PROJECT_ID=adwmeolvnjfthjdepxjz

# Option 2: Use full URL (alternative)
# VITE_SUPABASE_URL=https://adwmeolvnjfthjdepxjz.supabase.co

# Supabase Anon/Public Key (required)
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Optional: Service Role Key (for admin operations in API)
# SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# ==========================================
# JETSON SERVER (REQUIRED)
# ==========================================
# Your Jetson server running the Python drone control script

VITE_CORE_API_URL=http://172.24.237.66:5000

# Optional: Override Jetson IP/Port separately
# JETSON_IP=172.24.237.66
# JETSON_PORT=5000

# ==========================================
# STREAM.IO VIDEO CALLING (REQUIRED)
# ==========================================
# Get from: https://getstream.io/dashboard

# Frontend API Key (public, safe to expose)
VITE_STREAM_API_KEY=dtmzardkkj5a

# Backend API Key and Secret (for token generation)
STREAM_API_KEY=dtmzardkkj5a
STREAM_API_SECRET=vdtjtpexyyrkdt2h6azezqhkfs4m7jpg8acdnj4cjwyh2aszr28hsrvmc7znkgjk

# ==========================================
# VIDEO STREAMING (OPTIONAL)
# ==========================================
# Per-drone video stream URLs
# If not set, defaults to Jetson MJPEG feed

VIDEO_URL_drone-001=http://172.24.237.66:5000/video_feed
# VIDEO_URL_drone-002=http://172.24.237.66:5000/video_feed
# ... add more drones as needed

# ==========================================
# JETSON ADMIN CONTROLS (OPTIONAL)
# ==========================================
# Admin token for Jetson security controls
# Must match ADMIN_TOKEN in your Jetson Python script

# JETSON_ADMIN_TOKEN=admin_secret_999
```

---

## Variable Categories

### Frontend Variables (VITE_*)
These are exposed to the browser. **Never put secrets here!**

- `VITE_SUPABASE_PROJECT_ID` or `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` or `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_CORE_API_URL`
- `VITE_STREAM_API_KEY`

### Backend Variables (No VITE_ prefix)
These are only available in serverless functions (API routes).

- `STREAM_API_KEY`
- `STREAM_API_SECRET` ⚠️ **SECRET - Never expose!**
- `JETSON_IP` (optional, has default)
- `JETSON_PORT` (optional, has default)
- `VIDEO_URL_*` (optional, per-drone)
- `JETSON_ADMIN_TOKEN` (optional)
- `SUPABASE_SERVICE_ROLE_KEY` (optional, for admin operations)

---

## For Production (Vercel)

Add all these variables in:
**Vercel Dashboard → Your Project → Settings → Environment Variables**

**Important Notes:**
- ✅ `VITE_*` variables are automatically exposed to the browser
- ❌ Never put secrets in `VITE_*` variables
- 🔒 `STREAM_API_SECRET` should only be in backend environment variables
- 🔒 `SUPABASE_SERVICE_ROLE_KEY` should only be in backend environment variables

---

## Quick Checklist

- [ ] `VITE_SUPABASE_PROJECT_ID` or `VITE_SUPABASE_URL`
- [ ] `VITE_SUPABASE_ANON_KEY`
- [ ] `VITE_CORE_API_URL`
- [ ] `VITE_STREAM_API_KEY`
- [ ] `STREAM_API_KEY`
- [ ] `STREAM_API_SECRET`
- [ ] `VIDEO_URL_drone-001` (optional)
- [ ] `JETSON_IP` (optional, has default)
- [ ] `JETSON_PORT` (optional, has default)

---

## Testing Your Setup

After setting up `.env.local`, restart your dev server:

```bash
vercel dev
# or
npm run dev
```

Check the console for any missing variable warnings.


