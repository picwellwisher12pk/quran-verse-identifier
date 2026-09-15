# Quran Verse Identifier - Usage Guide

## Getting Started

### 1. Starting the Application

After installation, start the application:

```bash
# Option 1: Use the unified launcher (recommended)
python run.py

# Option 2: Start servers separately
# Terminal 1 - Backend
cd backend && python run.py

# Terminal 2 - Frontend
cd frontend && npm start
```

### 2. Accessing the Web Interface

Open your web browser and navigate to:
- **Main Application**: http://localhost:3000
- **API Documentation**: http://localhost:8000/docs

## Using the Web Interface

### Home Page - Verse Identification

1. **Upload Audio File**
   - Drag and drop an audio file onto the upload area, or
   - Click "Choose File" to select from your computer
   - Supported formats: MP3, WAV, FLAC, M4A, AAC
   - Maximum file size: 50MB

2. **Audio Processing**
   - The system will automatically process your file
   - Processing typically takes 5-15 seconds
   - A progress bar shows the current status

3. **View Results**
   - Identified verses are displayed with confidence scores
   - Arabic text is shown with English translations
   - Multiple matches are ranked by confidence
   - Audio playback controls let you hear the original verse

### Statistics Page

View comprehensive database statistics:
- Total number of surahs and verses
- Audio coverage percentage
- Processing performance metrics
- System information and data sources

### About Page

Learn about:
- The technology behind verse identification
- Project mission and goals
- Technical architecture details
- Data sources and acknowledgments

## Audio File Requirements

### Supported Formats
- **MP3**: Most common, widely supported
- **WAV**: Uncompressed, high quality
- **FLAC**: Lossless compression, excellent quality
- **M4A**: Apple format, good compression
- **AAC**: Advanced Audio Coding, efficient compression

### Quality Guidelines

**For Best Results:**
- **Clear audio**: Minimal background noise
- **Good volume**: Audible but not distorted
- **Duration**: 10-60 seconds works best
- **Bitrate**: 128kbps or higher recommended
- **Single reciter**: Avoid multiple voices

**Audio Types That Work Well:**
- Quran recitation recordings
- Lecture clips with verse recitation
- Audio from Islamic apps or websites
- Personal recordings of verse recitation

## Understanding Results

### Confidence Scores

Results include confidence scores to help you evaluate accuracy:

- **80-100%**: Excellent match, very likely correct
- **60-79%**: Good match, probably correct
- **40-59%**: Fair match, possibly correct
- **30-39%**: Low confidence, verification recommended
- **Below 30%**: Not shown (filtered out)

### Result Information

Each match displays:
- **Surah and Ayah numbers**: Location in the Quran
- **Arabic text**: Original verse in Arabic script
- **English translation**: Meaning in English
- **Confidence score**: Algorithm's certainty level
- **Similarity score**: Audio fingerprint match percentage
- **Audio player**: Play the reference recitation

### Multiple Matches

If multiple verses are identified:
- Results are ranked by confidence
- The highest confidence match appears first
- Lower confidence matches may indicate:
  - Similar recitation patterns
  - Verses with repeated phrases
  - Processing uncertainty

## Advanced Features

### Feedback System

Help improve the system by providing feedback:

1. Click the feedback icon (💬) on any result
2. Indicate if the identification was correct
3. Add optional comments about accuracy
4. Submit to help train the AI

### Audio Player

Each identified verse includes an audio player:
- **Play/Pause**: Control playback
- **Progress bar**: Click to seek to specific time
- **Time display**: Shows current and total duration
- **Verse reference**: Surah:Ayah notation

### Search and Navigation

- **Header navigation**: Access different pages
- **Responsive design**: Works on desktop and mobile
- **Arabic font support**: Proper rendering of Arabic text
- **Real-time processing**: No manual refresh needed

## Command Line Usage

### Database Management

**Initialize database with sample data:**
```bash
cd backend
python scripts/init_db.py
```

**Check database statistics:**
```bash
cd backend
python scripts/download_audio.py --stats
```

### Audio Download

**Download audio for specific surah:**
```bash
cd backend
python scripts/download_audio.py --surah 1
```

**Download range of surahs:**
```bash
cd backend
python scripts/download_audio.py --start 1 --end 5
```

**Download with different reciter:**
```bash
cd backend
python scripts/download_audio.py --reciter Husary_128kbps --surah 2
```

### Available Reciters

Common reciters available from EveryAyah.com:
- `Alafasy_128kbps` (default) - Mishary Rashid Alafasy
- `Husary_128kbps` - Mahmoud Khalil Al-Husary
- `Maher_Al_Muaiqly_128kbps` - Maher Al Muaiqly
- `AbdurRahman_As-Sudais_192kbps` - Abdur-Rahman as-Sudais

## API Usage

### Direct API Calls

You can interact with the backend API directly:

**Health check:**
```bash
curl http://localhost:8000/api/health
```

**Get statistics:**
```bash
curl http://localhost:8000/api/stats
```

**Upload audio file:**
```bash
curl -X POST -F "file=@audio.mp3" http://localhost:8000/api/identify
```

**Get specific verse:**
```bash
curl http://localhost:8000/api/verses/1/1  # Surah 1, Ayah 1
```

### API Documentation

Interactive API documentation is available at:
http://localhost:8000/docs

This provides:
- All available endpoints
- Request/response formats
- Try-it-out functionality
- Data models and examples

## Tips for Better Results

### Audio Quality
1. **Record in quiet environment**: Minimize background noise
2. **Use good microphone**: Clear audio input improves accuracy
3. **Avoid echo**: Record in rooms with soft furnishings
4. **Consistent volume**: Not too loud (distorted) or too quiet

### File Preparation
1. **Trim silence**: Remove long periods of silence
2. **Single verse**: Focus on one verse at a time
3. **Clear pronunciation**: Ensure recitation is clear
4. **Standard recitation**: Avoid heavily stylized or sung versions

### Troubleshooting Recognition
- **No matches found**: Try a clearer recording or different verse
- **Low confidence**: The verse might not be in the database yet
- **Wrong match**: The audio might contain multiple verses
- **Processing errors**: Check file format and size limits

## Limitations

### Current Limitations
- Database contains sample verses only (until audio is downloaded)
- Recognition accuracy depends on audio quality
- Some verses may not be available yet
- Processing time varies with file size
- Internet connection required for initial setup

### Future Improvements
- Larger verse database
- Multiple reciter support
- Better noise handling
- Faster processing
- Mobile app version

## Privacy and Security

### Data Handling
- Audio files are processed temporarily
- No permanent storage of uploaded files
- Files are deleted after processing
- No personal information collected
- All processing happens locally

### Security
- Files are validated before processing
- Size limits prevent abuse
- Secure temporary file handling
- No external data transmission of audio

## Support and Feedback

If you experience issues or have suggestions:

1. **Check troubleshooting**: Review common issues in INSTALLATION.md
2. **Verify setup**: Ensure all prerequisites are installed
3. **Check logs**: Look for error messages in terminal output
4. **Test with sample**: Try with known good audio files
5. **Provide feedback**: Use the in-app feedback system

Remember: This is an educational tool to help with Quran study and research. Always verify important results independently.