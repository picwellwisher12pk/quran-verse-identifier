#!/usr/bin/env python3
"""
Setup script for Quran Verse Identifier
Automates the installation and setup process
"""

import os
import sys
import subprocess
import platform

def run_command(command, cwd=None):
    """Run a command and return success status"""
    try:
        result = subprocess.run(
            command,
            shell=True,
            cwd=cwd,
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            print(f"✓ {command}")
            return True
        else:
            print(f"✗ {command}")
            print(f"Error: {result.stderr}")
            return False
    except Exception as e:
        print(f"✗ {command}")
        print(f"Exception: {e}")
        return False

def check_python_version():
    """Check if Python version is 3.8+"""
    version = sys.version_info
    if version.major == 3 and version.minor >= 8:
        print(f"✓ Python {version.major}.{version.minor}.{version.micro}")
        return True
    else:
        print(f"✗ Python version {version.major}.{version.minor}.{version.micro} is too old")
        print("Python 3.8+ is required")
        return False

def check_node_version():
    """Check if Node.js version is 16+"""
    try:
        result = subprocess.run(
            ["node", "--version"],
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            version = result.stdout.strip().replace('v', '')
            major_version = int(version.split('.')[0])
            if major_version >= 16:
                print(f"✓ Node.js {version}")
                return True
            else:
                print(f"✗ Node.js {version} is too old")
                print("Node.js 16+ is required")
                return False
        else:
            print("✗ Node.js not found")
            return False
    except Exception:
        print("✗ Node.js not found")
        return False

def setup_backend():
    """Setup Python backend"""
    print("\n🔧 Setting up Backend...")

    backend_dir = os.path.join(os.getcwd(), "backend")

    # Create virtual environment
    if not os.path.exists(os.path.join(backend_dir, "venv")):
        if not run_command("python -m venv venv", cwd=backend_dir):
            return False

    # Activate virtual environment and install dependencies
    if platform.system() == "Windows":
        python_path = os.path.join(backend_dir, "venv", "Scripts", "python.exe")
        pip_path = os.path.join(backend_dir, "venv", "Scripts", "pip.exe")
    else:
        python_path = os.path.join(backend_dir, "venv", "bin", "python")
        pip_path = os.path.join(backend_dir, "venv", "bin", "pip")

    if not run_command(f"{pip_path} install -r requirements.txt", cwd=backend_dir):
        return False

    # Initialize database
    if not run_command(f"{python_path} scripts/init_db.py", cwd=backend_dir):
        return False

    return True

def setup_frontend():
    """Setup React frontend"""
    print("\n🔧 Setting up Frontend...")

    frontend_dir = os.path.join(os.getcwd(), "frontend")

    # Install dependencies
    if not run_command("npm install", cwd=frontend_dir):
        return False

    return True

def main():
    """Main setup function"""
    print("🚀 Quran Verse Identifier Setup")
    print("=" * 40)

    # Check prerequisites
    print("\n📋 Checking Prerequisites...")
    if not check_python_version():
        return False

    if not check_node_version():
        return False

    # Setup backend
    if not setup_backend():
        print("\n❌ Backend setup failed")
        return False

    # Setup frontend
    if not setup_frontend():
        print("\n❌ Frontend setup failed")
        return False

    print("\n✅ Setup completed successfully!")
    print("\n🎯 Next steps:")
    print("1. Start backend: cd backend && python run.py")
    print("2. Start frontend: cd frontend && npm start")
    print("3. Visit http://localhost:3000")

    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)