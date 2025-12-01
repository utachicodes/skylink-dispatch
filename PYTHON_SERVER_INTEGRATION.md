# Python Server Integration - Frontend Updates

## Summary
The frontend has been updated to match the Python server's API (`drone_control_V2.py`). The Python server uses `aiohttp` (not Flask) and has a specific API structure.

## Changes Made to Frontend

### 1. Removed `/api/telemetry` Endpoint Calls
- **Issue**: The Python server doesn't have a `/api/telemetry` HTTP endpoint
- **Solution**: Removed telemetry polling. Telemetry is stored in `drone.telemetry` on the server but not exposed via HTTP.
- **Status**: ✅ Fixed - Using default values (0, 0, false) and will update if WebSocket sends telemetry data

### 2. Updated WebSocket Message Format
- **Issue**: Python server expects both `l` and `r` in the same message
- **Python Code**: `if 'l' in d: drone.update_sticks(float(d['l']['x']), float(d['l']['y']), float(d['r']['x']), float(d['r']['y']))`
- **Solution**: 
  - Created `joystickCommand` ref to store both joystick states
  - Always send both `l` and `r` together in every message
  - Added periodic sending (33ms interval = ~30fps) to match Python server's HTML example
- **Status**: ✅ Fixed

### 3. Updated Toggle Endpoint
- **Issue**: Python server accepts both `ai` and `view` in one request
- **Python Code**: `if "ai" in d: cam.ai_enabled = d["ai"]` and `if "view" in d: cam.view_mode = d["view"]`
- **Solution**: 
  - Store current AI and view mode state
  - Send both values together when either changes
- **Status**: ✅ Fixed

### 4. Connection Test Updated
- **Issue**: `/api/telemetry` doesn't exist, so connection test was failing
- **Solution**: Test the root endpoint `/` instead (serves HTML page)
- **Status**: ✅ Fixed

## Python Server API Endpoints

The Python server (`drone_control_V2.py`) provides:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | HTML page (test endpoint) |
| `/ws/control` | WebSocket | Control commands and joystick input |
| `/video_feed` | GET | MJPEG stream (always available, non-censored) |
| `/offer` | POST | WebRTC offer/answer for video streaming |
| `/api/toggle` | POST | Toggle AI detection and view mode |
| `/api/admin` | POST | Admin controls (requires `X-Admin-Token` header) |

## WebSocket Message Format

### Control Commands
```json
{
  "action": "ARM" | "DISARM"
}
```

### Joystick Control
```json
{
  "l": { "x": float, "y": float },
  "r": { "x": float, "y": float }
}
```

**Important**: Both `l` and `r` must be present in the same message. The Python server reads both when `'l'` is detected.

## Toggle API Format

```json
{
  "ai": boolean,
  "view": "normal" | "heatmap"
}
```

Both fields can be sent together or separately, but the frontend now sends both together for consistency.

## ⚠️ CRITICAL: CORS Configuration Required

The Python server **MUST** have CORS enabled for the frontend to work. Currently, only the MJPEG handler has CORS headers.

### Required Changes to Python Server

Add CORS headers to all endpoints. The server uses `aiohttp`, so you need to add CORS middleware:

```python
from aiohttp_cors import setup as setup_cors, ResourceOptions

# After creating the app
cors = setup_cors(app, defaults={
    "*": ResourceOptions(
        allow_credentials=True,
        expose_headers="*",
        allow_headers="*",
        allow_methods="*"
    )
})

# Or manually add CORS headers to each route handler:
@routes.get('/api/toggle')
async def toggle(request):
    response = web.json_response({"status": "ok"})
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    return response
```

### Install aiohttp-cors (if not already installed)
```bash
pip install aiohttp-cors
```

### Alternative: Manual CORS Headers

If you can't install `aiohttp-cors`, add CORS headers manually to each route:

```python
async def toggle(r):
    if not guard.controls_enabled: 
        response = web.json_response({"error": "locked"})
    else:
        d = await r.json()
        if "ai" in d: cam.ai_enabled = d["ai"]
        if "view" in d: cam.view_mode = d["view"]
        response = web.json_response({"status":"ok"})
    
    # Add CORS headers
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    return response
```

Do the same for:
- `/offer` endpoint
- `/api/admin` endpoint
- Any other HTTP endpoints

## Testing

1. **Check Browser Console**: Look for CORS errors
2. **Test WebSocket**: Should connect to `ws://172.24.237.66:5000/ws/control`
3. **Test Video**: WebRTC should connect, fallback to MJPEG if it fails
4. **Test Controls**: Joystick movements should send both `l` and `r` together

## Expected Behavior

- ✅ WebSocket connects successfully
- ✅ Video stream loads (WebRTC or MJPEG fallback)
- ✅ Joystick controls send both `l` and `r` in every message
- ✅ ARM/DISARM buttons work
- ✅ AI and View mode toggles work
- ❌ Telemetry shows defaults (0, 0, false) - server doesn't expose it via HTTP

## Notes

- The Python server stores telemetry in `drone.telemetry` but doesn't expose it via HTTP
- WebSocket doesn't send telemetry messages back to the client
- To get real telemetry, you'd need to add a `/api/telemetry` endpoint to the Python server OR have the WebSocket send telemetry updates

