"""
Platform-wide constants.

Centralizes magic strings and default values that multiple services reference.
"""

# Default Groq model
DEFAULT_MODEL = "llama-3.3-70b-versatile"
FALLBACK_MODEL = "llama-3.1-8b-instant"

# Service default URLs (overridden by env vars in production)
DEFAULT_MODEL_SERVICE_URL = "http://localhost:8001"
DEFAULT_WORKER_SERVICE_URL = "http://localhost:8002"

# Timeouts (seconds)
DEFAULT_HTTP_TIMEOUT = 30.0
INFERENCE_TIMEOUT = 60.0

# Limits
MAX_BATCH_SIZE = 100
MAX_PROMPT_LENGTH = 10000
