# aio_sandbox_service/api/mcp.py
from fastapi import APIRouter, HTTPException, Request, Header
from fastapi.responses import JSONResponse
from httpx import AsyncClient, RequestError, HTTPStatusError
import logging
import json
from typing import Optional

from ..core.sessions_manager import session_manager
from ..core.models import *

router = APIRouter(prefix="/sessions/{session_id}", tags=["Operations"])
http_client = AsyncClient(timeout=60.0)

# Store MCP session IDs: {fastapi_session_id: mcp_session_id}
mcp_session_ids = {}

@router.on_event("shutdown")
async def shutdown_event():
    await http_client.aclose()

@router.post("/mcp")
async def forward_mcp_request(
    session_id: str, 
    request: GenericMCPRequest, 
    req: Request,
    mcp_session_id: Optional[str] = Header(None, alias="mcp-session-id")
):
    """
    Forward MCP requests to the sandbox and handle SSE responses with session management.
    
    MCP Protocol Session Management:
    1. Initialize request returns mcp-session-id in response header
    2. All subsequent requests must include mcp-session-id in request header
    """
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    sandbox_mcp_url = f"http://localhost:{session['port']}/mcp"

    try:
        json_payload = request.json()
        request_data = json.loads(json_payload)
        method = request_data.get("method")
        
        logging.info(f"Forwarding {method} to {sandbox_mcp_url}")
        logging.info(f"Request payload: {json_payload}")

        # Build headers
        headers = {
            "Content-Type": "application/json",
            "Accept": req.headers.get("Accept", "application/json, text/event-stream")
        }
        
        # Handle session management based on method
        is_initialize = method == "initialize"
        
        if not is_initialize:
            # For non-initialize requests, we need the mcp-session-id
            session_key = session_id
            
            # Try to get session ID from header, or use stored one
            if mcp_session_id:
                headers["mcp-session-id"] = mcp_session_id
                logging.info(f"Using mcp-session-id from header: {mcp_session_id}")
            elif session_key in mcp_session_ids:
                headers["mcp-session-id"] = mcp_session_ids[session_key]
                logging.info(f"Using stored mcp-session-id: {mcp_session_ids[session_key]}")
            else:
                logging.warning("No mcp-session-id available for non-initialize request")
                # Let it proceed - the sandbox will return an error if needed

        # Make request to sandbox
        logging.info(f"Request headers: {headers}")
        response = await http_client.post(
            sandbox_mcp_url,
            content=json_payload,
            headers=headers,
            timeout=60.0
        )

        response.raise_for_status()
        logging.info(f"Response status: {response.status_code}")
        logging.info(f"Response headers: {dict(response.headers)}")

        # Check if the response is SSE (text/event-stream)
        content_type = response.headers.get("content-type", "")
        
        if "text/event-stream" in content_type:
            # Parse SSE and return the JSON-RPC response
            text = response.text
            logging.info(f"SSE Response (first 500 chars): {text[:500]}")
            
            # SSE format: "data: {...}\n\n"
            lines = text.strip().split('\n')
            json_responses = []
            
            for line in lines:
                if line.startswith('data: '):
                    json_str = line[6:]  # Remove "data: " prefix
                    try:
                        json_obj = json.loads(json_str)
                        json_responses.append(json_obj)
                    except json.JSONDecodeError:
                        logging.warning(f"Could not parse SSE data: {json_str}")
            
            if json_responses:
                result = json_responses[-1]
                response_headers = {}
                
                # Handle initialize response - extract and store mcp-session-id
                if is_initialize:
                    # Check for mcp-session-id in response headers
                    returned_session_id = response.headers.get("mcp-session-id")
                    if returned_session_id:
                        # Store the session ID for future requests
                        mcp_session_ids[session_id] = returned_session_id
                        response_headers["mcp-session-id"] = returned_session_id
                        logging.info(f"✓ Stored mcp-session-id: {returned_session_id}")
                    else:
                        logging.warning("⚠ Initialize response did not include mcp-session-id header")
                        logging.warning(f"Available headers: {list(response.headers.keys())}")
                
                return JSONResponse(content=result, headers=response_headers)
            else:
                raise HTTPException(
                    status_code=500,
                    detail="No valid JSON-RPC response in SSE stream"
                )
        else:
            # Return regular JSON response
            try:
                return response.json()
            except json.JSONDecodeError:
                logging.warning(f"Could not parse JSON response: {response.text}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Invalid JSON response from sandbox: {response.text}"
                )
    
    except HTTPStatusError as e:
        error_detail = e.response.text
        logging.error(f"Sandbox returned an error: {e.response.status_code} - {error_detail}")
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"Error from sandbox: {error_detail}"
        )
    except RequestError as e:
        logging.error(f"Request error: {e}")
        raise HTTPException(
            status_code=502,
            detail=f"Could not communicate with the sandbox container: {e}"
        )
    except Exception as e:
        logging.error(f"Unexpected error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error: {str(e)}"
        )


@router.get("/mcp/session")
async def get_mcp_session(session_id: str):
    """Get the current MCP session ID for debugging"""
    if session_id in mcp_session_ids:
        return {"session_id": session_id, "mcp_session_id": mcp_session_ids[session_id]}
    else:
        return {"session_id": session_id, "mcp_session_id": None, "status": "No MCP session initialized"}


@router.delete("/mcp/session")
async def clear_mcp_session(session_id: str):
    """Clear the MCP session ID"""
    if session_id in mcp_session_ids:
        del mcp_session_ids[session_id]
        return {"status": "cleared"}
    return {"status": "not_found"}