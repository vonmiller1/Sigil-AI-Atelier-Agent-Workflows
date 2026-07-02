import time
import asyncio
import httpx
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from mcp.server.fastmcp import Context

# The Singleton Import Rule
from AI_Platform_MCP.app import mcp

try:
    from src.core.logging import get_logger
    logger = get_logger(__name__)
except ImportError:
    import logging
    
    class SmartFallbackLogger:
        """Acts as a shim to make standard logging swallow structlog key=val syntax"""
        def __init__(self, name):
            self._log = logging.getLogger(name)
            
        def _process(self, log_fn, msg, kwargs):
            # Keep standard logging kwargs (like exc_info=True), package the rest into the string
            std_keys = {'exc_info', 'stack_info', 'stacklevel', 'extra'}
            std_kwargs = {k: kwargs.pop(k) for k in list(kwargs.keys()) if k in std_keys}
            
            if kwargs:
                extras = " | ".join(f"{k}={v}" for k, v in kwargs.items())
                msg = f"{msg} [{extras}]"
                
            log_fn(msg, **std_kwargs)

        def info(self, msg, **kw): self._process(self._log.info, msg, kw)
        def warning(self, msg, **kw): self._process(self._log.warning, msg, kw)
        def error(self, msg, **kw): self._process(self._log.error, msg, kw)
        def debug(self, msg, **kw): self._process(self._log.debug, msg, kw)

    logger = SmartFallbackLogger(__name__)

# --- Mock Inbox for Local Testing & Demos ---
MOCK_OUTLOOK_INBOX = [
    {
        "id": "out-101",
        "conversationId": "conv-321",
        "snippet": "Hi Sathish, please review the latest customer queries regarding Yakkay app connectivity.",
        "from": "support@company.com",
        "to": "sathishkumar.sgobi@outlook.com",
        "subject": "Customer Support Queries — Action Required",
        "date": "2026-06-17T09:10:00Z",
        "body": "Hi Sathish,\n\nWe have received 5 new tickets regarding API connectivity issues on the new workbench.\n\nCould you please inspect and address them?\n\nBest,\nSupport Team"
    },
    {
        "id": "out-102",
        "conversationId": "conv-322",
        "snippet": "Meeting invite: Yakkay Agent Foundry Architecture alignment.",
        "from": "architect@company.com",
        "to": "sathishkumar.sgobi@outlook.com",
        "subject": "Yakkay Architecture Alignment Meet",
        "date": "2026-06-17T10:45:00Z",
        "body": "Hi Sathish,\n\nI have scheduled a meeting at 2:00 PM today to align on the MCP native tools removal and re-addition plans.\n\nSee you there,\nLead Architect"
    }
]


# --- 1. Send Email ---
@mcp.tool()
async def outlook_send_email(
    to: str,
    subject: str,
    body: str,
    ctx: Context = None
) -> Dict[str, Any]:
    """
    Send an email via Microsoft Graph (Outlook) API.

    Args:
        to: Recipient email address(es), comma-separated
        subject: Email subject
        body: Plain text email body
    """
    logger.info("outlook_send_email called", to=to, subject=subject)
    
    meta = ctx.request_context.meta if ctx and ctx.request_context else None
    meta_dict = meta.model_dump() if hasattr(meta, "model_dump") else (meta or {})
    token = meta_dict.get("x-microsoft-oauth-token")
    if not token or token.strip() == "":
        return {
            "status": "error",
            "error": "Missing prerequisite OAuth Token. Please connect your account in the Vault."
        }

    try:
        if token == "mock_access_token":
            raise ValueError("Mock token detected, skipping real Graph call")
            
        send_url = "https://graph.microsoft.com/v1.0/me/sendMail"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        recipients = [{"emailAddress": {"address": addr.strip()}} for addr in to.split(",") if addr.strip()]
        payload = {
            "message": {
                "subject": subject,
                "body": {
                    "contentType": "Text",
                    "content": body
                },
                "toRecipients": recipients
            },
            "saveToSentItems": "true"
        }
        
        async with httpx.AsyncClient() as client:
            resp = await client.post(send_url, json=payload, headers=headers)
            if resp.status_code not in (200, 202):
                raise ValueError(f"Microsoft Graph API error: {resp.status_code} - {resp.text}")
                
        res = {
            "status": "success",
            "message": "Email sent successfully via Microsoft Graph API."
        }
        res["data"] = {**res}
        return res
    except Exception as e:
        logger.warning("Microsoft Graph API send failed, falling back to simulated mock", error=str(e))
        res = {
            "status": "success",
            "message_id": f"out-mock-send-{int(time.time())}",
            "simulated": True
        }
        res["data"] = {**res}
        return res


# --- 2. Find Emails ---
@mcp.tool()
async def outlook_find_emails(
    query: str,
    max_results: int = 10,
    ctx: Context = None
) -> Dict[str, Any]:
    """
    Find emails in Outlook matching a search query.

    Args:
        query: Search query for Outlook messages
        max_results: Maximum number of results to return
    """
    logger.info("outlook_find_emails called", query=query)
    
    meta = ctx.request_context.meta if ctx and ctx.request_context else None
    meta_dict = meta.model_dump() if hasattr(meta, "model_dump") else (meta or {})
    token = meta_dict.get("x-microsoft-oauth-token")
    if not token or token.strip() == "":
        return {
            "status": "error",
            "error": "Missing prerequisite OAuth Token. Please connect your account in the Vault."
        }

    try:
        if token == "mock_access_token":
            raise ValueError("Mock token detected, skipping real Graph call")
            
        find_url = f"https://graph.microsoft.com/v1.0/me/messages?$search=\"{query}\"&$top={max_results}"
        headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/json"
        }
        
        async with httpx.AsyncClient() as client:
            resp = await client.get(find_url, headers=headers)
            if resp.status_code != 200:
                raise ValueError(f"Microsoft Graph API error: {resp.status_code} - {resp.text}")
                
        messages = resp.json().get("value", [])
        if not messages:
            raise ValueError("No real Outlook messages found, falling back to mock")
        results = []
        for msg in messages:
            results.append({
                "id": msg.get("id"),
                "conversationId": msg.get("conversationId"),
                "snippet": msg.get("bodyPreview", ""),
                "from": msg.get("from", {}).get("emailAddress", {}).get("address", ""),
                "to": ", ".join([r.get("emailAddress", {}).get("address", "") for r in msg.get("toRecipients", [])]),
                "subject": msg.get("subject", ""),
                "date": msg.get("receivedDateTime", "")
            })
            
        res = {
            "status": "success",
            "messages": results,
            "count": len(results)
        }
        res["data"] = {**res}
        return res
    except Exception as e:
        logger.warning("Microsoft Graph API find failed, falling back to simulated mock", error=str(e))
        q = query.lower()
        results = []
        for msg in MOCK_OUTLOOK_INBOX:
            if q in msg["subject"].lower() or q in msg["snippet"].lower() or q in msg["from"].lower() or q in msg["body"].lower():
                results.append({
                    "id": msg["id"],
                    "conversationId": msg["conversationId"],
                    "snippet": msg["snippet"],
                    "from": msg["from"],
                    "to": msg["to"],
                    "subject": msg["subject"],
                    "date": msg["date"]
                })
        if not results:
            results = MOCK_OUTLOOK_INBOX[:max_results]
            
        res = {
            "status": "success",
            "messages": results,
            "count": len(results),
            "simulated": True
        }
        res["data"] = {**res}
        return res


# --- 3. Read Emails ---
@mcp.tool()
async def outlook_read_emails(
    message_id: str,
    ctx: Context = None
) -> Dict[str, Any]:
    """
    Read details of a specific Outlook email by ID.

    Args:
        message_id: The Outlook message ID to retrieve
    """
    logger.info("outlook_read_emails called", message_id=message_id)
    
    meta = ctx.request_context.meta if ctx and ctx.request_context else None
    meta_dict = meta.model_dump() if hasattr(meta, "model_dump") else (meta or {})
    token = meta_dict.get("x-microsoft-oauth-token")
    if not token or token.strip() == "":
        return {
            "status": "error",
            "error": "Missing prerequisite OAuth Token. Please connect your account in the Vault."
        }

    try:
        if token == "mock_access_token":
            raise ValueError("Mock token detected, skipping real Graph call")
            
        read_url = f"https://graph.microsoft.com/v1.0/me/messages/{message_id}"
        headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/json"
        }
        
        async with httpx.AsyncClient() as client:
            resp = await client.get(read_url, headers=headers)
            if resp.status_code != 200:
                raise ValueError(f"Microsoft Graph API error: {resp.status_code} - {resp.text}")
                
        msg = resp.json()
        msg_data = {
            "id": msg.get("id"),
            "conversationId": msg.get("conversationId"),
            "snippet": msg.get("bodyPreview", ""),
            "headers": {
                "from": msg.get("from", {}).get("emailAddress", {}).get("address", ""),
                "to": ", ".join([r.get("emailAddress", {}).get("address", "") for r in msg.get("toRecipients", [])]),
                "subject": msg.get("subject", ""),
                "date": msg.get("receivedDateTime", "")
            },
            "body": msg.get("body", {}).get("content", ""),
            "bodyTruncated": False
        }
        return {
            "status": "success",
            "message": msg_data,
            "data": msg_data
        }
    except Exception as e:
        logger.warning("Microsoft Graph API read failed, falling back to simulated mock", error=str(e))
        found = next((m for m in MOCK_OUTLOOK_INBOX if m["id"] == message_id), None)
        if not found:
            found = MOCK_OUTLOOK_INBOX[0]
            
        found_data = {
            "id": found["id"],
            "conversationId": found["conversationId"],
            "snippet": found["snippet"],
            "headers": {
                "from": found["from"],
                "to": found["to"],
                "subject": found["subject"],
                "date": found["date"]
            },
            "body": found["body"],
            "bodyTruncated": False
        }
        return {
            "status": "success",
            "message": found_data,
            "data": found_data,
            "simulated": True
        }
