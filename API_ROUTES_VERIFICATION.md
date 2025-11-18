# API Routes Verification

This document verifies that all API routes exist and match frontend calls.

## Frontend API Calls (from src/lib/api.ts)

✅ `/api/missions` - GET/POST → `api/missions/index.ts`
✅ `/api/missions/active` - GET → `api/missions/active.ts`
✅ `/api/missions/:id/assign` - POST → `api/missions/[id]/assign.ts`
✅ `/api/missions/:id/status` - POST → `api/missions/[id]/status.ts`
✅ `/api/telemetry/latest` - GET → `api/telemetry/latest.ts`
✅ `/api/telemetry/stream` - GET → `api/telemetry/stream.ts`
✅ `/api/commands` - POST → `api/commands.ts`
✅ `/api/video/stream/:droneId` - GET → `api/video/stream/[droneId].ts`
✅ `/api/video/webrtc/:droneId` - GET → `api/video/webrtc/[droneId].ts`

## Additional Routes

✅ `/api/` - GET → `api/index.ts` (service info)
✅ `/api/health` - GET → `api/health.ts` (health check)

## Frontend Config

- `CORE_API_URL` defaults to `""` (empty string)
- This means API calls use relative paths: `/api/missions`
- When deployed on Vercel: `https://your-app.vercel.app/api/missions`
- In development: `http://localhost:5173/api/missions` (but API routes won't work in dev without Vercel CLI)

## Error Handling

All API calls go through `safeFetch` in `src/lib/api.ts` which:
- Handles 404s gracefully (returns empty arrays)
- Handles network errors gracefully
- Logs warnings instead of breaking pages
- Has 10-second timeout

## Verification Checklist

- [x] All API routes exist in `/api` directory
- [x] Frontend uses relative paths (CORE_API_URL = "")
- [x] Error handling prevents 404s from breaking pages
- [x] Vercel configuration is correct
- [x] @vercel/node is installed

## Testing After Deployment

1. Visit `https://your-app.vercel.app/api/health` - should return `{"status":"ok"}`
2. Visit `https://your-app.vercel.app/api/missions` - should return `[]`
3. Open browser console on frontend - should see no 404 errors
4. Navigate to `/operator` - should load without errors
5. Navigate to `/admin` - should load without errors

