# MAVLink Connection Setup Guide

Complete guide to connect your drone (CubePilot Orange + Jetson Orion) to SkyLink platform.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    DRONE HARDWARE                       │
│  ┌──────────────┐         ┌──────────────┐            │
│  │ CubePilot    │◄──USB───►│ Jetson Orion │            │
│  │ Orange       │  Serial  │ (Onboard PC) │            │
│  │ (FC)         │          │              │            │
│  └──────────────┘          └──────┬───────┘            │
│                                   │                    │
│                           4G/5G Internet               │
└───────────────────────────────────┼────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────┐
│              SKYLINK CLOUD INFRASTRUCTURE                │
│                                                          │
│  ┌──────────────────────────────────────────┐      │
│  │  MAVLink Gateway Service                     │      │
│  │  (Persistent UDP Connection Handler)         │      │
│  │  - Receives telemetry from drones           │      │
│  │  - Sends commands to drones                 │      │
│  │  - Port: 5761 (UDP)                         │      │
│  └──────────────┬───────────────────────────────┘      │
│                 │                                        │
│                 ▼                                        │
│  ┌──────────────────────────────────────────┐         │
│  │  Supabase Database                        │         │
│  │  - Stores telemetry in drone_tracking     │         │
│  │  - Stores drone status in drones table    │         │
│  └──────────────┬────────────────────────────┘         │
│                 │                                        │
│                 ▼                                        │
│  ┌──────────────────────────────────────────┐         │
│  │  Vercel Frontend + API                    │         │
│  │  - Real-time telemetry display            │         │
│  │  - Operator control interface             │         │
│  └──────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────┘
```

## 📋 Prerequisites

### Hardware
- ✅ CubePilot Orange flight controller
- ✅ Jetson Orion (or similar onboard computer)
- ✅ USB/Serial connection between CubePilot and Jetson
- ✅ 4G/5G modem or WiFi connection on Jetson
- ✅ GPS module connected to CubePilot
- ✅ Battery and power system

### Software
- ✅ Python 3.8+ on Jetson
- ✅ pyserial library
- ✅ Network connectivity from Jetson to internet
- ✅ Access to your Vercel deployment URL

---

## 🔧 Step 1: Install MAVProxy Bridge on Jetson

### 1.1 Connect to Your Jetson

SSH into your Jetson Orion:
```bash
ssh jetson@<jetson-ip-address>
```

### 1.2 Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Python and pip
sudo apt install python3 python3-pip -y

# Install pyserial for serial communication
pip3 install pyserial

# Verify installation
python3 -c "import serial; print('pyserial installed successfully')"
```

### 1.3 Copy Bridge Script to Jetson

**Option A: Clone from GitHub**
```bash
cd /opt
sudo git clone <your-repo-url> skylink
cd skylink/server/scripts
chmod +x mavproxy_bridge.py
```

**Option B: Manual Copy**
```bash
# Create directory
sudo mkdir -p /opt/skylink
cd /opt/skylink

# Copy the mavproxy_bridge.py script (from server/scripts/)
sudo nano mavproxy_bridge.py
# Paste the script content and save

# Make executable
sudo chmod +x mavproxy_bridge.py
```

### 1.4 Identify Serial Port

Connect CubePilot Orange to Jetson via USB, then:

```bash
# List USB devices
lsusb

# Check serial ports
ls -la /dev/ttyUSB* /dev/ttyACM*

# Watch for new devices (connect USB and watch)
dmesg | tail -20
```

**Common ports:**
- `/dev/ttyUSB0` - USB-to-Serial adapter
- `/dev/ttyACM0` - USB CDC device
- `/dev/ttyS0` - Hardware serial port

**Test connection:**
```bash
# Install minicom for testing
sudo apt install minicom -y

# Test serial connection (replace with your port)
sudo minicom -D /dev/ttyUSB0 -b 57600
# Press Ctrl+A then X to exit
```

---

## 🌐 Step 2: Set Up MAVLink Gateway Service

Since Vercel is serverless and can't handle persistent UDP connections, you need a separate service for the MAVLink gateway.

### Option A: Railway (Recommended - Easy Setup)

1. **Create Railway Account**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Deploy MAVLink Gateway**
   ```bash
   # In your project root
   cd server
   
   # Railway will auto-detect Node.js
   # Just connect your GitHub repo and deploy
   ```

3. **Set Environment Variables in Railway:**
   ```
   PORT=4000
   MAVLINK_UDP_PORT=5761
   SUPABASE_URL=your-supabase-url
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

4. **Get Railway URL:**
   - Railway will give you a URL like: `https://skylink-mavlink.up.railway.app`
   - Note the IP address or use a custom domain

### Option B: Render (Alternative)

1. Go to [render.com](https://render.com)
2. Create new Web Service
3. Connect GitHub repo
4. Set root directory to `server`
5. Set build command: `npm install && npm run build`
6. Set start command: `npm start`
7. Add environment variables (same as Railway)

### Option C: DigitalOcean Droplet (Full Control)

1. **Create Droplet:**
   ```bash
   # Ubuntu 22.04 LTS
   # 2GB RAM minimum
   # $12/month
   ```

2. **SSH into Droplet:**
   ```bash
   ssh root@<droplet-ip>
   ```

3. **Install Node.js:**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

4. **Clone and Setup:**
   ```bash
   cd /opt
   git clone <your-repo> skylink
   cd skylink/server
   npm install
   npm run build
   ```

5. **Run with PM2:**
   ```bash
   npm install -g pm2
   pm2 start dist/index.js --name skylink-mavlink
   pm2 save
   pm2 startup
   ```

---

## 🔌 Step 3: Configure MAVProxy Bridge

### 3.1 Update Bridge Configuration

Edit `/opt/skylink/mavproxy_bridge.py`:

```python
# Update these values:
DEFAULT_SERVER_HOST = "your-railway-url.up.railway.app"  # Or your server IP
DEFAULT_SERVER_PORT = 5761
```

**Or use command-line arguments** (recommended):

### 3.2 Test Connection

```bash
# Test with your drone ID
python3 /opt/skylink/mavproxy_bridge.py \
  --drone-id drone-001 \
  --serial /dev/ttyUSB0 \
  --baud 57600 \
  --server your-server.com \
  --port 5761
```

**Expected output:**
```
[MAVProxy] Connected to /dev/ttyUSB0 at 57600 baud
[MAVProxy] Connected to server your-server.com:5761
[MAVProxy] Bridge active for drone drone-001
```

---

## 🚀 Step 4: Run as System Service

### 4.1 Create systemd Service

```bash
sudo nano /etc/systemd/system/skylink-bridge.service
```

**Paste this configuration:**

```ini
[Unit]
Description=SkyLink MAVProxy Bridge for Drone
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=jetson
WorkingDirectory=/opt/skylink
ExecStart=/usr/bin/python3 /opt/skylink/mavproxy_bridge.py \
  --drone-id drone-001 \
  --serial /dev/ttyUSB0 \
  --baud 57600 \
  --server your-server.com \
  --port 5761
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

**Replace:**
- `drone-001` with your actual drone ID
- `/dev/ttyUSB0` with your serial port
- `your-server.com` with your Railway/Render URL or IP

### 4.2 Enable and Start Service

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service (starts on boot)
sudo systemctl enable skylink-bridge

# Start service
sudo systemctl start skylink-bridge

# Check status
sudo systemctl status skylink-bridge

# View logs
sudo journalctl -u skylink-bridge -f
```

---

## 🎯 Step 5: Register Drone in Database

### 5.1 Create Drone Record in Supabase

Go to Supabase Dashboard → SQL Editor and run:

```sql
-- Insert your drone
INSERT INTO public.drones (
  id,
  drone_name,
  is_active,
  battery_level,
  gps_signal,
  autonomous_mode,
  current_lat,
  current_lng,
  camera_stream_url
) VALUES (
  gen_random_uuid(),  -- Or use a specific UUID
  'Drone-001',
  true,
  100,
  true,
  false,
  14.7167,  -- Default location (Dakar)
  -17.4677,
  NULL  -- Set RTSP URL if you have video streaming
);
```

### 5.2 Get Drone ID

```sql
SELECT id, drone_name FROM public.drones WHERE drone_name = 'Drone-001';
```

**Use this UUID as your `--drone-id` in the bridge script!**

---

## ✅ Step 6: Verify Connection

### 6.1 Check MAVLink Gateway Logs

On your server (Railway/Render/Droplet):
```bash
# Railway: Check logs in dashboard
# Render: Check logs in dashboard
# Droplet: 
pm2 logs skylink-mavlink
```

**Look for:**
```
[MavlinkGateway] Drone drone-001 connected from <jetson-ip>:<port>
[MavlinkGateway] Listening for MAVLink UDP on 0.0.0.0:5761
```

### 6.2 Check Telemetry in Database

```sql
-- Check if telemetry is being received
SELECT * FROM public.drone_tracking 
WHERE drone_id = '<your-drone-uuid>'
ORDER BY timestamp DESC
LIMIT 10;
```

### 6.3 Check Frontend

1. Go to your Vercel deployment
2. Login as Operator
3. Open Pilot Control Room
4. You should see:
   - ✅ Drone connected
   - ✅ Battery level
   - ✅ GPS coordinates
   - ✅ Live telemetry updates

---

## 🔧 Step 7: Deploy MAVLink Gateway Server

### 7.1 Update Server Dependencies

The server code is already updated with MAVLink integration. Just ensure dependencies are installed:

```bash
cd server
npm install
npm run build
```

### 7.2 Environment Variables

Set these in Railway/Render/Droplet:

```
PORT=4000
MAVLINK_UDP_PORT=5761
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 7.3 Deploy

**Railway:**
- Connect GitHub repo
- Set root directory: `server`
- Railway auto-detects and deploys

**Render:**
- New Web Service
- Root directory: `server`
- Build: `npm install && npm run build`
- Start: `npm start`

**DigitalOcean:**
```bash
cd /opt/skylink/server
npm install
npm run build
pm2 start dist/index.js --name skylink-mavlink
```

### 7.4 Verify Deployment

Check logs for:
```
[SkyLink Core] HTTP API listening on port 4000
[SkyLink Core] MAVLink UDP server listening on port 5761
[MavlinkServer] Listening on UDP port 5761
```

---

## 🎯 Step 8: Connect Everything Together

### 8.1 Update Bridge Script with Server URL

On Jetson, update the bridge service:

```bash
sudo nano /etc/systemd/system/skylink-bridge.service
```

Update `--server` to your Railway/Render URL or IP address.

### 8.2 Restart Bridge Service

```bash
sudo systemctl restart skylink-bridge
sudo systemctl status skylink-bridge
```

### 8.3 Test End-to-End

1. **Check Server Logs:**
   ```
   [MavlinkServer] Drone drone-001 connected from <jetson-ip>
   ```

2. **Check Database:**
   ```sql
   SELECT * FROM drone_tracking 
   WHERE drone_id = '<your-drone-uuid>'
   ORDER BY timestamp DESC LIMIT 5;
   ```

3. **Check Frontend:**
   - Login as Operator
   - Open Pilot Control
   - Should see live telemetry!

---

## 🔍 Troubleshooting

### Problem: Bridge can't connect to server

**Solutions:**
- ✅ Check firewall allows UDP port 5761
- ✅ Verify server URL/IP is correct
- ✅ Test network connectivity: `ping your-server.com`
- ✅ Check server logs for incoming connections

### Problem: No telemetry in database

**Solutions:**
- ✅ Verify drone is registered in `drones` table
- ✅ Check drone ID matches in bridge script and database
- ✅ Verify Supabase credentials in server env vars
- ✅ Check server logs for database errors

### Problem: Commands not working

**Solutions:**
- ✅ Verify drone is connected (check server logs)
- ✅ Check drone ID matches exactly
- ✅ Verify serial connection is working
- ✅ Test with `minicom` to see if CubePilot responds

### Problem: Serial port not found

**Solutions:**
- ✅ Check USB connection: `lsusb`
- ✅ Check permissions: `sudo chmod 666 /dev/ttyUSB0`
- ✅ Add user to dialout group: `sudo usermod -a -G dialout $USER`
- ✅ Try different port: `/dev/ttyACM0` or `/dev/ttyS0`

---

## 📡 Network Configuration

### Firewall Rules

**On Server (Railway/Render/Droplet):**
- Allow UDP port 5761 (inbound)
- Allow TCP port 4000 (HTTP API)

**On Jetson:**
- Allow outbound UDP to server
- Allow outbound TCP for internet

### Port Forwarding (if behind NAT)

If your Jetson is behind a router:
1. Forward UDP port 5761 to Jetson IP
2. Or use a VPN/tunnel service

---

## 🔐 Security Recommendations

1. **Add Authentication:**
   - Add token to handshake: `DRONE:drone-001:TOKEN`
   - Verify token on server before accepting connection

2. **Use VPN:**
   - Set up WireGuard or OpenVPN
   - Connect Jetson and server through VPN

3. **Encrypt Traffic:**
   - Use DTLS for UDP encryption
   - Or tunnel through SSH/SSL

4. **Restrict Access:**
   - Firewall rules to only allow Jetson IPs
   - Rate limiting on server

---

## 📊 Monitoring

### Check Connection Status

```sql
-- See all active drones
SELECT id, drone_name, is_active, battery_level, 
       current_lat, current_lng, updated_at
FROM drones
WHERE is_active = true;
```

### View Recent Telemetry

```sql
-- Last 10 telemetry updates
SELECT dt.*, d.drone_name
FROM drone_tracking dt
JOIN drones d ON dt.drone_id = d.id
ORDER BY dt.timestamp DESC
LIMIT 10;
```

### Server Health

Check server logs for:
- Connection count
- Telemetry rate
- Error messages
- Command acknowledgments

---

## 🎉 Success Checklist

- ✅ MAVProxy bridge running on Jetson
- ✅ Server deployed and listening on UDP 5761
- ✅ Drone registered in Supabase database
- ✅ Bridge connects to server (check logs)
- ✅ Telemetry appearing in database
- ✅ Frontend showing live data
- ✅ Commands can be sent to drone

---

## 📞 Support

If you encounter issues:
1. Check all logs (Jetson + Server)
2. Verify network connectivity
3. Test serial connection independently
4. Check database permissions
5. Review firewall rules

**You're now ready to fly!** 🚁✨
<｜tool▁calls▁begin｜><｜tool▁call▁begin｜>
read_file
