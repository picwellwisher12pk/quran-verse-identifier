# Quran Verse Identifier - Installation Guide

## Prerequisites

Before installing the Quran Verse Identifier, ensure you have the following installed on your system:

### Required Software
- **Python 3.8+** ([Download](https://www.python.org/downloads/))
- **Node.js 16+** ([Download](https://nodejs.org/))
- **Git** ([Download](https://git-scm.com/downloads))

### System Dependencies

#### Windows
No additional system dependencies required.

#### macOS
```bash
# Install Homebrew (if not already installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install audio processing dependencies
brew install libsndfile ffmpeg
```

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install -y python3-dev python3-pip nodejs npm git
sudo apt install -y libsndfile1-dev ffmpeg
```

## Quick Installation

### Option 1: Automated Setup (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd quran-verse-identifier
   ```

2. **Run the automated setup**
   ```bash
   python setup.py
   ```

3. **Start the application**
   ```bash
   python run.py
   ```

This will automatically:
- Set up Python virtual environment
- Install all dependencies
- Initialize the database with sample data
- Start both backend and frontend servers

### Option 2: Manual Installation

#### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Create and activate virtual environment**
   ```bash
   # Windows
   python -m venv venv
   venv\Scripts\activate

   # macOS/Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Initialize database**
   ```bash
   python scripts/init_db.py
   ```

5. **Start backend server**
   ```bash
   python run.py
   ```

#### Frontend Setup

1. **Open new terminal and navigate to frontend**
   ```bash
   cd frontend
   ```

2. **Install Node.js dependencies**
   ```bash
   npm install
   ```

3. **Start frontend development server**
   ```bash
   npm start
   ```

## Accessing the Application

Once both servers are running:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## Optional: Download Audio Data

To enable actual verse identification (not just sample data):

```bash
cd backend
python scripts/download_audio.py --start 1 --end 5  # Download first 5 surahs
```

Options for audio download:
- `--surah N`: Download specific surah only
- `--start N --end M`: Download range of surahs
- `--reciter NAME`: Choose different reciter (default: Alafasy_128kbps)
- `--workers N`: Concurrent downloads (default: 3)

## Troubleshooting

### Common Issues

#### Python/Pip Issues
```bash
# If pip command not found
python -m pip install -r requirements.txt

# If Python version issues
python3 -m pip install -r requirements.txt
```

#### Node.js/NPM Issues
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### Port Conflicts
If ports 3000 or 8000 are in use:

**Backend (port 8000)**:
Edit `backend/run.py` and change the port:
```python
uvicorn.run("app.main:app", host="0.0.0.0", port=8001, reload=True)
```

**Frontend (port 3000)**:
Start with custom port:
```bash
PORT=3001 npm start  # macOS/Linux
set PORT=3001 && npm start  # Windows
```

#### Audio Processing Issues
If you get librosa or audio-related errors:

```bash
# Install additional audio libraries
pip install soundfile librosa==0.10.1

# macOS additional step
brew install libsndfile
```

#### Database Issues
If database initialization fails:

```bash
cd backend
# Remove existing database
rm -f data/quran.db

# Reinitialize
python scripts/init_db.py
```

### Performance Tips

1. **For large audio downloads**:
   ```bash
   # Download in smaller batches
   python scripts/download_audio.py --start 1 --end 10 --workers 2
   ```

2. **For development**:
   - Keep both servers running during development
   - Frontend automatically reloads on code changes
   - Backend reloads on code changes when using `python run.py`

3. **For production**:
   - Build optimized frontend: `cd frontend && npm run build`
   - Use production WSGI server like Gunicorn for backend

## File Structure

```
quran-verse-identifier/
├── backend/                 # Python FastAPI backend
│   ├── app/                # Application code
│   ├── data/               # Database and data files
│   ├── scripts/            # Utility scripts
│   └── requirements.txt    # Python dependencies
├── frontend/               # React frontend
│   ├── public/            # Static assets
│   ├── src/               # React source code
│   └── package.json       # Node.js dependencies
├── setup.py               # Automated setup script
├── run.py                 # Development server launcher
└── README.md              # Project documentation
```

## Development Workflow

1. **Start development servers**:
   ```bash
   python run.py  # Starts both backend and frontend
   ```

2. **Make changes**: Edit files in `backend/app/` or `frontend/src/`

3. **Test changes**: Both servers auto-reload on file changes

4. **Add new features**: Follow the existing code structure and patterns

## Support

If you encounter issues:

1. Check this troubleshooting guide
2. Ensure all prerequisites are installed
3. Verify Python and Node.js versions
4. Check server logs for error messages
5. Try the automated setup script if manual installation fails

For additional help, refer to the main README.md file.