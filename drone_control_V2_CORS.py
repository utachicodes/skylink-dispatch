#!/usr/bin/env python3
import asyncio
import json
import threading
import time
import socket
import cv2
import numpy as np
import pyrealsense2 as rs
import torch
import glob
import sys
import os

os.environ['MAVLINK20'] = '1'
from pymavlink import mavutil
from aiohttp import web
from aiortc import RTCPeerConnection, RTCSessionDescription, VideoStreamTrack
from ultralytics import YOLO
import av

# ==========================================
# --- CONFIGURATION SECURITE ---
# ==========================================
WIDTH, HEIGHT = 640, 480 
FPS_TARGET = 30
SERVER_PORT = 5000
BAUDRATE = 115200
SMOOTH_FACTOR = 0.08

# CLES D'ACCES
ADMIN_TOKEN = "admin_secret_999" # Pour l'App Admin
PILOT_TOKEN = "pilot_access_123" # Pour l'App Pilote

# ETAT DU SYSTEME (Géré par l'Admin)
class SystemGuard:
    def __init__(self):
        self.video_enabled = True   # Le pilote peut-il voir ?
        self.controls_enabled = True # Le pilote peut-il contrôler ?
        self.emergency_lock = False # Blocage total (Killswitch logiciel)
        self.message = "" # Message à afficher sur l'écran du pilote

guard = SystemGuard()

# ==========================================
# CORS HELPER FUNCTION
# ==========================================
def add_cors_headers(response):
    """Add CORS headers to response"""
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, X-Admin-Token'
    response.headers['Access-Control-Max-Age'] = '3600'
    return response

# ==========================================
# 1. GESTION DRONE (AVEC VERROUILLAGE)
# ==========================================
class DroneController:
    def __init__(self):
        self.master = None
        self.lock = threading.Lock()
        self.target = {"x": 0, "y": 0, "z": 0, "r": 0}
        self.current = {"x": 0.0, "y": 0.0, "z": 0.0, "r": 0.0}
        self.telemetry = {"bat": 0, "alt": 0, "armed": False}
        threading.Thread(target=self.run_mavlink_loop, daemon=True).start()

    def find_pixhawk(self):
        print("🔍 Recherche Pixhawk...")
        ports = glob.glob('/dev/ttyACM*') + glob.glob('/dev/ttyUSB*') + glob.glob('/dev/ttyTHS*')
        for port in ports:
            try:
                master = mavutil.mavlink_connection(port, baud=BAUDRATE)
                master.wait_heartbeat(timeout=1)
                print(f"✅ Pixhawk connecté: {port}")
                return master
            except: pass
        return None

    def arm(self, state=True, is_admin=False):
        # SI c'est le pilote ET que les commandes sont bloquées -> REFUSER
        if not is_admin and not guard.controls_enabled:
            print("⛔ TENTATIVE D'ARMEMENT BLOQUÉE (Admin Lock)")
            return

        if not self.master: return
        val = 1 if state else 0
        self.master.mav.command_long_send(self.master.target_system, self.master.target_component,
            mavutil.mavlink.MAV_CMD_COMPONENT_ARM_DISARM, 0, val, 21196, 0, 0, 0, 0, 0)
        if state:
            self.master.mav.command_long_send(self.master.target_system, self.master.target_component,
                mavutil.mavlink.MAV_CMD_DO_SET_MODE, 0, mavutil.mavlink.MAV_MODE_FLAG_CUSTOM_MODE_ENABLED, 1, 0, 0, 0, 0, 0)
            with self.lock:
                self.target["z"] = 0
                self.current["z"] = 0

    def update_sticks(self, l_x, l_y, r_x, r_y):
        # SI VERROUILLÉ -> On force tout à 0 (Stationnaire/Sol)
        if not guard.controls_enabled:
            with self.lock:
                self.target = {"x": 0, "y": 0, "z": 0, "r": 0}
            return

        with self.lock:
            self.target["y"] = int(r_x * 1000)
            self.target["x"] = int(r_y * 1000)
            self.target["r"] = int(l_x * 1000)
            raw_z = (l_y + 1.0) * 500
            if raw_z < 100: raw_z = 0 
            self.target["z"] = int(raw_z)

    def run_mavlink_loop(self):
        while True:
            if not self.master:
                self.master = self.find_pixhawk()
                if not self.master:
                    time.sleep(2)
                    continue
            try:
                msg = self.master.recv_match(blocking=False)
                if msg:
                    if msg.get_type() == 'SYS_STATUS': self.telemetry["bat"] = msg.voltage_battery / 1000.0
                    elif msg.get_type() == 'HEARTBEAT': self.telemetry["armed"] = (msg.base_mode & mavutil.mavlink.MAV_MODE_FLAG_SAFETY_ARMED) > 0

                # Si Verrouillage d'urgence total, on coupe tout instantanément
                if guard.emergency_lock:
                    self.current = {"x": 0, "y": 0, "z": 0, "r": 0}
                else:
                    with self.lock:
                        for axis in ["x", "y", "z", "r"]:
                            diff = self.target[axis] - self.current[axis]
                            self.current[axis] += diff * SMOOTH_FACTOR
                
                self.master.mav.manual_control_send(
                    self.master.target_system,
                    int(self.current["x"]), int(self.current["y"]),
                    int(self.current["z"]), int(self.current["r"]), 0
                )
                time.sleep(0.02)
            except: self.master = None

drone = DroneController()

# ==========================================
# 2. GESTION VIDEO (AVEC CENSURE)
# ==========================================
class CameraManager:
    def __init__(self):
        self.lock = threading.Lock()
        self.running = True
        self.ai_enabled = False 
        self.view_mode = "normal" 
        self.frame = None 
        # Image "CENSURÉE" (Ecran noir avec texte)
        self.blocked_frame = np.zeros((HEIGHT, WIDTH, 3), dtype=np.uint8)
        cv2.putText(self.blocked_frame, "VIDEO BLOQUEE PAR ADMIN", (50, 240), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)

        if torch.cuda.is_available(): self.device = 'cuda:0'; print("🚀 GPU OK")
        else: self.device = 'cpu'
        try: self.model = YOLO('yolov8n.engine', task='detect'); print("✅ TRT OK")
        except: self.model = YOLO('yolov8n.pt'); self.model.to(self.device)

    def start(self): threading.Thread(target=self.run, daemon=True).start()

    def run(self):
        pipeline = rs.pipeline()
        config = rs.config()
        config.enable_stream(rs.stream.color, WIDTH, HEIGHT, rs.format.bgr8, FPS_TARGET)
        config.enable_stream(rs.stream.depth, WIDTH, HEIGHT, rs.format.z16, FPS_TARGET)
        try: 
            p = pipeline.start(config)
            p.get_device().first_color_sensor().set_option(rs.option.frames_queue_size, 1)
        except: return
        
        align = rs.align(rs.stream.color)
        while self.running:
            try:
                fs = pipeline.wait_for_frames(timeout_ms=100)
                aligned = align.process(fs)
                c_frame = aligned.get_color_frame()
                d_frame = aligned.get_depth_frame()
                if not c_frame: continue
                
                img = np.asanyarray(c_frame.get_data())
                
                if self.ai_enabled:
                    res = self.model(img, classes=[0], conf=0.5, verbose=False, device=self.device)
                    for r in res:
                        for box in r.boxes:
                            x1,y1,x2,y2 = box.xyxy[0].cpu().numpy().astype(int)
                            cv2.rectangle(img, (x1,y1), (x2,y2), (0,255,0), 2)
                            if d_frame:
                                dist = d_frame.get_distance(int((x1+x2)/2), int((y1+y2)/2))
                                cv2.putText(img, f"{dist:.1f}m", (x1,y1-10), 0, 0.6, (0,255,0), 2)

                if self.view_mode == "heatmap" and d_frame:
                    dimg = np.asanyarray(d_frame.get_data())
                    img = cv2.applyColorMap(cv2.convertScaleAbs(dimg, alpha=0.03), cv2.COLORMAP_JET)

                # HUD ETAT SYSTEME
                status_txt = "SYSTEM: OK" if guard.controls_enabled else "SYSTEM: LOCK"
                col = (0, 255, 0) if guard.controls_enabled else (0, 0, 255)
                cv2.putText(img, status_txt, (10, 30), 0, 0.7, col, 2)

                if guard.message:
                    cv2.putText(img, f"ADMIN: {guard.message}", (10, 450), 0, 0.8, (0, 255, 255), 2)

                with self.lock: self.frame = img 
            except: pass

cam = CameraManager()
cam.start()

# ==========================================
# 3. ROUTES & LOGIQUE ADMIN
# ==========================================
pcs = set()
async def on_shutdown(app):
    [await pc.close() for pc in pcs]
    pcs.clear()
    cam.running = False

class VideoTrack(VideoStreamTrack):
    async def recv(self):
        await asyncio.sleep(0.03)
        
        # VERIFICATION ADMIN : Si vidéo coupée, envoyer écran noir
        if not guard.video_enabled:
            return av.VideoFrame.from_ndarray(cam.blocked_frame, format="bgr24")

        with cam.lock:
            if cam.frame is None: return av.VideoFrame.from_ndarray(np.zeros((HEIGHT, WIDTH, 3), dtype=np.uint8), format="bgr24")
            img = cam.frame.copy()
        new_frame = av.VideoFrame.from_ndarray(img, format="bgr24")
        pts, time_base = await self.next_timestamp()
        new_frame.pts = pts; new_frame.time_base = time_base
        return new_frame

# --- API ADMIN (Commandes pour l'App Admin) ---
async def admin_control(request):
    # Handle OPTIONS preflight request
    if request.method == 'OPTIONS':
        response = web.Response()
        return add_cors_headers(response)
    
    # Vérification Token
    token = request.headers.get("X-Admin-Token")
    if token != ADMIN_TOKEN:
        response = web.json_response({"error": "Unauthorized"}, status=403)
        return add_cors_headers(response)
    
    data = await request.json()
    
    if "lock_controls" in data:
        guard.controls_enabled = not data["lock_controls"] # True = Unlocked
        print(f"👑 ADMIN: Controls {'UNLOCKED' if guard.controls_enabled else 'LOCKED'}")
    
    if "lock_video" in data:
        guard.video_enabled = not data["lock_video"]
        print(f"👑 ADMIN: Video {'UNLOCKED' if guard.video_enabled else 'LOCKED'}")
        
    if "emergency" in data:
        # Arrêt d'urgence total
        drone.arm(False, is_admin=True)
        guard.controls_enabled = False
        guard.video_enabled = False
        guard.emergency_lock = True
        guard.message = "EMERGENCY STOP"
        
    if "message" in data:
        guard.message = data["message"] # Afficher msg sur écran pilote

    response = web.json_response({
        "controls": guard.controls_enabled,
        "video": guard.video_enabled,
        "emergency": guard.emergency_lock
    })
    return add_cors_headers(response)

# --- FLUX ADMIN (Toujours visible, ignore le blocage) ---
async def mjpeg_handler(request):
    # L'Admin voit TOUJOURS, même si le pilote est bloqué
    response = web.StreamResponse(status=200, reason='OK', headers={'Content-Type': 'multipart/x-mixed-replace;boundary=--frame', 'Access-Control-Allow-Origin': '*'})
    await response.prepare(request)
    while True:
        await asyncio.sleep(0.05)
        frame_bytes = None
        with cam.lock:
            if cam.frame is not None:
                # L'Admin voit l'image brute, sans la censure "VIDEO BLOQUEE"
                ret, buffer = cv2.imencode('.jpg', cam.frame, [int(cv2.IMWRITE_JPEG_QUALITY), 50])
                if ret: frame_bytes = buffer.tobytes()
        if frame_bytes:
            await response.write(b'--frame\r\n'); await response.write(b'Content-Type: image/jpeg\r\n\r\n'); await response.write(frame_bytes); await response.write(b'\r\n')
    return response

async def index(r): 
    response = web.Response(content_type="text/html", text=HTML_PAGE)
    return add_cors_headers(response)

async def websocket_handler(r):
    ws = web.WebSocketResponse(); await ws.prepare(r)
    async for msg in ws:
        if msg.type == web.WSMsgType.TEXT:
            try:
                # VERIFICATION PILOTE
                # Si les contrôles sont coupés, on ignore tout sauf le "Ping"
                if not guard.controls_enabled:
                    continue

                d = json.loads(msg.data)
                if 'action' in d:
                    if d["action"]=="ARM": drone.arm(True)
                    elif d["action"]=="DISARM": drone.arm(False)
                if 'l' in d: drone.update_sticks(float(d['l']['x']), float(d['l']['y']), float(d['r']['x']), float(d['r']['y']))
            except: pass
    return ws

async def offer(r):
    # Handle OPTIONS preflight request
    if r.method == 'OPTIONS':
        response = web.Response()
        return add_cors_headers(response)
    
    p = await r.json()
    pc = RTCPeerConnection()
    pcs.add(pc)
    pc.addTrack(VideoTrack())
    await pc.setRemoteDescription(RTCSessionDescription(sdp=p["sdp"], type=p["type"]))
    ans = await pc.createAnswer()
    await pc.setLocalDescription(ans)
    response = web.json_response({"sdp": pc.localDescription.sdp, "type": pc.localDescription.type})
    return add_cors_headers(response)

async def toggle(r):
    # Handle OPTIONS preflight request
    if r.method == 'OPTIONS':
        response = web.Response()
        return add_cors_headers(response)
    
    # Le pilote peut changer l'IA, sauf si lock total
    if not guard.controls_enabled: 
        response = web.json_response({"error": "locked"})
        return add_cors_headers(response)
    
    d = await r.json()
    if "ai" in d: cam.ai_enabled = d["ai"]
    if "view" in d: cam.view_mode = d["view"]
    response = web.json_response({"status":"ok"})
    return add_cors_headers(response)

HTML_PAGE = """
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>Skylink Pilot V5</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/nipplejs/0.10.1/nipplejs.min.js"></script>
    <style>
        body { margin: 0; background: #000; overflow: hidden; user-select: none; touch-action: none; }
        #vid { position: absolute; width: 100%; height: 100%; object-fit: cover; z-index: 1; }
        #ui { position: absolute; width: 100%; height: 100%; z-index: 10; pointer-events: none; }
        .top-bar { display: flex; justify-content: space-between; padding: 15px; pointer-events: auto; background: rgba(0,0,0,0.3); }
        .btn { background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.5); color: white; padding: 12px 20px; border-radius: 20px; font-weight: bold; cursor: pointer; }
        .btn-danger { background: rgba(231, 76, 60, 0.8); border-color: #c0392b; }
        .stick-container {
            position: absolute; bottom: 40px; width: 150px; height: 150px;
            background: rgba(255, 255, 255, 0.1); border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%; pointer-events: auto; box-shadow: 0 0 15px rgba(0,0,0,0.5);
        }
        #zone-l { left: 40px; } #zone-r { right: 40px; }
        #status { color: lime; font-family: monospace; font-weight: bold; padding-top: 10px; }
    </style>
</head>
<body>
    <video id="vid" autoplay playsinline muted></video>
    <div id="ui">
        <div class="top-bar">
            <div style="display:flex; gap:15px">
                <button class="btn btn-danger" onclick="send('ARM')">ARM</button>
                <button class="btn" onclick="send('DISARM')">STOP</button>
            </div>
            <div id="status">CONNECTING...</div>
            <div style="display:flex; gap:15px">
                <button class="btn" onclick="toggle('ai')">IA</button>
                <button class="btn" onclick="toggle('view')">VUE</button>
            </div>
        </div>
        <div id="zone-l" class="stick-container"></div>
        <div id="zone-r" class="stick-container"></div>
    </div>
<script>
    const ws = new WebSocket("ws://" + location.host + "/ws/control");
    const status = document.getElementById('status');
    ws.onopen = () => { status.innerText="ONLINE"; status.style.color="#2ecc71"; };
    ws.onclose = () => { status.innerText="OFFLINE"; status.style.color="#e74c3c"; };
    function send(act) { if(ws.readyState===1) ws.send(JSON.stringify({action:act})); }
    let ai=false, view="normal";
    function toggle(type) {
        if(type==='ai') ai=!ai; if(type==='view') view=(view==='normal')?'heatmap':'normal';
        fetch('/api/toggle', {method:'POST', body:JSON.stringify({ai:ai, view:view})});
    }
    const joyL = nipplejs.create({ zone: document.getElementById('zone-l'), mode: 'static', position: {left: '50%', top: '50%'}, color: 'orange', size: 100 });
    const joyR = nipplejs.create({ zone: document.getElementById('zone-r'), mode: 'static', position: {left: '50%', top: '50%'}, color: 'cyan', size: 100 });
    let cmd = { l:{x:0,y:-1}, r:{x:0,y:0} };
    joyL.on('move', (e,d) => { cmd.l.x=d.vector.x; cmd.l.y=d.vector.y; });
    joyL.on('end', () => { cmd.l.x=0; cmd.l.y=-1; });
    joyR.on('move', (e,d) => { cmd.r.x=d.vector.x; cmd.r.y=d.vector.y; });
    joyR.on('end', () => { cmd.r.x=0; cmd.r.y=0; });
    setInterval(() => { if(ws.readyState===1) ws.send(JSON.stringify(cmd)); }, 33);
    const pc = new RTCPeerConnection();
    pc.ontrack = e => document.getElementById('vid').srcObject = e.streams[0];
    pc.addTransceiver('video', {direction:'recvonly'});
    pc.createOffer().then(o => pc.setLocalDescription(o)).then(() => fetch('/offer', {method:'POST', body:JSON.stringify({sdp:pc.localDescription.sdp, type:pc.localDescription.type})}).then(r=>r.json()).then(a=>pc.setRemoteDescription(a)));
</script>
</body>
</html>
"""

if __name__ == "__main__":
    app = web.Application()
    app.on_shutdown.append(on_shutdown)
    app.router.add_get("/", index)
    app.router.add_get("/ws/control", websocket_handler)
    app.router.add_get("/video_feed", mjpeg_handler) # Flux ADMIN (Non censuré)
    app.router.add_post("/offer", offer)
    app.router.add_post("/api/toggle", toggle)
    
    # NOUVELLE ROUTE ADMIN (Pour bloquer/débloquer)
    app.router.add_post("/api/admin", admin_control)
    
    # Add OPTIONS handlers for CORS preflight requests
    app.router.add_options("/offer", offer)
    app.router.add_options("/api/toggle", toggle)
    app.router.add_options("/api/admin", admin_control)
    
    print(f"🚀 SKYLINK V5 (ADMIN SECURE + CORS): http://0.0.0.0:{SERVER_PORT}")
    web.run_app(app, host="0.0.0.0", port=SERVER_PORT)

