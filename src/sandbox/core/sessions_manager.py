# aio_sandbox_service/core/session_manager.py
import asyncio
import logging
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Set

import docker
import docker.errors
from agent_sandbox import Sandbox
from fastapi import HTTPException

from .config import settings
from .models import SessionInfo

logger = logging.getLogger(__name__)
docker_client = docker.from_env()


class SessionManager:
    def __init__(self):
        self.sessions: Dict[str, dict] = {}
        self.used_ports: Set[int] = set()
        self.docker_client = docker_client

    def allocate_port(self) -> int:
        for port in range(
            settings.BASE_PORT, settings.BASE_PORT + settings.MAX_SESSIONS
        ):
            if port not in self.used_ports:
                self.used_ports.add(port)
                return port
        raise HTTPException(503, "No available ports. Maximum sessions reached.")

    def release_port(self, port: int):
        self.used_ports.discard(port)

    def create_session(
        self, session_id: str, port: int, container_id: str, client: Sandbox
    ):
        self.sessions[session_id] = {
            "session_id": session_id,
            "port": port,
            "container_id": container_id,
            "client": client,
            "created_at": datetime.now(),
            "last_activity": datetime.now(),
            "status": "active",
        }

    def get_session(self, session_id: str) -> Optional[dict]:
        session = self.sessions.get(session_id)
        if session:
            session["last_activity"] = datetime.now()
        return session

    def delete_session(self, session_id: str):
        if session_id in self.sessions:
            port = self.sessions[session_id]["port"]
            self.release_port(port)
            del self.sessions[session_id]

    def get_all_sessions(self) -> List[SessionInfo]:
        return [SessionInfo(**s) for s in self.sessions.values()]

    def get_inactive_sessions(self) -> List[str]:
        cutoff = datetime.now() - timedelta(minutes=settings.SESSION_TIMEOUT_MINUTES)
        return [sid for sid, s in self.sessions.items() if s["last_activity"] < cutoff]


# Instantiate a single manager for the whole application
session_manager = SessionManager()


# Helper function for cleanup
async def cleanup_session(session_id: str):
    session = session_manager.sessions.get(session_id)
    if not session:
        return
    try:
        container = docker_client.containers.get(session["container_id"])
        container.stop(timeout=10)
        container.remove()
        logger.info(f"Cleaned up container for session {session_id}")
    except docker.errors.NotFound:
        logger.warning(f"Container not found for session {session_id}")
    except Exception as e:
        logger.error(f"Error cleaning up session {session_id}: {e}")
    finally:
        session_manager.delete_session(session_id)
