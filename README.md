---
title: Quran Verse Identifier
emoji: 📖
colorFrom: green
colorTo: emerald
sdk: gradio
app_file: run.py
pinned: false
---

# Quran Verse Identifier

A complete web application that identifies Quran verses from audio recordings and live recitations using hybrid intelligence (browser speech recognition, phonetic fuzzy search across all 6,236 verses, and acoustic DTW alignment).

## Features

- **Audio Upload**: Drag-and-drop interface for audio file uploads
- **Verse Identification**: Advanced audio fingerprinting to match Quran verses
- **Arabic Text Display**: Beautiful Arabic text rendering with proper font support
- **Audio Playback**: Play identified verses with synchronized audio
- **Statistics Dashboard**: View database coverage and identification stats
- **Responsive Design**: Modern, mobile-friendly interface

## Tech Stack

### Backend
- **FastAPI**: Modern Python web framework
- **librosa**: Audio processing and fingerprinting
- **SQLite**: Lightweight database for verse storage
- **Pydantic**: Data validation and API models

### Frontend
- **React**: Modern JavaScript framework
- **Tailwind CSS**: Utility-first CSS framework
- **React Router**: Client-side routing
- **Axios**: HTTP client for API communication

## Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd quran-verse-identifier
   ```

2. **Setup Backend**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

3. **Setup Frontend**
   ```bash
   cd frontend
   npm install
   ```

4. **Initialize Database**
   ```bash
   cd backend
   python scripts/init_db.py
   ```

5. **Download Audio Data (Optional)**
   ```bash
   python scripts/download_audio.py
   ```

### Running the Application

1. **Start Backend Server**
   ```bash
   cd backend
   python run.py
   ```
   Backend will run on http://localhost:8000

2. **Start Frontend Development Server**
   ```bash
   cd frontend
   npm start
   ```
   Frontend will run on http://localhost:3000

## Project Structure

```
quran-verse-identifier/
├── backend/
│   ├── app/
│   │   ├── api/           # API endpoints
│   │   ├── core/          # Core functionality
│   │   ├── models/        # Pydantic models
│   │   └── services/      # Business logic
│   ├── data/              # Quran data files
│   ├── scripts/           # Utility scripts
│   └── requirements.txt
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   └── styles/        # CSS files
│   └── package.json
└── README.md
```

## API Documentation

Once the backend is running, visit http://localhost:8000/docs for interactive API documentation.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.