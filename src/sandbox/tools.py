"""
FastAPI service for managing per-user AIO Sandbox instances.
Each chat session gets its own isolated Docker container.

Requirements:
pip install fastapi uvicorn agent-sandbox docker pydantic python-dotenv requests

Run:
uvicorn main:app --reload
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Optional, List
import docker
import uuid
import time
import asyncio
import requests
from datetime import datetime, timedelta
from agent_sandbox import Sandbox
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AIO Sandbox Multi-User Service",
    description="Manages isolated sandbox environments for each user chat session",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Docker client
docker_client = docker.from_env()

# Configuration
SANDBOX_IMAGE = "ghcr.io/agent-infra/sandbox:latest"
BASE_PORT = 9000  # Starting port for sandbox instances
MAX_SESSIONS = 100  # Maximum concurrent sessions
SESSION_TIMEOUT_MINUTES = 30  # Auto-cleanup after inactivity


# Models
class SessionInfo(BaseModel):
    session_id: str
    port: int
    created_at: datetime
    last_activity: datetime
    status: str


class ExecuteCodeRequest(BaseModel):
    code: str
    language: str = "python"  # python, bash, etc.


class ShellCommandRequest(BaseModel):
    command: str


class FileReadRequest(BaseModel):
    file_path: str


class FileWriteRequest(BaseModel):
    file_path: str
    content: str


class BrowserActionRequest(BaseModel):
    action_type: str
    x: Optional[int] = None
    y: Optional[int] = None
    url: Optional[str] = None


# Session storage
class SessionManager:
    def __init__(self):
        self.sessions: Dict[str, dict] = {}
        self.used_ports: set = set()
        
    def allocate_port(self) -> int:
        """Allocate next available port"""
        for port in range(BASE_PORT, BASE_PORT + MAX_SESSIONS):
            if port not in self.used_ports:
                self.used_ports.add(port)
                return port
        raise HTTPException(503, "No available ports. Maximum sessions reached.")
    
    def release_port(self, port: int):
        """Release port back to pool"""
        self.used_ports.discard(port)
    
    def create_session(self, session_id: str, port: int, container_id: str, client: Sandbox):
        """Store session information"""
        self.sessions[session_id] = {
            "session_id": session_id,
            "port": port,
            "container_id": container_id,
            "client": client,
            "created_at": datetime.now(),
            "last_activity": datetime.now(),
            "status": "active"
        }
    
    def get_session(self, session_id: str) -> Optional[dict]:
        """Retrieve session and update last activity"""
        session = self.sessions.get(session_id)
        if session:
            session["last_activity"] = datetime.now()
        return session
    
    def delete_session(self, session_id: str):
        """Remove session from storage"""
        if session_id in self.sessions:
            port = self.sessions[session_id]["port"]
            self.release_port(port)
            del self.sessions[session_id]
    
    def get_all_sessions(self) -> List[SessionInfo]:
        """Get all active sessions"""
        return [
            SessionInfo(
                session_id=s["session_id"],
                port=s["port"],
                created_at=s["created_at"],
                last_activity=s["last_activity"],
                status=s["status"]
            )
            for s in self.sessions.values()
        ]
    
    def get_inactive_sessions(self, timeout_minutes: int) -> List[str]:
        """Find sessions that have been inactive"""
        cutoff_time = datetime.now() - timedelta(minutes=timeout_minutes)
        return [
            session_id
            for session_id, session in self.sessions.items()
            if session["last_activity"] < cutoff_time
        ]


session_manager = SessionManager()


# Helper functions
async def cleanup_session(session_id: str):
    """Clean up sandbox container and session data"""
    session = session_manager.sessions.get(session_id)
    if not session:
        return
    
    try:
        # Stop and remove container
        container = docker_client.containers.get(session["container_id"])
        container.stop(timeout=10)
        container.remove()
        logger.info(f"Cleaned up container for session {session_id}")
    except docker.errors.NotFound:
        logger.warning(f"Container not found for session {session_id}")
    except Exception as e:
        logger.error(f"Error cleaning up session {session_id}: {str(e)}")
    finally:
        session_manager.delete_session(session_id)


async def cleanup_inactive_sessions():
    """Background task to cleanup inactive sessions"""
    while True:
        try:
            inactive_sessions = session_manager.get_inactive_sessions(SESSION_TIMEOUT_MINUTES)
            for session_id in inactive_sessions:
                logger.info(f"Cleaning up inactive session: {session_id}")
                await cleanup_session(session_id)
        except Exception as e:
            logger.error(f"Error in cleanup task: {str(e)}")
        
        await asyncio.sleep(60)  # Check every minute


# API Endpoints
@app.on_event("startup")
async def startup_event():
    """Check and pull sandbox image if needed, start cleanup task"""
    try:
        # Check if image exists locally
        try:
            docker_client.images.get(SANDBOX_IMAGE)
            logger.info(f"Sandbox image already exists locally: {SANDBOX_IMAGE}")
        except docker.errors.ImageNotFound:
            logger.info(f"Image not found locally. Pulling: {SANDBOX_IMAGE}")
            docker_client.images.pull(SANDBOX_IMAGE)
            logger.info("Sandbox image downloaded successfully")
    except Exception as e:
        logger.error(f"Error checking/pulling image: {str(e)}")
    
    # Start background cleanup task
    asyncio.create_task(cleanup_inactive_sessions())


@app.post("/sessions/create", response_model=SessionInfo)
async def create_session(background_tasks: BackgroundTasks):
    """
    Create a new sandbox session with isolated Docker container.
    Returns session_id and connection details.
    """
    if len(session_manager.sessions) >= MAX_SESSIONS:
        raise HTTPException(503, "Maximum concurrent sessions reached. Try again later.")
    
    session_id = str(uuid.uuid4())
    port = session_manager.allocate_port()
    
    try:
        # Start sandbox container
        logger.info(f"Starting container for session {session_id} on port {port}")
        container = docker_client.containers.run(
            SANDBOX_IMAGE,
            detach=True,
            remove=False,  # We'll remove manually
            ports={'8080/tcp': port},
            environment={
                'SESSION_ID': session_id
            },
            mem_limit='4g',  # Memory limit
            cpu_quota=100000,  # CPU limit (50% of one core)
            shm_size='1g',  # Shared memory for browser
            network_mode='bridge',
        )
        
        # Wait for container to be ready
        max_retries = 90  # Increased to 90 seconds
        client = None
        base_url = f"http://localhost:{port}"
        
        # First, wait for container to be running
        await asyncio.sleep(5)  # Give it initial startup time
        
        for i in range(max_retries):
            try:
                # Check if container is still running
                container.reload()
                if container.status != 'running':
                    logger.error(f"Container stopped unexpectedly. Status: {container.status}")
                    raise Exception(f"Container status: {container.status}")
                
                # Try simple HTTP health check first (faster than SDK)
                import requests
                response = requests.get(f"{base_url}/", timeout=2)
                if response.status_code == 200:
                    # Now initialize the SDK client
                    client = Sandbox(base_url=base_url)
                    # Quick verification
                    context = client.sandbox.get_sandbox_context()
                    logger.info(f"Container ready for session {session_id}. Home dir: {context.home_dir}")
                    break
            except requests.exceptions.RequestException:
                # Connection error - API not ready yet
                pass
            except Exception as e:
                if i == max_retries - 1:
                    # Log container logs for debugging
                    try:
                        logs = container.logs(tail=100).decode('utf-8')
                        logger.error(f"Container logs:\n{logs}")
                    except:
                        pass
                    container.stop()
                    container.remove()
                    session_manager.release_port(port)
                    raise HTTPException(500, f"Container failed to start properly after {max_retries} seconds. Last error: {str(e)}")
                
                # Log less frequently to reduce noise
                if i == 0 or (i + 1) % 15 == 0:  # Log at start and every 15 seconds
                    logger.info(f"Waiting for container {session_id}... ({i+1}/{max_retries})")
            
            await asyncio.sleep(1)
        
        if client is None:
            # Don't remove container - let user debug it
            logger.error(f"Failed to connect to container {session_id}. Container is still running on port {port} for debugging.")
            raise HTTPException(500, f"Failed to initialize sandbox client. Container running on port {port}")
        
        # Store session
        session_manager.create_session(session_id, port, container.id, client)
        
        return SessionInfo(
            session_id=session_id,
            port=port,
            created_at=datetime.now(),
            last_activity=datetime.now(),
            status="active"
        )
        
    except Exception as e:
        session_manager.release_port(port)
        logger.error(f"Failed to create session: {str(e)}")
        raise HTTPException(500, f"Failed to create sandbox session: {str(e)}")


@app.get("/sessions", response_model=List[SessionInfo])
async def list_sessions():
    """List all active sessions"""
    return session_manager.get_all_sessions()


@app.get("/sessions/{session_id}", response_model=SessionInfo)
async def get_session_info(session_id: str):
    """Get information about a specific session"""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    
    return SessionInfo(
        session_id=session["session_id"],
        port=session["port"],
        created_at=session["created_at"],
        last_activity=session["last_activity"],
        status=session["status"]
    )


@app.delete("/sessions/{session_id}")
async def delete_session(session_id: str, background_tasks: BackgroundTasks):
    """Delete a sandbox session and cleanup resources"""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    
    background_tasks.add_task(cleanup_session, session_id)
    return {"message": "Session cleanup initiated", "session_id": session_id}


# Sandbox operations
@app.post("/sessions/{session_id}/execute")
async def execute_code(session_id: str, request: ExecuteCodeRequest):
    """Execute code in the sandbox"""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    
    try:
        client: Sandbox = session["client"]
        
        if request.language == "python":
            result = client.jupyter.execute_jupyter_code(code=request.code)
        elif request.language == "bash":
            result = client.shell.exec_command(command=request.code)
        else:
            raise HTTPException(400, f"Unsupported language: {request.language}")
        
        return {
            "session_id": session_id,
            "result": result.dict() if hasattr(result, 'dict') else str(result)
        }
    except Exception as e:
        logger.error(f"Execution error in session {session_id}: {str(e)}")
        raise HTTPException(500, f"Execution failed: {str(e)}")


@app.post("/sessions/{session_id}/shell")
async def execute_shell_command(session_id: str, request: ShellCommandRequest):
    """Execute shell command in the sandbox"""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    
    try:
        client: Sandbox = session["client"]
        result = client.shell.exec_command(command=request.command)
        return {
            "session_id": session_id,
            "output": result.data.output if hasattr(result, 'data') else str(result)
        }
    except Exception as e:
        raise HTTPException(500, f"Shell command failed: {str(e)}")


@app.post("/sessions/{session_id}/file/read")
async def read_file(session_id: str, request: FileReadRequest):
    """Read a file from the sandbox"""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    
    try:
        client: Sandbox = session["client"]
        result = client.file.read_file(file=request.file_path)
        return {
            "session_id": session_id,
            "file_path": request.file_path,
            "content": result.data.content if hasattr(result, 'data') else str(result)
        }
    except Exception as e:
        raise HTTPException(500, f"Failed to read file: {str(e)}")


@app.post("/sessions/{session_id}/file/write")
async def write_file(session_id: str, request: FileWriteRequest):
    """Write content to a file in the sandbox"""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    
    try:
        client: Sandbox = session["client"]
        result = client.file.write_file(file=request.file_path, content=request.content)
        return {
            "session_id": session_id,
            "file_path": request.file_path,
            "status": "success"
        }
    except Exception as e:
        raise HTTPException(500, f"Failed to write file: {str(e)}")


@app.get("/sessions/{session_id}/browser/screenshot")
async def get_browser_screenshot(session_id: str):
    """Get screenshot from browser in the sandbox"""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    
    try:
        client: Sandbox = session["client"]
        screenshot = client.browser.screenshot()
        return {
            "session_id": session_id,
            "screenshot": screenshot  # Base64 encoded image
        }
    except Exception as e:
        raise HTTPException(500, f"Failed to capture screenshot: {str(e)}")


@app.get("/sessions/{session_id}/context")
async def get_sandbox_context(session_id: str):
    """Get sandbox context information"""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    
    try:
        client: Sandbox = session["client"]
        context = client.sandbox.get_sandbox_context()
        return {
            "session_id": session_id,
            "context": context.dict() if hasattr(context, 'dict') else str(context)
        }
    except Exception as e:
        raise HTTPException(500, f"Failed to get context: {str(e)}")


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "active_sessions": len(session_manager.sessions),
        "max_sessions": MAX_SESSIONS
    }


@app.post("/admin/cleanup-orphaned-containers")
async def cleanup_orphaned_containers():
    """
    Cleanup any orphaned sandbox containers that aren't tracked in sessions.
    Useful for debugging and maintenance.
    """
    try:
        orphaned = []
        all_containers = docker_client.containers.list(all=True)
        
        for container in all_containers:
            # Check if it's a sandbox container
            if SANDBOX_IMAGE.split(':')[0] in container.image.tags[0] if container.image.tags else '':
                # Check if it's tracked in our sessions
                container_id = container.id
                is_tracked = any(
                    s["container_id"] == container_id 
                    for s in session_manager.sessions.values()
                )
                
                if not is_tracked:
                    orphaned.append({
                        "container_id": container_id[:12],
                        "status": container.status,
                        "created": container.attrs['Created']
                    })
                    # Stop and remove
                    if container.status == 'running':
                        container.stop(timeout=5)
                    container.remove()
        
        return {
            "message": f"Cleaned up {len(orphaned)} orphaned containers",
            "containers": orphaned
        }
    except Exception as e:
        raise HTTPException(500, f"Cleanup failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)