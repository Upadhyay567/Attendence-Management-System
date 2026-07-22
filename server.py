import http.server
import socketserver
import os
import json
import socket

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def handle_one_request(self):
        try:
            super().handle_one_request()
        except (ConnectionResetError, BrokenPipeError):
            pass
        except Exception as e:
            print(f"Request error handled gracefully: {e}")

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE')
        self.send_header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        try:
            super().end_headers()
        except (ConnectionResetError, BrokenPipeError):
            pass

    def do_OPTIONS(self):
        try:
            self.send_response(200, "ok")
            self.end_headers()
        except (ConnectionResetError, BrokenPipeError):
            pass

    protocol_version = "HTTP/1.1"

    def send_json_response(self, status_code, data_obj):
        resp_bytes = json.dumps(data_obj).encode('utf-8')
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(resp_bytes)))
        self.send_header('Connection', 'close')
        self.end_headers()
        self.wfile.write(resp_bytes)

    def do_GET(self):
        clean_path = self.path.split('?')[0]
        if clean_path == '/api/db-state':
            seed_file = os.path.join(DIRECTORY, 'seed.json')
            if os.path.exists(seed_file):
                with open(seed_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                try:
                    data_obj = json.loads(content)
                except Exception:
                    data_obj = {}
            else:
                data_obj = {}
            return self.send_json_response(200, data_obj)
        
        # Static file fallback to index.html for SPA routes
        filepath = os.path.join(DIRECTORY, clean_path.lstrip('/'))
        if os.path.isfile(filepath):
            self.path = clean_path
        elif not clean_path.startswith('/api/'):
            self.path = '/index.html'

        return super().do_GET()

    def do_POST(self):
        clean_path = self.path.split('?')[0]
        content_length = int(self.headers.get('Content-Length', 0))
        
        # Read body in 64KB chunks to handle large bulk uploads smoothly
        chunks = []
        bytes_remaining = content_length
        chunk_size = 64 * 1024
        while bytes_remaining > 0:
            chunk = self.rfile.read(min(bytes_remaining, chunk_size))
            if not chunk:
                break
            chunks.append(chunk)
            bytes_remaining -= len(chunk)
        body = b''.join(chunks)

        if clean_path == '/api/mutate':
            try:
                payload = json.loads(body.decode('utf-8'))
                data = payload.get('data')
                if data:
                    seed_file = os.path.join(DIRECTORY, 'seed.json')
                    with open(seed_file, 'w', encoding='utf-8') as f:
                        json.dump(data, f, indent=2)
                return self.send_json_response(200, {'success': True})
            except Exception as e:
                return self.send_json_response(500, {'error': str(e)})

        if clean_path == '/api/upload':
            try:
                payload = json.loads(body.decode('utf-8'))
                filename = payload.get('filename')
                file_data = payload.get('fileData')
                if not filename or not file_data:
                    return self.send_json_response(400, {'error': 'Filename and fileData are required'})
                
                import base64, time
                if ',' in file_data:
                    file_data = file_data.split(',', 1)[1]
                file_bytes = base64.b64decode(file_data)
                
                uploads_dir = os.path.join(DIRECTORY, 'uploads')
                os.makedirs(uploads_dir, exist_ok=True)
                safe_name = f"{int(time.time()*1000)}_{filename}"
                safe_name = "".join(c if c.isalnum() or c in "._-" else "_" for c in safe_name)
                dest_path = os.path.join(uploads_dir, safe_name)
                
                with open(dest_path, 'wb') as f:
                    f.write(file_bytes)
                
                return self.send_json_response(200, {'success': True, 'url': f'/uploads/{safe_name}', 'filename': safe_name, 'size': len(file_bytes)})
            except Exception as e:
                return self.send_json_response(500, {'error': str(e)})
        
        return self.send_json_response(404, {'error': 'Endpoint not found'})

def get_local_ip():
    try:
        hostname = socket.gethostname()
        addr_info = socket.getaddrinfo(hostname, None)
        for item in addr_info:
            ip = item[4][0]
            if '.' in ip and not ip.startswith('127.'):
                return ip
    except Exception:
        pass

    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.5)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        pass

    return "127.0.0.1"

class ThreadingServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    address_family = socket.AF_INET
    daemon_threads = True

def free_port(port):
    """Terminates any stale process bound to the specified port on Windows."""
    if os.name == 'nt':
        try:
            import subprocess, time
            out = subprocess.check_output(f'netstat -ano | findstr :{port}', shell=True, text=True, errors='ignore')
            pids = set()
            current_pid = os.getpid()
            for line in out.strip().splitlines():
                parts = line.strip().split()
                if len(parts) >= 5 and 'LISTENING' in line:
                    pid = parts[-1]
                    if pid.isdigit() and int(pid) != current_pid:
                        pids.add(pid)
            if pids:
                for pid in pids:
                    print(f"🧹 Clearing stale process (PID {pid}) on Port {port}...")
                    subprocess.call(f'taskkill /F /PID {pid} >nul 2>&1', shell=True)
                time.sleep(0.8) # Allow OS kernel to release socket fully
        except Exception:
            pass

def is_port_in_use(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex(('127.0.0.1', port)) == 0

def start_server():
    global PORT
    candidate_ports = [8080, 8088, 8090, 8012, 8085]
    httpd = None
    active_port = None

    for port in candidate_ports:
        # First attempt port cleanup for default port
        free_port(port)
        if is_port_in_use(port):
            print(f"⚠️ Port {port} still busy after cleanup, checking next port...")
            continue

        try:
            httpd = ThreadingServer(("0.0.0.0", port), CustomHandler)
            active_port = port
            PORT = port
            break
        except OSError as err:
            print(f"⚠️ Port {port} bind error ({err}), trying next port...")

    if not httpd:
        print("❌ Critical: Unable to bind to any candidate server port.")
        return

    # Save active port info for client auto-discovery
    try:
        config_path = os.path.join(DIRECTORY, 'server-config.json')
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump({'port': active_port, 'started_at': __import__('time').time()}, f)
    except Exception:
        pass

    local_ip = get_local_ip()
    print(f"===================================================")
    print(f"  HS GROUP DELHI MULTI-THREADED LIVE SERVER ACTIVE ")
    print(f"  Local Laptop:  http://127.0.0.1:{active_port}")
    print(f"  Mobile / LAN:  http://{local_ip}:{active_port}")
    print(f"===================================================")

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer shutting down cleanly.")
        httpd.server_close()

if __name__ == '__main__':
    start_server()



