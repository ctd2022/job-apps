#!/usr/bin/env python3
"""
Startup script for Job Application Workflow Backend
Run this from the project root directory.

Usage:
    python backend/run_server.py
    
Or with custom port:
    python backend/run_server.py --port 8080
"""

import sys
import argparse
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# Also add backend directory
sys.path.insert(0, str(Path(__file__).parent))


def main():
    parser = argparse.ArgumentParser(description="Run the Job Application Workflow API server")
    parser.add_argument("--host", default="127.0.0.1", help="Host to bind to (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8000, help="Port to bind to (default: 8000)")
    parser.add_argument("--reload", action="store_true", help="Enable auto-reload for development")
    parser.add_argument("--workers", type=int, default=1, help="Number of worker processes")
    
    args = parser.parse_args()
    
    print(f"""
╔══════════════════════════════════════════════════════════════╗
║     Job Application Workflow - FastAPI Backend               ║
║     Track 2: Local Web UI                                    ║
╚══════════════════════════════════════════════════════════════╝

🚀 Starting server...
   URL: http://{args.host}:{args.port}
   API Docs: http://{args.host}:{args.port}/docs
   
📁 Project root: {project_root}

Press Ctrl+C to stop the server.
""")
    
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
        workers=args.workers if not args.reload else 1,
    )


if __name__ == "__main__":
    main()
