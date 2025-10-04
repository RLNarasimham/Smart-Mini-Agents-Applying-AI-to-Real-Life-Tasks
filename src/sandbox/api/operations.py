# aio_sandbox_service/api/operations.py
from fastapi import APIRouter, HTTPException
from agent_sandbox import Sandbox

from ..core.sessions_manager import session_manager
from ..core.models import *

router = APIRouter(prefix="/sessions/{session_id}", tags=["Operations"])

def get_sandbox_client(session_id: str) -> Sandbox:
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    return session["client"]

@router.post("/execute")
async def execute_code(session_id: str, request: ExecuteCodeRequest):
    client = get_sandbox_client(session_id)
    try:
        if request.language == "python":
            result = client.jupyter.execute_jupyter_code(code=request.code)
        elif request.language == "bash":
            result = client.shell.exec_command(command=request.code)
        else:
            raise HTTPException(400, f"Unsupported language: {request.language}")
        return {"result": result.dict() if hasattr(result, 'dict') else str(result)}
    except Exception as e:
        raise HTTPException(500, f"Execution failed: {e}")

@router.post("/file/read")
async def read_file(session_id: str, request: FileReadRequest):
    client = get_sandbox_client(session_id)
    try:
        content = client.file.read_file(file=request.file_path)
        return {"content": content}
    except Exception as e:
        raise HTTPException(500, f"Failed to read file: {e}")

@router.post("/file/write")
async def write_file(session_id: str, request: FileWriteRequest):
    client = get_sandbox_client(session_id)
    try:
        client.file.write_file(file=request.file_path, content=request.content)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(500, f"Failed to write file: {e}")
    

