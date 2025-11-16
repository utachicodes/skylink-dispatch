#!/usr/bin/env python3
"""
SkyLink MAVProxy Bridge Script
Runs on Jetson Orion to bridge CubePilot Orange to central server via 4G/5G

This script:
1. Connects to CubePilot via serial/USB (MAVLink stream)
2. Connects to SkyLink central server via internet
3. Forwards all MAVLink messages bidirectionally
4. Handles video stream forwarding (if available)
"""

import socket
import serial
import threading
import time
import sys
import argparse
from typing import Optional

# Configuration
DEFAULT_SERIAL_PORT = "/dev/ttyUSB0"  # Adjust based on Jetson setup
DEFAULT_BAUD_RATE = 57600
DEFAULT_SERVER_HOST = "your-server.com"  # Replace with actual server IP/domain
DEFAULT_SERVER_PORT = 5761  # MAVLink UDP port
DEFAULT_VIDEO_PORT = 8554  # RTSP/Video stream port

class MAVProxyBridge:
    def __init__(
        self,
        serial_port: str,
        baud_rate: int,
        server_host: str,
        server_port: int,
        drone_id: str,
        video_port: Optional[int] = None
    ):
        self.serial_port = serial_port
        self.baud_rate = baud_rate
        self.server_host = server_host
        self.server_port = server_port
        self.drone_id = drone_id
        self.video_port = video_port
        
        self.serial_conn: Optional[serial.Serial] = None
        self.udp_socket: Optional[socket.socket] = None
        self.running = False
        
    def connect_serial(self) -> bool:
        """Connect to CubePilot via serial/USB"""
        try:
            self.serial_conn = serial.Serial(
                self.serial_port,
                self.baud_rate,
                timeout=1,
                bytesize=8,
                parity='N',
                stopbits=1
            )
            print(f"[MAVProxy] Connected to {self.serial_port} at {self.baud_rate} baud")
            return True
        except Exception as e:
            print(f"[MAVProxy] Failed to connect to serial: {e}")
            return False
    
    def connect_server(self) -> bool:
        """Connect to central server via UDP"""
        try:
            self.udp_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            # Send initial handshake with drone ID
            handshake = f"DRONE:{self.drone_id}".encode()
            self.udp_socket.sendto(handshake, (self.server_host, self.server_port))
            print(f"[MAVProxy] Connected to server {self.server_host}:{self.server_port}")
            return True
        except Exception as e:
            print(f"[MAVProxy] Failed to connect to server: {e}")
            return False
    
    def forward_serial_to_server(self):
        """Forward MAVLink messages from CubePilot to server"""
        buffer = bytearray()
        while self.running:
            try:
                if self.serial_conn and self.serial_conn.in_waiting > 0:
                    data = self.serial_conn.read(self.serial_conn.in_waiting)
                    if self.udp_socket and data:
                        # Prepend drone ID to identify source
                        packet = f"{self.drone_id}:".encode() + data
                        self.udp_socket.sendto(packet, (self.server_host, self.server_port))
            except Exception as e:
                print(f"[MAVProxy] Error forwarding serial->server: {e}")
                time.sleep(0.1)
    
    def forward_server_to_serial(self):
        """Forward MAVLink commands from server to CubePilot"""
        while self.running:
            try:
                if self.udp_socket:
                    self.udp_socket.settimeout(1.0)
                    try:
                        data, addr = self.udp_socket.recvfrom(1024)
                        # Filter commands for this drone
                        if data.startswith(f"{self.drone_id}:".encode()):
                            mavlink_data = data[len(f"{self.drone_id}:"):]
                            if self.serial_conn:
                                self.serial_conn.write(mavlink_data)
                    except socket.timeout:
                        continue
            except Exception as e:
                print(f"[MAVProxy] Error forwarding server->serial: {e}")
                time.sleep(0.1)
    
    def start(self):
        """Start the bridge"""
        if not self.connect_serial():
            return False
        if not self.connect_server():
            return False
        
        self.running = True
        
        # Start forwarding threads
        serial_to_server = threading.Thread(target=self.forward_serial_to_server, daemon=True)
        server_to_serial = threading.Thread(target=self.forward_server_to_serial, daemon=True)
        
        serial_to_server.start()
        server_to_serial.start()
        
        print(f"[MAVProxy] Bridge active for drone {self.drone_id}")
        print(f"[MAVProxy] Serial: {self.serial_port} <-> Server: {self.server_host}:{self.server_port}")
        
        try:
            while self.running:
                time.sleep(1)
                # Send heartbeat every 5 seconds
                if int(time.time()) % 5 == 0:
                    heartbeat = f"HEARTBEAT:{self.drone_id}".encode()
                    if self.udp_socket:
                        self.udp_socket.sendto(heartbeat, (self.server_host, self.server_port))
        except KeyboardInterrupt:
            print("\n[MAVProxy] Shutting down...")
            self.stop()
        
        return True
    
    def stop(self):
        """Stop the bridge"""
        self.running = False
        if self.serial_conn:
            self.serial_conn.close()
        if self.udp_socket:
            self.udp_socket.close()
        print("[MAVProxy] Bridge stopped")

def main():
    parser = argparse.ArgumentParser(description="SkyLink MAVProxy Bridge")
    parser.add_argument("--serial", default=DEFAULT_SERIAL_PORT, help="Serial port (default: /dev/ttyUSB0)")
    parser.add_argument("--baud", type=int, default=DEFAULT_BAUD_RATE, help="Baud rate (default: 57600)")
    parser.add_argument("--server", default=DEFAULT_SERVER_HOST, help="Server hostname/IP")
    parser.add_argument("--port", type=int, default=DEFAULT_SERVER_PORT, help="Server UDP port")
    parser.add_argument("--drone-id", required=True, help="Unique drone identifier")
    parser.add_argument("--video-port", type=int, help="Video stream port (optional)")
    
    args = parser.parse_args()
    
    bridge = MAVProxyBridge(
        serial_port=args.serial,
        baud_rate=args.baud,
        server_host=args.server,
        server_port=args.port,
        drone_id=args.drone_id,
        video_port=args.video_port
    )
    
    if not bridge.start():
        sys.exit(1)

if __name__ == "__main__":
    main()

