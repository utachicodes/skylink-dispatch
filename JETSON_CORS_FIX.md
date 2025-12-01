# Fixing Jetson Connection Issues

## Problem
The Jetson server is accessible at `http://172.24.237.66:5000/` when visited directly, but the platform cannot connect to it. This is almost certainly a **CORS (Cross-Origin Resource Sharing)** issue.

## Solution: Enable CORS on Your Python Flask Server

Your Python Flask server on the Jetson needs to allow requests from your frontend origin.

### Step 1: Install Flask-CORS (if not already installed)

```bash
pip install flask-cors
```

### Step 2: Update Your Python Server Code

Add CORS support to your Flask app. Here's how to modify your server:

```python
from flask import Flask
from flask_cors import CORS

app = Flask(__name__)

# Enable CORS for all routes
CORS(app)

# OR, for more control, allow specific origins:
# CORS(app, resources={
#     r"/api/*": {"origins": "*"},  # Allow all origins for API routes
#     r"/ws/*": {"origins": "*"},   # Allow all origins for WebSocket routes
#     r"/offer": {"origins": "*"},  # Allow all origins for WebRTC offer
#     r"/video_feed": {"origins": "*"}  # Allow all origins for video feed
# })

# Your existing routes...
@app.route('/api/telemetry')
def telemetry():
    # ... your code
    pass

# ... rest of your code
```

### Step 3: For WebSocket (if using Flask-SocketIO)

If you're using Flask-SocketIO for WebSocket connections:

```python
from flask import Flask
from flask_socketio import SocketIO
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS for HTTP requests

# For SocketIO, CORS is handled differently:
socketio = SocketIO(app, cors_allowed_origins="*")  # Allow all origins
# OR specify your frontend URL:
# socketio = SocketIO(app, cors_allowed_origins=["http://localhost:8080", "https://yourdomain.com"])
```

### Step 4: Restart Your Jetson Server

After making these changes, restart your Python server on the Jetson:

```bash
# If running as a service:
sudo systemctl restart jetson-drone-control

# Or if running manually:
python3 your_server.py
```

## Testing

1. Open your browser's Developer Console (F12)
2. Navigate to the Pilot Control page
3. Check the Console tab for connection logs
4. Look for CORS errors like:
   - `Access to fetch at 'http://172.24.237.66:5000/...' from origin 'http://localhost:8080' has been blocked by CORS policy`
   - `Failed to connect to WebSocket`

## Alternative: Manual CORS Headers (if you can't use flask-cors)

If you can't install `flask-cors`, you can add CORS headers manually:

```python
from flask import Flask, jsonify
from functools import wraps

app = Flask(__name__)

def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Admin-Token'
    return response

@app.after_request
def after_request(response):
    return add_cors_headers(response)

@app.route('/api/telemetry', methods=['GET', 'OPTIONS'])
def telemetry():
    if request.method == 'OPTIONS':
        return add_cors_headers(jsonify({}))
    # ... your telemetry code
    return add_cors_headers(jsonify({...}))
```

## Check Your Current Server Code

Look for these in your Python server file:
- `from flask import Flask`
- `app = Flask(__name__)`
- WebSocket setup (if using Flask-SocketIO or similar)

Add the CORS configuration as shown above.

## WebSocket Connection Issues

If you see `WebSocket connection to 'ws://172.24.237.66:5000/ws/control' failed`, your Python server needs to support WebSockets.

### Option 1: Flask-SocketIO (Recommended)

```python
from flask import Flask
from flask_socketio import SocketIO, emit
from flask_cors import CORS

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

@socketio.on('connect')
def handle_connect():
    print('Client connected')
    emit('status', {'status': 'connected'})

@socketio.on('message')
def handle_message(data):
    print('Received message:', data)
    # Handle control commands here
    emit('response', {'status': 'ok'})

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000)
```

### Option 2: FastAPI WebSockets

```python
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.websocket("/ws/control")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_json()
            # Handle control commands
            await websocket.send_json({"status": "ok"})
    except Exception as e:
        print(f"WebSocket error: {e}")
```

### Option 3: Python `websockets` Library

```python
import asyncio
import websockets
from flask import Flask
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

async def handle_client(websocket, path):
    print(f"Client connected: {websocket.remote_address}")
    try:
        async for message in websocket:
            # Handle control commands
            data = json.loads(message)
            await websocket.send(json.dumps({"status": "ok"}))
    except Exception as e:
        print(f"Error: {e}")

# Run WebSocket server in separate thread
def run_websocket_server():
    asyncio.run(websockets.serve(handle_client, "0.0.0.0", 5001))

# Your Flask routes...
@app.route('/api/telemetry')
def telemetry():
    return jsonify({"bat": 12.6, "alt": 10, "armed": False})

if __name__ == '__main__':
    import threading
    ws_thread = threading.Thread(target=run_websocket_server)
    ws_thread.start()
    app.run(host='0.0.0.0', port=5000)
```

**Note:** If your WebSocket runs on a different port, update the frontend code to use that port.

## Still Having Issues?

1. **Check the browser console** - Look for specific error messages
2. **Check network tab** - See if requests are being blocked
3. **Verify the Jetson IP** - Make sure `172.24.237.66:5000` is correct
4. **Check firewall** - Ensure port 5000 is accessible
5. **Test with curl** - Try: `curl http://172.24.237.66:5000/api/telemetry`
6. **Test WebSocket** - Use a WebSocket client tool or browser extension to test `ws://172.24.237.66:5000/ws/control`
7. **Check server logs** - Look at your Python server console for connection attempts

## Expected Console Output (After Fix)

When CORS is properly configured, you should see in the browser console:

```
[JetsonAPI] Base URL: http://172.24.237.66:5000
[JetsonAPI] WebSocket URL: ws://172.24.237.66:5000
[Jetson] Attempting to connect...
[JetsonAPI] Testing connection to: http://172.24.237.66:5000
[JetsonAPI] Fetching telemetry from: http://172.24.237.66:5000/api/telemetry
[JetsonAPI] Telemetry received: {...}
[Jetson] Connection test passed: {...}
[JetsonAPI] Connecting WebSocket to: ws://172.24.237.66:5000/ws/control
[JetsonAPI] WebSocket connected successfully to: ws://172.24.237.66:5000/ws/control
```

