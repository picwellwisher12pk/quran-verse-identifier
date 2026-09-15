#!/usr/bin/env python3
"""
Development server runner for Quran Verse Identifier
Starts both backend and frontend servers concurrently
"""

import os
import sys
import subprocess
import threading
import time
import platform
import signal

class ServerManager:
    def __init__(self):
        self.backend_process = None
        self.frontend_process = None
        self.running = True

    def start_backend(self):
        """Start the FastAPI backend server"""
        backend_dir = os.path.join(os.getcwd(), "backend")
        python_path = sys.executable

        backend_env = os.environ.copy()
        backend_env["OPENBLAS_NUM_THREADS"] = "1"
        backend_env["MKL_NUM_THREADS"] = "1"
        backend_env["OMP_NUM_THREADS"] = "1"

        try:
            print("🚀 Starting Backend Server...")
            self.backend_process = subprocess.Popen(
                [python_path, "run.py"],
                cwd=backend_dir,
                env=backend_env,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                universal_newlines=True
            )

            # Monitor backend output
            for line in iter(self.backend_process.stdout.readline, ''):
                if not self.running:
                    break
                print(f"[Backend] {line.strip()}")

        except Exception as e:
            print(f"❌ Failed to start backend: {e}")

    def start_frontend(self):
        """Start the React frontend server using bun (or npm fallback)"""
        time.sleep(2)  # Give backend time to start

        frontend_dir = os.path.join(os.getcwd(), "frontend")
        frontend_cmd = "bun" if subprocess.run("bun --version", shell=True, capture_output=True).returncode == 0 else "npm"

        try:
            print(f"🚀 Starting Frontend Server ({frontend_cmd} start)...")

            self.frontend_process = subprocess.Popen(
                [frontend_cmd, "start"],
                cwd=frontend_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                universal_newlines=True,
                shell=True
            )

            # Monitor frontend output
            for line in iter(self.frontend_process.stdout.readline, ''):
                if not self.running:
                    break
                print(f"[Frontend] {line.strip()}")

        except Exception as e:
            print(f"❌ Failed to start frontend: {e}")

    def stop_servers(self):
        """Stop both servers gracefully"""
        print("\n🛑 Stopping servers...")
        self.running = False

        if self.backend_process:
            try:
                self.backend_process.terminate()
                self.backend_process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                self.backend_process.kill()
            except Exception as e:
                print(f"Error stopping backend: {e}")

        if self.frontend_process:
            try:
                self.frontend_process.terminate()
                self.frontend_process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                self.frontend_process.kill()
            except Exception as e:
                print(f"Error stopping frontend: {e}")

    def signal_handler(self, signum, frame):
        """Handle interrupt signals"""
        self.stop_servers()
        sys.exit(0)

    def run(self):
        """Run both servers concurrently"""
        # Setup signal handlers
        signal.signal(signal.SIGINT, self.signal_handler)
        signal.signal(signal.SIGTERM, self.signal_handler)

        print("🌟 Quran Verse Identifier Development Server")
        print("=" * 50)
        print("Backend: http://localhost:8000")
        print("Frontend: http://localhost:3000")
        print("API Docs: http://localhost:8000/docs")
        print("=" * 50)
        print("Press Ctrl+C to stop\n")

        # Start servers in separate threads
        backend_thread = threading.Thread(target=self.start_backend, daemon=True)
        frontend_thread = threading.Thread(target=self.start_frontend, daemon=True)

        backend_thread.start()
        frontend_thread.start()

        try:
            # Keep main thread alive
            while self.running:
                time.sleep(1)
        except KeyboardInterrupt:
            self.stop_servers()

def main():
    """Main function"""
    # Check if we're in the right directory
    if not os.path.exists("backend") or not os.path.exists("frontend"):
        print("❌ Error: backend and frontend directories not found")
        print("Make sure you're running this from the project root directory")
        return False

    server_manager = ServerManager()
    server_manager.run()
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)