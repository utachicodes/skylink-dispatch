# SkyLink Drone Connection Guide

This guide will help you connect your physical drone to the SkyLink platform for live telemetry and remote control.

## Overview

The SkyLink platform uses MAVLink protocol for drone communication. Your drone needs:
1. A flight controller running MAVLink (e.g., CubePilot Orange, Pixhawk)
2. An onboard computer with internet connectivity (e.g., Jetson Orion, Raspberry Pi)
3. The MAVProxy bridge software running on the onboard computer

## Architecture

```
[Drone Flight Controller] <--Serial--> [Onboard Computer] <--Internet--> [SkyLink Cloud]
     (MAVLink)                         (MAVProxy Bridge)                  (Your App)
```

## Quick Start

### Step 1: Register Your Drone

1. Log in to SkyLink as an **operator**
2. Go to your operator dashboard
3. Click "Add Drone" and fill in the details
4. Note down the **Drone ID** (UUID) - you'll need this for the bridge

### Step 2: Set Up the MAVProxy Bridge

On your drone's onboard computer (Jetson/Raspberry Pi):

```bash
# Install Python and dependencies
sudo apt-get update
sudo apt-get install python3 python3-pip
pip3 install pymavlink pyserial

# Download the bridge script
curl -o mavproxy_bridge.py https://raw.githubusercontent.com/your-repo/skylink/main/server/scripts/mavproxy_bridge.py

# Make it executable
chmod +x mavproxy_bridge.py
```

### Step 3: Configure Connection

Find your serial port (where flight controller is connected):
```bash
# List available serial ports
ls /dev/ttyACM* /dev/ttyUSB*

# Usually it's /dev/ttyACM0 or /dev/ttyUSB0
```

### Step 4: Run the Bridge

```bash
python3 mavproxy_bridge.py \
  --serial-port /dev/ttyACM0 \
  --baud 57600 \
  --server-host YOUR_MAVLINK_SERVER_URL \
  --server-port 5761 \
  --drone-id YOUR_DRONE_UUID_HERE
```

Replace:
- `/dev/ttyACM0` with your actual serial port
- `YOUR_MAVLINK_SERVER_URL` with your MAVLink gateway server address
- `YOUR_DRONE_UUID_HERE` with the drone ID from Step 1

### Step 5: Set Up Auto-Start (Optional but Recommended)

Create a systemd service to auto-start the bridge:

```bash
sudo nano /etc/systemd/system/skylink-bridge.service
```

Paste this configuration:
```ini
[Unit]
Description=SkyLink MAVProxy Bridge
After=network.target

[Service]
Type=simple
User=YOUR_USERNAME
WorkingDirectory=/home/YOUR_USERNAME
ExecStart=/usr/bin/python3 /home/YOUR_USERNAME/mavproxy_bridge.py \
  --serial-port /dev/ttyACM0 \
  --baud 57600 \
  --server-host YOUR_SERVER_URL \
  --server-port 5761 \
  --drone-id YOUR_DRONE_ID
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl enable skylink-bridge
sudo systemctl start skylink-bridge

# Check status
sudo systemctl status skylink-bridge

# View logs
sudo journalctl -u skylink-bridge -f
```

## Verify Connection

### In the SkyLink App:

1. Go to your operator dashboard
2. Check if your drone shows as "Active" (green indicator)
3. You should see live telemetry data:
   - Battery level
   - GPS coordinates
   - Altitude
   - Speed
   - Heading

### On the Drone Computer:

Check the bridge logs:
```bash
sudo journalctl -u skylink-bridge -f
```

You should see messages like:
```
[INFO] Connected to flight controller
[INFO] Handshake sent to server
[INFO] Heartbeat: battery=95%, lat=14.xxxx, lon=-17.xxxx
```

## Pilot Control

Once connected, operators can:
1. View live camera feed (if configured)
2. Monitor real-time telemetry
3. Send commands:
   - Return to home
   - Emergency brake
   - Land now
4. Use manual controls (with gamepad)
5. Track GPS position on live map

## Troubleshooting

### Drone Not Showing as Active

**Check:**
1. Is the bridge running? `sudo systemctl status skylink-bridge`
2. Is the serial connection working? Check logs for "Connected to flight controller"
3. Is internet connectivity working? Test with `ping google.com`
4. Is the drone ID correct in the bridge configuration?

### No Telemetry Data

**Check:**
1. MAVLink messages are being received from flight controller
2. Server URL and port are correct
3. Firewall isn't blocking UDP port 5761
4. Check server logs for incoming messages

### Serial Port Permission Denied

```bash
# Add your user to dialout group
sudo usermod -a -G dialout $USER

# Logout and login again for changes to take effect
```

### Bridge Keeps Crashing

**Check:**
1. Python dependencies are installed: `pip3 list | grep pymavlink`
2. Serial port path is correct
3. Baud rate matches flight controller settings
4. Check logs: `sudo journalctl -u skylink-bridge -n 50`

## Camera Streaming (Optional)

To enable live video feed:

### Using RTSP Stream:
```bash
# Install GStreamer
sudo apt-get install gstreamer1.0-tools gstreamer1.0-plugins-good

# Start RTSP stream (example with CSI camera on Jetson)
gst-launch-1.0 -v nvarguscamerasrc ! \
  'video/x-raw(memory:NVMM),width=1920,height=1080,framerate=30/1' ! \
  nvv4l2h264enc ! h264parse ! rtph264pay ! \
  udpsink host=YOUR_RTSP_SERVER port=5000
```

Update your drone record with the camera stream URL:
- Go to operator dashboard → Manage Drones
- Edit your drone
- Set "Camera Stream URL" to your RTSP URL

## Advanced Configuration

### Custom MAVLink Parameters

Edit the bridge script to customize:
- Heartbeat interval (default: 1 second)
- Telemetry update rate (default: 1 Hz)
- Command timeout settings
- Retry logic

### Multiple Drones

Run multiple bridge instances with different:
- Serial ports (one per drone)
- Drone IDs
- Service names (`skylink-bridge-1`, `skylink-bridge-2`, etc.)

## Security Recommendations

1. Use HTTPS/WSS for all connections
2. Keep your drone ID private
3. Use firewall rules to restrict incoming connections
4. Regular security updates on onboard computer
5. Monitor logs for unusual activity

## Support

For issues or questions:
- Check the detailed [MAVLINK_SETUP_GUIDE.md](./MAVLINK_SETUP_GUIDE.md)
- Review [VIDEO_STREAMING.md](./VIDEO_STREAMING.md) for camera setup
- Contact: ops@skylink.com

## Next Steps

- [Set up video streaming](./VIDEO_STREAMING.md)
- [Configure autonomous missions](./docs/autonomous-missions.md)
- [Monitor drone health](./docs/health-monitoring.md)
