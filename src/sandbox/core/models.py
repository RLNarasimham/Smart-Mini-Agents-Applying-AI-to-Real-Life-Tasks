# aio_sandbox_service/core/models.py
from pydantic import BaseModel
from typing import Optional, Dict, Any, Literal, List, Union
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

class MoveToAction(BaseModel):
    action_type: Literal["MOVE_TO"]
    x: int
    y: int

class ClickAction(BaseModel):
    action_type: Literal["CLICK"]
    x: Optional[int] = None
    y: Optional[int] = None
    button: Optional[Literal["left", "right", "middle"]] = "left"
    num_clicks: int = 1

class TypingAction(BaseModel):
    action_type: Literal["TYPING"]
    text: str
    use_clipboard: bool = False

class ScrollAction(BaseModel):
    action_type: Literal["SCROLL"]
    dx: int = 0
    dy: int = 0

class HotkeyAction(BaseModel):
    action_type: Literal["HOTKEY"]
    keys: List[str]

class DragToAction(BaseModel):
    action_type: Literal["DRAG_TO"]
    x: int
    y: int

ExecuteBrowserActionRequest = Union[
    MoveToAction,
    ClickAction,
    TypingAction,
    ScrollAction,
    HotkeyAction,
    DragToAction,
]