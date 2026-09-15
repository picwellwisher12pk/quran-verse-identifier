import logging
import sys
from datetime import datetime
import os

def setup_logging(log_level: str = "INFO", log_file: str = None):
    """Setup logging configuration for the application"""

    # Create logs directory if it doesn't exist
    if log_file:
        log_dir = os.path.dirname(log_file)
        if log_dir:
            os.makedirs(log_dir, exist_ok=True)

    # Configure logging format
    log_format = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

    # Ensure sys.stdout handles UTF-8 (Arabic characters) without Windows cp1252 charmap errors
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass

    # Configure root logger
    logging.basicConfig(
        level=getattr(logging, log_level.upper()),
        format=log_format,
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler(log_file, encoding="utf-8") if log_file else logging.NullHandler()
        ]
    )

    # Set specific logger levels
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("fastapi").setLevel(logging.INFO)
    logging.getLogger("librosa").setLevel(logging.WARNING)  # Reduce librosa logging

    logger = logging.getLogger(__name__)
    logger.info(f"Logging setup complete - Level: {log_level}")

    return logger