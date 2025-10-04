# aio_sandbox_service/api/operations.py
from fastapi import APIRouter, HTTPException
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, Body
from fastapi.responses import StreamingResponse
import websockets
import asyncio
from pydantic import Field
from ..core.sessions_manager import session_manager
from ..core.models import *

from agent_sandbox import Sandbox
from agent_sandbox.browser import (
    Action_MoveTo, 
    Action_Click, 
    Action_Typing,
    Action_Scroll, 
    Action_Hotkey, 
    Action_DragTo
)

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
    

@router.get("/browser/info", tags=["Browser"])
async def get_browser_info(session_id: str):
    """Gets browser information, including the CDP endpoint."""
    client = get_sandbox_client(session_id)
    try:
        info = client.browser.get_browser_info()
        return info.dict()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get browser info: {e}")

@router.get("/browser/screenshot", tags=["Browser"])
async def take_screenshot(session_id: str):
    """Takes a screenshot of the current browser view and returns it as a PNG image."""
    client = get_sandbox_client(session_id)
    try:
        screenshot_stream = client.browser.take_screenshot()
        return StreamingResponse(screenshot_stream, media_type="image/png")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to take screenshot: {e}")

@router.post("/browser/actions", tags=["Browser"])
async def execute_browser_action(
    session_id: str,
    # CHANGE THIS LINE:
    request: ExecuteBrowserActionRequest = Body(..., discriminator="action_type")
):
    """Executes a GUI action in the browser (e.g., move, click, type)."""
    client = get_sandbox_client(session_id)
    
    # Map Pydantic models to the corresponding agent-sandbox SDK classes
    action_map = {
        "MOVE_TO": Action_MoveTo,
        "CLICK": Action_Click,
        "TYPING": Action_Typing,
        "SCROLL": Action_Scroll,
        "HOTKEY": Action_Hotkey,
        "DRAG_TO": Action_DragTo
    }
    
    # The rest of your function logic remains the same
    # Note: request is now the selected model (e.g., MoveToAction), not a wrapper
    action_class = action_map.get(request.action_type)
    if not action_class:
        raise HTTPException(status_code=400, detail=f"Unsupported action type: {request.action_type}")
        
    try:
        action_params = request.model_dump(exclude={"action_type"})
        sdk_action = action_class(**action_params)
        
        client.browser.execute_action(request=sdk_action)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to execute browser action: {e}")

# --- New VNC Endpoint ---

@router.get("/vnc/url", tags=["VNC"])
async def get_vnc_url(session_id: str):
    """Provides the URL to access the VNC interface for the session."""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Get the base_url from the session dictionary
    base_url = session["base_url"]
    try:
        # Construct the full VNC URL from the client's base URL
        # base_url = str(client.base_url).rstrip('/')
        vnc_url = f"{str(base_url).rstrip('/')}/vnc/index.html?autoconnect=true"
        return {"url": vnc_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to construct VNC URL: {e}")

# --- New Shell Terminal Endpoint ---

async def forward_client_to_sandbox(client_ws: WebSocket, sandbox_ws):
    """Forwards messages from the client to the sandbox shell."""
    try:
        while True:
            data = await client_ws.receive_text()
            await sandbox_ws.send(data)
    except WebSocketDisconnect:
        print("Client disconnected.")

async def forward_sandbox_to_client(client_ws: WebSocket, sandbox_ws):
    """Forwards messages from the sandbox shell to the client."""
    try:
        while True:
            data = await sandbox_ws.recv()
            await client_ws.send_text(data)
    except websockets.exceptions.ConnectionClosed:
        print("Sandbox connection closed.")

@router.websocket("/shell/ws", name="shell_terminal")
async def shell_terminal_ws(session_id: str, websocket: WebSocket):
    """
    Provides a WebSocket proxy to the underlying sandbox's interactive shell terminal.
    """
    await websocket.accept()
    session = session_manager.get_session(session_id)
    if not session:
        await websocket.close(code=1011, reason="Session not found")
        return

    # Get the base_url from the session dictionary, NOT the client object
    base_url = session["base_url"]
    
    # Replace http/https with ws/wss to get the WebSocket URL
    ws_base_url = str(base_url).replace('http', 'ws', 1)
    sandbox_shell_url = f"{ws_base_url.rstrip('/')}/v1/shell/ws"

    try:
        async with websockets.connect(sandbox_shell_url) as sandbox_ws:
            # Create two tasks to run concurrently:
            # 1. Forward messages from our client to the sandbox.
            # 2. Forward messages from the sandbox back to our client.
            client_to_sandbox_task = asyncio.create_task(
                forward_client_to_sandbox(websocket, sandbox_ws)
            )
            sandbox_to_client_task = asyncio.create_task(
                forward_sandbox_to_client(websocket, sandbox_ws)
            )
            
            # Wait for either task to complete (which happens on disconnect)
            done, pending = await asyncio.wait(
                [client_to_sandbox_task, sandbox_to_client_task],
                return_when=asyncio.FIRST_COMPLETED,
            )
            
            # Cancel any pending tasks to clean up
            for task in pending:
                task.cancel()

    except Exception as e:
        print(f"WebSocket proxy error: {e}")
    finally:
        if not websocket.client_state.name == 'DISCONNECTED':
            await websocket.close()
        print(f"Shell WebSocket for session {session_id} closed.")