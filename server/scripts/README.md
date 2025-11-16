# SkyLink MAVProxy Bridge Script

This Python script runs on the Jetson Orion to bridge the CubePilot Orange flight controller to the SkyLink central server via 4G/5G internet connection.

## Architecture

```
CubePilot Orange (Serial/USB) 
    ↓
MAVProxy Bridge (Jetson)
    ↓
SkyLink Central Server (UDP 5761)
    ↓
Web Application (Operators/Clients)
```

## Prerequisites

Install required Python packages on the Jetson:

```bash
pip3 install pyserial
```

## Configuration

1. **Identify Serial Port**: Connect CubePilot to Jetson via USB/serial
   ```bash
   ls /dev/ttyUSB*  # or /dev/ttyACM*
   ```

2. **Set Server Address**: Update `DEFAULT_SERVER_HOST` in the script or use `--server` flag

3. **Get Drone ID**: Each drone needs a unique identifier (e.g., "drone-001")

## Usage

### Basic Usage

```bash
python3 mavproxy_bridge.py --drone-id drone-001
```

### Full Options

```bash
python3 mavproxy_bridge.py \
  --drone-id drone-001 \
  --serial /dev/ttyUSB0 \
  --baud 57600 \
  --server your-server.com \
  --port 5761
```

### Run as Service (systemd)

Create `/etc/systemd/system/skylink-bridge.service`:

```ini
[Unit]
Description=SkyLink MAVProxy Bridge
After=network.target

[Service]
Type=simple
User=jetson
WorkingDirectory=/opt/skylink
ExecStart=/usr/bin/python3 /opt/skylink/mavproxy_bridge.py --drone-id drone-001 --server your-server.com
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable skylink-bridge
sudo systemctl start skylink-bridge
sudo systemctl status skylink-bridge
```

## Protocol

### Handshake
On connection, the bridge sends:
```
DRONE:drone-001
```

### Heartbeat
Every 5 seconds:
```
HEARTBEAT:drone-001
```

### MAVLink Forwarding
All MAVLink packets are prefixed with drone ID:
```
drone-001:<MAVLink_Binary_Data>
```

### Commands
Server sends commands in format:
```
drone-001:{"droneId":"drone-001","type":"RETURN_TO_BASE"}
```

## Troubleshooting

1. **Serial port not found**: Check USB connection, verify with `dmesg | tail`
2. **Server connection failed**: Verify network connectivity, firewall rules
3. **No telemetry**: Check serial baud rate matches CubePilot settings
4. **Commands not working**: Verify drone ID matches in both bridge and server

## Video Streaming

For video streaming, configure RTSP server on Jetson (e.g., using GStreamer or FFmpeg) and set the stream URL in server environment variables:

```bash
VIDEO_URL_drone-001=rtsp://jetson-ip:8554/stream
```

## Security Notes

- Use VPN or secure tunnel for production deployments
- Authenticate drone connections (add token/auth to handshake)
- Encrypt MAVLink traffic if sensitive
- Restrict server UDP port access via firewall

