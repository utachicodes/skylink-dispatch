# MAVLink Quick Start Reference

## 🚀 Quick Connection Steps

### 1. On Jetson (One-Time Setup)

```bash
# Install dependencies
pip3 install pyserial

# Copy bridge script
sudo mkdir -p /opt/skylink
# Copy mavproxy_bridge.py to /opt/skylink/

# Find serial port
ls /dev/ttyUSB* /dev/ttyACM*

# Test connection
python3 /opt/skylink/mavproxy_bridge.py \
  --drone-id <YOUR-DRONE-UUID> \
  --serial /dev/ttyUSB0 \
  --baud 57600 \
  --server <YOUR-SERVER-URL> \
  --port 5761
```

### 2. Create System Service

```bash
sudo nano /etc/systemd/system/skylink-bridge.service
```

Paste:
```ini
[Unit]
Description=SkyLink MAVProxy Bridge
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/python3 /opt/skylink/mavproxy_bridge.py \
  --drone-id <YOUR-DRONE-UUID> \
  --serial /dev/ttyUSB0 \
  --baud 57600 \
  --server <YOUR-SERVER-URL> \
  --port 5761
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable:
```bash
sudo systemctl enable skylink-bridge
sudo systemctl start skylink-bridge
sudo systemctl status skylink-bridge
```

### 3. Register Drone in Supabase

```sql
INSERT INTO drones (id, drone_name, is_active)
VALUES (gen_random_uuid(), 'Drone-001', true)
RETURNING id;
```

**Use the returned UUID as `--drone-id`!**

### 4. Deploy Server (Railway/Render)

1. Connect GitHub repo
2. Set root: `server`
3. Add env vars:
   ```
   PORT=4000
   MAVLINK_UDP_PORT=5761
   SUPABASE_URL=your-url
   SUPABASE_SERVICE_ROLE_KEY=your-key
   ```
4. Deploy!

### 5. Verify Connection

**Check server logs:**
```
[MavlinkServer] Drone <uuid> connected
```

**Check database:**
```sql
SELECT * FROM drone_tracking 
ORDER BY timestamp DESC LIMIT 5;
```

**Check frontend:**
- Login as Operator → Pilot Control
- Should see live telemetry!

---

## 🔧 Common Commands

### View Bridge Logs
```bash
sudo journalctl -u skylink-bridge -f
```

### Restart Bridge
```bash
sudo systemctl restart skylink-bridge
```

### Test Serial Connection
```bash
sudo minicom -D /dev/ttyUSB0 -b 57600
```

### Check Connected Drones
```sql
SELECT id, drone_name, is_active, battery_level 
FROM drones WHERE is_active = true;
```

---

## ⚠️ Troubleshooting

| Problem | Solution |
|---------|----------|
| Serial port not found | Check `ls /dev/ttyUSB*`, verify USB connection |
| Can't connect to server | Check firewall, verify server URL |
| No telemetry | Verify drone ID matches, check Supabase credentials |
| Commands not working | Check drone is connected, verify serial connection |

---

## 📋 Required Information

Before starting, gather:
- ✅ Drone UUID from Supabase
- ✅ Server URL (Railway/Render)
- ✅ Serial port (`/dev/ttyUSB0` or similar)
- ✅ Baud rate (usually 57600)
- ✅ Supabase credentials (for server)

---

**Full guide:** See `MAVLINK_SETUP_GUIDE.md` for detailed instructions.

