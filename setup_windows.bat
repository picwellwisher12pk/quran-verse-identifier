@echo off
echo ========================================
echo Quran Verse Identifier - Windows Setup
echo ========================================

echo.
echo [1/6] Checking Python version...
python --version
if %errorlevel% neq 0 (
    echo ERROR: Python not found. Please install Python 3.8+ from python.org
    pause
    exit /b 1
)

echo.
echo [2/6] Checking Node.js version...
node --version
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found. Please install Node.js 16+ from nodejs.org
    pause
    exit /b 1
)

echo.
echo [3/6] Setting up Python backend...
cd backend

echo Creating virtual environment...
python -m venv venv
if %errorlevel% neq 0 (
    echo ERROR: Failed to create virtual environment
    pause
    exit /b 1
)

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Upgrading pip and installing build tools...
python -m pip install --upgrade pip setuptools wheel
if %errorlevel% neq 0 (
    echo ERROR: Failed to upgrade pip and build tools
    pause
    exit /b 1
)

echo Installing Python dependencies...
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo ERROR: Failed to install Python dependencies
    pause
    exit /b 1
)

echo Initializing database...
python scripts\init_db.py
if %errorlevel% neq 0 (
    echo WARNING: Database initialization failed, but continuing...
)

cd ..

echo.
echo [4/6] Setting up React frontend...
cd frontend

echo Installing Node.js dependencies...
bun install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install Node.js dependencies
    pause
    exit /b 1
)

cd ..

echo.
echo [5/6] Testing installation...
echo Testing backend...
cd backend
call venv\Scripts\activate.bat
python -c "import fastapi, librosa, numpy, scipy; print('Backend dependencies OK')"
if %errorlevel% neq 0 (
    echo WARNING: Some backend dependencies may have issues
)
cd ..

echo Testing frontend...
cd frontend
bun pm ls --depth=0 > nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: Some frontend dependencies may have issues
)
cd ..

echo.
echo [6/6] Setup complete!
echo.
echo ========================================
echo Installation Summary
echo ========================================
echo Backend: Python FastAPI with audio processing
echo Frontend: React with Tailwind CSS
echo Database: SQLite with sample Quran data
echo.
echo Next steps:
echo 1. Run: start_servers.bat
echo 2. Open browser: http://localhost:3000
echo 3. API docs: http://localhost:8000/docs
echo.
echo Optional:
echo - Download audio: cd backend ^&^& python scripts\download_audio.py --surah 1
echo ========================================

pause