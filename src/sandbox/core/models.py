# aio_sandbox_service/core/models.py
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

class SessionInfo(BaseModel):
    session_id: str
    port: int
    created_at: datetime
    last_activity: datetime
    status: str

class ExecuteCodeRequest(BaseModel):
    code: str
    language: str = "python"

class ShellCommandRequest(BaseModel):
    command: str

class FileReadRequest(BaseModel):
    file_path: str

class FileWriteRequest(BaseModel):
    file_path: str
    content: str

class MCPParams(BaseModel):
    name: str
    arguments: Dict

class MCPRequest(BaseModel):
    method: str = "tools/call"
    params: MCPParams

class GenericMCPRequest(BaseModel):
    jsonrpc: str = "2.0"
    method: str
    params: Dict[str, Any]
    # The 'id' can be a string or integer, and is optional for notifications
    id: Optional[int | str] = 1 