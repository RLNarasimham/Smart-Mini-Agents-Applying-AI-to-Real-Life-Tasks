# aio_sandbox_service/api/sessions.py
import uuid
import requests
import asyncio
import logging
from fastapi import APIRouter, HTTPException, BackgroundTasks
from agent_sandbox import Sandbox

from ..core.sessions_manager import session_manager, cleanup_session, docker_client
from ..core.models import SessionInfo
from ..core.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/sessions/create", response_model=SessionInfo, tags=["Sessions"])
async def create_session(background_tasks: BackgroundTasks):
    if len(session_manager.sessions) >= settings.MAX_SESSIONS:
        raise HTTPException(503, "Maximum concurrent sessions reached.")

    session_id = str(uuid.uuid4())
    port = session_manager.allocate_port()

    try:
        logger.info(f"Starting container for session {session_id} on port {port}")
        container = docker_client.containers.run(
            settings.SANDBOX_IMAGE, detach=True, remove=False, ports={'8080/tcp': port},
            environment={'SESSION_ID': session_id}, mem_limit=settings.MEM_LIMIT,
            cpu_quota=settings.CPU_QUOTA, shm_size=settings.SHM_SIZE, network_mode='bridge',
        )

        base_url = f"http://localhost:{port}"
        for i in range(180): # 3 minute timeout
            await asyncio.sleep(1)
            try:
                response = requests.get(f"{base_url}/", timeout=2)
                if response.status_code == 200:
                    client = Sandbox(base_url=base_url)
                    client.sandbox.get_sandbox_context()
                    session_manager.create_session(session_id, port, str(container.id), client,base_url)
                    logger.info(f"Container ready for session {session_id}")
                    return session_manager.get_session(session_id)
            except requests.exceptions.RequestException:
                if i % 15 == 0: logger.info(f"Waiting for container {session_id}...")
            except Exception as e:
                 logger.error(f"Sandbox SDK client failed to initialize: {e}")
        
        # If loop finishes without success
        logs = container.logs(tail=100).decode('utf-8')
        logger.error(f"Container failed to become ready. LOGS:\n{logs}")
        raise HTTPException(500, "Failed to initialize sandbox client.")

    except Exception as e:
        session_manager.release_port(port)
        logger.error(f"Failed to create session: {e}", exc_info=True)
        raise HTTPException(500, f"Failed to create sandbox session: {e}")


@router.get("/sessions", response_model=list[SessionInfo], tags=["Sessions"])
async def list_sessions():
    return session_manager.get_all_sessions()

@router.delete("/sessions/{session_id}", tags=["Sessions"])
async def delete_session(session_id: str, background_tasks: BackgroundTasks):
    if not session_manager.get_session(session_id):
        raise HTTPException(404, "Session not found")
    background_tasks.add_task(cleanup_session, session_id)
    return {"message": "Session cleanup initiated", "session_id": session_id}