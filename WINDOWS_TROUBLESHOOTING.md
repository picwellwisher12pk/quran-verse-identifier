# Windows Installation Troubleshooting

## Quick Fix for Current Issue

Your installation failed because of missing setuptools. Here's how to fix it:

### Method 1: Fresh Installation (Recommended)

1. **Delete the existing virtual environment**:
   ```cmd
   cd backend
   rmdir /s venv
   ```

2. **Run the Windows setup script**:
   ```cmd
   cd ..
   setup_windows.bat
   ```

### Method 2: Fix Current Environment

1. **Activate your virtual environment**:
   ```cmd
   cd backend
   venv\Scripts\activate
   ```

2. **Upgrade pip and install build tools**:
   ```cmd
   python -m pip install --upgrade pip
   python -m pip install --upgrade setuptools wheel
   ```

3. **Install dependencies step by step**:
   ```cmd
   pip install fastapi uvicorn[standard] python-multipart pydantic requests python-dotenv aiofiles
   pip install numpy
   pip install scipy
   pip install soundfile
   pip install librosa
   pip install Pillow
   ```

## Common Windows Issues

### 1. Microsoft Visual C++ Build Tools Missing

**Error**: `Microsoft Visual C++ 14.0 is required`

**Solution**:
- Install Visual Studio Build Tools: https://visualstudio.microsoft.com/visual-cpp-build-tools/
- Or install Visual Studio Community Edition
- Alternative: Use conda instead of pip for problematic packages

### 2. Long Path Names

**Error**: Path length exceeds Windows limit

**Solution**:
- Enable long paths in Windows 10/11:
  ```cmd
  # Run as Administrator in PowerShell
  New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
  ```
- Or clone to shorter path like `C:\quran-app\`

### 3. Permission Errors

**Error**: `Permission denied` or `Access is denied`

**Solution**:
- Run Command Prompt as Administrator
- Disable antivirus temporarily during installation
- Check if files are locked by another process

### 4. Python Version Issues

**Error**: `Python 3.8+ required`

**Solution**:
- Install Python 3.8 or newer from python.org
- Make sure Python is in PATH
- Use `python --version` to verify

### 5. Node.js Issues

**Error**: `'node' is not recognized`

**Solution**:
- Install Node.js 16+ from nodejs.org
- Restart Command Prompt after installation
- Use `node --version` to verify

## Alternative Installation Methods

### Using Conda (Recommended for Windows)

1. **Install Miniconda**: https://docs.conda.io/en/latest/miniconda.html

2. **Create environment**:
   ```cmd
   conda create -n quran-app python=3.9
   conda activate quran-app
   ```

3. **Install audio processing packages**:
   ```cmd
   conda install -c conda-forge librosa numpy scipy soundfile
   ```

4. **Install remaining packages with pip**:
   ```cmd
   pip install fastapi uvicorn[standard] python-multipart pydantic requests python-dotenv aiofiles Pillow
   ```

### Using Pre-compiled Wheels

1. **Visit**: https://www.lfd.uci.edu/~gohlke/pythonlibs/

2. **Download .whl files for**:
   - numpy
   - scipy
   - librosa dependencies

3. **Install with pip**:
   ```cmd
   pip install downloaded_file.whl
   ```

## Step-by-Step Verification

### Test Python Environment

```cmd
cd backend
venv\Scripts\activate
python -c "import sys; print(f'Python {sys.version}')"
python -c "import numpy; print(f'NumPy {numpy.__version__}')"
python -c "import scipy; print(f'SciPy {scipy.__version__}')"
python -c "import librosa; print(f'librosa {librosa.__version__}')"
python -c "import fastapi; print('FastAPI OK')"
```

### Test Node.js Environment

```cmd
cd frontend
npm --version
npm list react react-dom
```

## Alternative Quick Setup

If you continue having issues, try this minimal setup:

### 1. Backend Only (API testing)

```cmd
cd backend
python -m venv venv
venv\Scripts\activate
pip install fastapi uvicorn requests
python -c "
from fastapi import FastAPI
app = FastAPI()
@app.get('/')
def read_root():
    return {'message': 'API working'}
"
```

### 2. Frontend Only (UI testing)

```cmd
cd frontend
npm install --force
npm start
```

## Getting Help

### Check System Requirements

- **OS**: Windows 10/11 (64-bit recommended)
- **Python**: 3.8-3.11 (3.9 recommended for best compatibility)
- **Node.js**: 16+ (18 LTS recommended)
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 2GB free space

### Diagnostic Commands

Run these to gather system info:

```cmd
python --version
pip --version
node --version
npm --version
systeminfo | findstr /B "OS Name OS Version"
```

### Clean Start Commands

If all else fails, completely clean and restart:

```cmd
# Remove everything
rmdir /s backend\venv
rmdir /s frontend\node_modules
del frontend\package-lock.json

# Start fresh
setup_windows.bat
```

## Contact and Support

If you're still having issues:

1. Check the error message carefully
2. Try the conda installation method
3. Consider using Windows Subsystem for Linux (WSL)
4. Look for similar issues in the project documentation

Remember: The most common issue on Windows is missing C++ build tools, which conda helps avoid.