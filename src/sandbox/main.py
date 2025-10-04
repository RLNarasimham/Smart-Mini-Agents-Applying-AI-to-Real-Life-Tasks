# aio_sandbox_service/main.py
import logging
import asyncio
import docker
import docker.errors
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import sessions, operations, mcp
from .core.sessions_manager import session_manager, cleanup_session
from .core.config import settings

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

app = FastAPI(
    title="AIO Sandbox Multi-User Service",
    description="Manages isolated sandbox environments for each user chat session",
    version="1.0.0"
)

# Add Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(sessions.router)
app.include_router(operations.router)
app.include_router(mcp.router)

async def cleanup_inactive_sessions_task():
    """Background task to cleanup inactive sessions"""
    while True:
        await asyncio.sleep(60)
        try:
            inactive = session_manager.get_inactive_sessions()
            for session_id in inactive:
                logging.info(f"Cleaning up inactive session: {session_id}")
                await cleanup_session(session_id)
        except Exception as e:
            logging.error(f"Error in cleanup task: {e}")

@app.on_event("startup")
async def startup_event():
    """On startup, check for Docker image and start background tasks."""
    try:
        session_manager.docker_client.images.get(settings.SANDBOX_IMAGE)
        logging.info(f"Sandbox image found locally: {settings.SANDBOX_IMAGE}")
    except docker.errors.ImageNotFound:
        logging.info(f"Pulling sandbox image: {settings.SANDBOX_IMAGE}")
        session_manager.docker_client.images.pull(settings.SANDBOX_IMAGE)
    
    asyncio.create_task(cleanup_inactive_sessions_task())

@app.get("/health")
def health_check():
    return {"status": "healthy", "active_sessions": len(session_manager.sessions)}

# To run directly for development
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)