# Deploying to Jetson

## The Python Script is for Jetson, Not Windows

The `drone_control_V2.py` script is designed to run on your **Jetson device** (Linux), not on your Windows development machine.

## Steps to Deploy

### 1. Copy the File to Jetson

From your Windows machine, copy the file to your Jetson:

```powershell
# Using SCP (if you have SSH access)
scp drone_control_V2.py jetson@172.24.237.66:/path/to/your/script/directory/

# Or use WinSCP, FileZilla, or any SFTP client
# Connect to: 172.24.237.66
# Username: your_jetson_username
# Copy drone_control_V2.py to the Jetson
```

### 2. SSH into Jetson

```powershell
ssh jetson@172.24.237.66
# Or use PuTTY on Windows
```

### 3. Navigate to Script Directory on Jetson

```bash
cd /path/to/your/script/directory/
```

### 4. Install Dependencies (if not already installed)

The script requires these packages (should already be on Jetson):
- `aiohttp`
- `aiortc`
- `pyrealsense2` (Intel RealSense SDK)
- `pymavlink`
- `ultralytics` (YOLO)
- `torch` (PyTorch)
- `opencv-python` (cv2)
- `numpy`
- `av` (PyAV)

If missing, install them:
```bash
pip3 install aiohttp aiortc
# pyrealsense2, pymavlink, etc. may need special installation
```

### 5. Run on Jetson

```bash
python3 drone_control_V2.py
```

You should see:
```
🚀 SKYLINK V5 (ADMIN SECURE + CORS): http://0.0.0.0:5000
```

## Testing from Windows

Once the script is running on the Jetson:

1. **Open your frontend** (running on Windows at `http://localhost:8080`)
2. **Navigate to Pilot Control page**
3. **Check browser console** - CORS errors should be gone
4. **Test connection** - Should connect to `http://172.24.237.66:5000`

## Alternative: Test CORS Locally (Without Hardware)

If you want to test CORS changes on Windows without the hardware dependencies, you could create a minimal test server, but it's better to deploy to Jetson directly.

## Troubleshooting

### "ModuleNotFoundError" on Windows
- ✅ **This is expected** - The script needs Jetson hardware libraries
- ✅ **Solution**: Deploy to Jetson, not Windows

### Can't Connect to Jetson
- Check Jetson IP: `172.24.237.66:5000`
- Check firewall on Jetson
- Verify the script is running: `ps aux | grep drone_control`

### CORS Still Not Working
- Make sure you're using `drone_control_V2_CORS.py` (or the updated version)
- Check browser console for specific errors
- Verify the server is returning CORS headers

