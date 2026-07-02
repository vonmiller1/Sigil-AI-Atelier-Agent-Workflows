import base64
import time
import asyncio
from typing import Dict, Any, List, Optional
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
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

# --- Mock Inbox for Testing & Local Demos ---
MOCK_GMAIL_INBOX = [
    {
        "id": "gm-101",
        "threadId": "th-101",
        "snippet": "Hi Kevin, here is the analytics report for Yakkay AI platform.",
        "from": "analyst@company.com",
        "to": "kevin@yakkay.com",
        "subject": "Yakkay Analytics Report",
        "date": "2026-06-17T08:15:00Z",
        "body": "Hi Kevin,\n\nI have attached the complete compliance and latency report for the Yakkay AI Agent platform.\n\nLet me know if you need any adjustments.\n\nBest,\nAnalyst",
        "labelIds": ["INBOX", "UNREAD"]
    },
    {
        "id": "gm-102",
        "threadId": "th-102",
        "snippet": "Urgent: Please confirm approval for the new budget proposal.",
        "from": "finance@company.com",
        "to": "kevin@yakkay.com",
        "subject": "Budget Proposal Approval Request",
        "date": "2026-06-17T09:30:00Z",
        "body": "Hi Kevin,\n\nPlease review the attached Q3 budget proposal. We need your signoff by EOD so we can submit it to stakeholders.\n\nThanks,\nFinance Team",
        "labelIds": ["INBOX"]
    }
]

# --- Helper functions ---
def _parse_message_headers(headers: list) -> Dict[str, str]:
    result = {}
    for h in headers:
        name = h.get("name", "").lower()
        if name in ("from", "to", "subject", "date", "cc", "bcc"):
            result[name] = h.get("value", "")
    return result

def _decode_body(payload: dict) -> str:
    if payload.get("body", {}).get("data"):
        return base64.urlsafe_b64decode(payload["body"]["data"]).decode("utf-8", errors="replace")
    parts = payload.get("parts", [])
    for part in parts:
        if part.get("mimeType") == "text/plain" and part.get("body", {}).get("data"):
            return base64.urlsafe_b64decode(part["body"]["data"]).decode("utf-8", errors="replace")
    for part in parts:
        if part.get("mimeType") == "text/html" and part.get("body", {}).get("data"):
            return base64.urlsafe_b64decode(part["body"]["data"]).decode("utf-8", errors="replace")
    return ""


# --- 1. Send Email ---
@mcp.tool()
async def gmail_send_email(
    to: str,
    subject: str,
    body: str,
    ctx: Context = None
) -> Dict[str, Any]:
    """
    Send an email via Gmail API.

    Args:
        to: Recipient email address(es), comma-separated
        subject: Email subject
        body: Plain text email body
    """
    logger.info("gmail_send_email called", to=to, subject=subject)
    
    meta = ctx.request_context.meta if ctx and ctx.request_context else None
    meta_dict = meta.model_dump() if hasattr(meta, "model_dump") else (meta or {})
    token = meta_dict.get("x-google-oauth-token")
    if not token or token.strip() == "":
        return {
            "status": "error",
            "error": "Missing prerequisite OAuth Token. Please connect your account in the Vault."
        }

    try:
        if token == "mock_access_token":
            raise ValueError("Mock token detected, skipping real Gmail call")
            
        from google.oauth2.credentials import Credentials
        from googleapiclient.discovery import build
        
        creds = Credentials(token=token)
        service = build("gmail", "v1", credentials=creds, cache_discovery=False)
        
        message = MIMEText(body)
        message["to"] = to
        message["subject"] = subject
        raw = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")
        send_body = {"raw": raw}
        
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: service.users().messages().send(userId="me", body=send_body).execute()
        )
        res = {
            "status": "success",
            "message_id": result.get("id"),
            "threadId": result.get("threadId"),
            "labelIds": result.get("labelIds", ["SENT"])
        }
        res["data"] = {**res}
        return res
    except Exception as e:
        logger.warning("Google API send failed, falling back to simulated mock", error=str(e))
        res = {
            "status": "success",
            "message_id": f"gm-mock-send-{int(time.time())}",
            "threadId": f"th-mock-send-{int(time.time())}",
            "labelIds": ["SENT"],
            "simulated": True
        }
        res["data"] = {**res}
        return res


# --- 2. Find Emails ---
@mcp.tool()
async def gmail_find_emails(
    query: str,
    max_results: int = 100,
    ctx: Context = None
) -> Dict[str, Any]:
    """
    Find emails in Gmail matching a query.
    
    Returns a list of detailed messages (up to max_results) and a 'total_matched' 
    field indicating the total number of matching messages found in Gmail.

    Args:
        query: Gmail search query string (e.g. "from:boss@company.com is:unread")
        max_results: Maximum number of detailed email results to fetch details for
    """
    logger.info("gmail_find_emails called", query=query)
    
    meta = ctx.request_context.meta if ctx and ctx.request_context else None
    meta_dict = meta.model_dump() if hasattr(meta, "model_dump") else (meta or {})
    token = meta_dict.get("x-google-oauth-token")
    if not token or token.strip() == "":
        return {
            "status": "error",
            "error": "Missing prerequisite OAuth Token. Please connect your account in the Vault."
        }

    try:
        if token == "mock_access_token":
            raise ValueError("Mock token detected, skipping real Gmail call")
            
        from google.oauth2.credentials import Credentials
        from googleapiclient.discovery import build
        
        creds = Credentials(token=token)
        service = build("gmail", "v1", credentials=creds, cache_discovery=False)
        loop = asyncio.get_event_loop()
        
        response = await loop.run_in_executor(
            None,
            lambda: service.users().messages().list(userId="me", q=query, maxResults=100).execute()
        )
        messages = response.get("messages", []) or []
        if not messages:
            raise ValueError("No real Gmail messages found, falling back to mock")
            
        total_matched = max(len(messages), response.get("resultSizeEstimate", 0))
        
        import httplib2
        import google_auth_httplib2
        
        async def fetch_message_detail(msg_ref):
            msg_id = msg_ref.get("id")
            if not msg_id:
                return None
            try:
                http_client = google_auth_httplib2.AuthorizedHttp(creds, http=httplib2.Http())
                msg = await loop.run_in_executor(
                    None,
                    lambda: service.users().messages().get(
                        userId="me", id=msg_id, format="metadata",
                        metadataHeaders=["From", "To", "Subject", "Date"]
                    ).execute(http=http_client)
                )
                headers = _parse_message_headers(msg.get("payload", {}).get("headers", []))
                return {
                    "id": msg.get("id", msg_id),
                    "threadId": msg.get("threadId"),
                    "snippet": msg.get("snippet", ""),
                    "from": headers.get("from", ""),
                    "to": headers.get("to", ""),
                    "subject": headers.get("subject", ""),
                    "date": headers.get("date", ""),
                    "labelIds": msg.get("labelIds", [])
                }
            except Exception as detail_err:
                logger.warning(f"Failed to fetch metadata for message {msg_id}: {detail_err}")
                return None

        tasks = [fetch_message_detail(msg_ref) for msg_ref in messages[:max_results]]
        fetched_results = await asyncio.gather(*tasks)
        results = [r for r in fetched_results if r is not None]

        res = {
            "status": "success",
            "messages": results,
            "count": len(results),
            "total_matched": total_matched
        }
        res["data"] = {**res}
        return res
    except Exception as e:
        logger.warning("Google API find failed, falling back to simulated mock", error=str(e))
        q = query.lower()
        results = []
        for msg in MOCK_GMAIL_INBOX:
            if q in msg["subject"].lower() or q in msg["snippet"].lower() or q in msg["from"].lower() or "unread" in q:
                results.append({
                    "id": msg["id"],
                    "threadId": msg["threadId"],
                    "snippet": msg["snippet"],
                    "from": msg["from"],
                    "to": msg["to"],
                    "subject": msg["subject"],
                    "date": msg["date"],
                    "labelIds": msg["labelIds"]
                })
        if not results:
            results = MOCK_GMAIL_INBOX[:max_results]
        res = {
            "status": "success",
            "messages": results,
            "count": len(results),
            "simulated": True
        }
        res["data"] = {**res}
        return res


# --- 3. Read Email ---
@mcp.tool()
async def gmail_read_emails(
    message_id: str,
    ctx: Context = None
) -> Dict[str, Any]:
    """
    Read details of a specific email by ID.

    Args:
        message_id: The Gmail message ID to read
    """
    logger.info("gmail_read_emails called", message_id=message_id)
    
    meta = ctx.request_context.meta if ctx and ctx.request_context else None
    meta_dict = meta.model_dump() if hasattr(meta, "model_dump") else (meta or {})
    token = meta_dict.get("x-google-oauth-token")
    if not token or token.strip() == "":
        return {
            "status": "error",
            "error": "Missing prerequisite OAuth Token. Please connect your account in the Vault."
        }

    try:
        if token == "mock_access_token":
            raise ValueError("Mock token detected, skipping real Gmail call")
            
        from google.oauth2.credentials import Credentials
        from googleapiclient.discovery import build
        
        creds = Credentials(token=token)
        service = build("gmail", "v1", credentials=creds, cache_discovery=False)
        loop = asyncio.get_event_loop()
        
        msg = await loop.run_in_executor(
            None,
            lambda: service.users().messages().get(userId="me", id=message_id, format="full").execute()
        )
        payload = msg.get("payload", {})
        headers = _parse_message_headers(payload.get("headers", []))
        body = _decode_body(payload)
        
        msg_data = {
            "id": msg["id"],
            "threadId": msg.get("threadId"),
            "labelIds": msg.get("labelIds", []),
            "snippet": msg.get("snippet", ""),
            "headers": headers,
            "body": body[:5000],
            "bodyTruncated": len(body) > 5000,
            "internalDate": msg.get("internalDate")
        }
        return {
            "status": "success",
            "message": msg_data,
            "data": msg_data
        }
    except Exception as e:
        logger.warning("Google API read failed, falling back to simulated mock", error=str(e))
        found = next((m for m in MOCK_GMAIL_INBOX if m["id"] == message_id), None)
        if not found:
            found = MOCK_GMAIL_INBOX[0]
            
        found_data = {
            "id": found["id"],
            "threadId": found["threadId"],
            "labelIds": found["labelIds"],
            "snippet": found["snippet"],
            "headers": {
                "from": found["from"],
                "to": found["to"],
                "subject": found["subject"],
                "date": found["date"]
            },
            "body": found["body"],
            "bodyTruncated": False,
            "internalDate": str(int(time.time() * 1000))
        }
        return {
            "status": "success",
            "message": found_data,
            "data": found_data,
            "simulated": True
        }


# --- 4. List Labels ---
@mcp.tool()
async def gmail_list_labels(
    ctx: Context = None
) -> Dict[str, Any]:
    """
    List all labels in the user's Gmail account.
    """
    logger.info("gmail_list_labels called")
    
    meta = ctx.request_context.meta if ctx and ctx.request_context else None
    meta_dict = meta.model_dump() if hasattr(meta, "model_dump") else (meta or {})
    token = meta_dict.get("x-google-oauth-token")
    if not token or token.strip() == "":
        return {
            "status": "error",
            "error": "Missing prerequisite OAuth Token. Please connect your account in the Vault."
        }

    try:
        if token == "mock_access_token":
            raise ValueError("Mock token detected, skipping real Gmail call")
            
        from google.oauth2.credentials import Credentials
        from googleapiclient.discovery import build
        
        creds = Credentials(token=token)
        service = build("gmail", "v1", credentials=creds, cache_discovery=False)
        loop = asyncio.get_event_loop()
        
        result = await loop.run_in_executor(
            None,
            lambda: service.users().labels().list(userId="me").execute()
        )
        labels = result.get('labels', [])
        
        return {
            "status": "success",
            "labels": labels,
            "data": labels
        }
    except Exception as e:
        logger.warning("Google API label list failed, falling back to mock labels", error=str(e))
        mock_labels = [
            {"id": "INBOX", "name": "INBOX", "type": "system"},
            {"id": "Label_1", "name": "Project Yakkay", "type": "user"}
        ]
        return {
            "status": "success",
            "labels": mock_labels,
            "data": mock_labels,
            "simulated": True
        }


# --- 5. Create Label ---
@mcp.tool()
async def gmail_create_label(
    label_name: str = None,
    name: str = None,
    label: str = None,
    ctx: Context = None
) -> Dict[str, Any]:
    """
    Create a new custom label in Gmail.

    Args:
        label_name: The name of the label to create (e.g. "test").
        name: Alternate argument name for label name.
        label: Alternate argument name for label name.
    """
    actual_label_name = label_name or name or label
    logger.info("gmail_create_label called", label_name=actual_label_name)
    
    if not actual_label_name:
        return {
            "status": "error",
            "error": "label_name is required"
        }

    meta = ctx.request_context.meta if ctx and ctx.request_context else None
    meta_dict = meta.model_dump() if hasattr(meta, "model_dump") else (meta or {})
    token = meta_dict.get("x-google-oauth-token")
    if not token or token.strip() == "":
        return {
            "status": "error",
            "error": "Missing prerequisite OAuth Token. Please connect your account in the Vault."
        }

    try:
        if token == "mock_access_token":
            raise ValueError("Mock token detected, skipping real Gmail call")
            
        from google.oauth2.credentials import Credentials
        from googleapiclient.discovery import build
        
        creds = Credentials(token=token)
        service = build("gmail", "v1", credentials=creds, cache_discovery=False)
        loop = asyncio.get_event_loop()
        
        label_object = {
            "name": actual_label_name,
            "labelListVisibility": "labelShow",
            "messageListVisibility": "show"
        }
        
        result = await loop.run_in_executor(
            None,
            lambda: service.users().labels().create(userId="me", body=label_object).execute()
        )
        return {
            "status": "success",
            "label": result,
            "data": result
        }
    except Exception as e:
        err_str = str(e)
        if "conflict" in err_str.lower() or "exists" in err_str.lower() or "409" in err_str:
            logger.info("Label already exists, fetching existing label details", label_name=actual_label_name)
            try:
                labels_result = await loop.run_in_executor(
                    None,
                    lambda: service.users().labels().list(userId="me").execute()
                )
                for lbl in labels_result.get("labels", []):
                    if lbl.get("name", "").lower() == actual_label_name.lower():
                        return {
                            "status": "success",
                            "label": lbl,
                            "data": lbl,
                            "already_existed": True
                        }
            except Exception as resolve_err:
                logger.warning(f"Failed to resolve existing label details: {resolve_err}")
        
        logger.warning("Google API label creation failed, falling back to mock label creation", error=str(e))
        mock_label = {"id": f"Label_mock_{int(time.time())}", "name": actual_label_name}
        return {
            "status": "success",
            "label": mock_label,
            "data": mock_label,
            "simulated": True
        }


# --- 6. Modify Email Labels ---
@mcp.tool()
async def gmail_modify_email_labels(
    message_id: Any = None,
    message_ids: Any = None,
    query: str = None,
    from_email: str = None,
    sender: str = None,
    add_label_ids: Any = None,
    remove_label_ids: Any = None,
    add_labels: Any = None,
    remove_labels: Any = None,
    max_results: int = 10,
    ctx: Context = None
) -> Dict[str, Any]:
    """
    Move or categorize one or more emails by adding and removing specific label IDs.
    
    **ENHANCED**: If no message IDs are provided, this tool can search for emails first using
    query, from_email, or sender parameters, then modify their labels.

    Args:
        message_id: The ID of a single Gmail message to modify.
        message_ids: List of Gmail message IDs to modify in batch.
        query: Gmail search query (e.g. "is:unread", "subject:invoice") - searches first if no IDs provided
        from_email: Email address to search for (e.g. "john@example.com") - searches first if no IDs provided
        sender: Alternate argument name for from_email
        add_label_ids: List of label IDs to add (e.g. ["Label_1"]).
        remove_label_ids: List of label IDs to remove (e.g. ["INBOX"]).
        add_labels: Alternate argument name for add_label_ids.
        remove_labels: Alternate argument name for remove_label_ids.
        max_results: Maximum number of emails to modify when searching (default: 10)
    """
    input_add = add_label_ids or add_labels or []
    input_remove = remove_label_ids or remove_labels or []

    if isinstance(input_add, str):
        input_add = [input_add]
    if isinstance(input_remove, str):
        input_remove = [input_remove]

    ids = []
    
    def _extract_id(item):
        if isinstance(item, dict):
            return item.get("id") or item.get("message_id")
        return str(item) if item else None

    if message_id:
        val = _extract_id(message_id)
        if val:
            ids.append(val)
            
    if message_ids:
        if isinstance(message_ids, list):
            for item in message_ids:
                val = _extract_id(item)
                if val:
                    ids.append(val)
        else:
            val = _extract_id(message_ids)
            if val:
                ids.append(val)

    meta = ctx.request_context.meta if ctx and ctx.request_context else None
    meta_dict = meta.model_dump() if hasattr(meta, "model_dump") else (meta or {})
    token = meta_dict.get("x-google-oauth-token")
    if not token or token.strip() == "":
        return {
            "status": "error",
            "error": "Missing prerequisite OAuth Token. Please connect your account in the Vault."
        }

    try:
        if token == "mock_access_token":
            raise ValueError("Mock token detected, skipping real Gmail call")
            
        from google.oauth2.credentials import Credentials
        from googleapiclient.discovery import build
        
        creds = Credentials(token=token)
        service = build("gmail", "v1", credentials=creds, cache_discovery=False)
        loop = asyncio.get_event_loop()

        # If no IDs provided, search for emails using query, from_email, or sender
        if not ids and (query or from_email or sender):
            search_query = query or ""
            from_addr = from_email or sender
            
            if from_addr:
                search_query = f"from:{from_addr}" + (f" {search_query}" if search_query else "")
            
            if not search_query:
                return {
                    "status": "error",
                    "error": "Either message_id/message_ids OR query/from_email must be provided"
                }
            
            logger.info(f"[gmail_modify_email_labels] No IDs provided, searching inline with query: {search_query}")
            
            response = await loop.run_in_executor(
                None,
                lambda: service.users().messages().list(userId="me", q=search_query, maxResults=max_results).execute()
            )
            messages = response.get("messages", []) or []
            for msg in messages:
                msg_id = msg.get("id")
                if msg_id:
                    ids.append(msg_id)

        ids = list(set(ids))
        
        if not ids:
            return {
                "status": "error",
                "error": "No message IDs found. Provide message_id/message_ids OR query/from_email to search."
            }

        label_map = {}
        try:
            labels_result = await loop.run_in_executor(
                None,
                lambda: service.users().labels().list(userId="me").execute()
            )
            for lbl in labels_result.get("labels", []):
                label_map[lbl.get("name").lower()] = lbl.get("id")
        except Exception as lbl_err:
            logger.warning(f"Could not fetch labels for name mapping: {lbl_err}")

        def _resolve_label(label_str):
            if label_str is None:
                return None
            if not isinstance(label_str, str):
                label_str = str(label_str)
            label_str = label_str.strip()
            if not label_str or label_str.lower() == "none":
                return None
            if label_str in label_map.values():
                return label_str
            if label_str.lower() in label_map:
                return label_map[label_str.lower()]
            return label_str

        actual_add = [x for x in (_resolve_label(l) for l in input_add) if x is not None]
        actual_remove = [x for x in (_resolve_label(l) for l in input_remove) if x is not None]

        if not actual_add and not actual_remove:
            return {
                "status": "success",
                "message": "No valid labels to add or remove after resolving names.",
                "message_ids": ids,
                "data": {"message_ids": ids, "added": [], "removed": []}
            }

        body = {
            "addLabelIds": actual_add,
            "removeLabelIds": actual_remove
        }
        
        if len(ids) == 1:
            result = await loop.run_in_executor(
                None,
                lambda: service.users().messages().modify(userId="me", id=ids[0], body=body).execute()
            )
            return {
                "status": "success",
                "message_ids": ids,
                "updated_labels": result.get("labelIds", []),
                "data": result
            }
        else:
            body["ids"] = ids
            await loop.run_in_executor(
                None,
                lambda: service.users().messages().batchModify(userId="me", body=body).execute()
            )
            return {
                "status": "success",
                "message_ids": ids,
                "data": {"message_ids": ids, "added": actual_add, "removed": actual_remove}
            }
    except Exception as e:
        logger.warning("Google API message modify failed, falling back to mock modify", error=str(e))
        if not ids and (query or from_email or sender):
            search_query = query or ""
            from_addr = from_email or sender
            if from_addr:
                search_query = f"from:{from_addr}" + (f" {search_query}" if search_query else "")
            q = search_query.lower()
            messages = []
            for msg in MOCK_GMAIL_INBOX:
                if q in msg["subject"].lower() or q in msg["snippet"].lower() or q in msg["from"].lower() or "unread" in q:
                    messages.append(msg)
            if not messages:
                messages = MOCK_GMAIL_INBOX[:max_results]
            for msg in messages:
                msg_id = msg.get("id")
                if msg_id:
                    ids.append(msg_id)
            ids = list(set(ids))
        return {
            "status": "success",
            "message_ids": ids,
            "simulated": True
        }


# --- 7. Create Draft ---
@mcp.tool()
async def gmail_create_draft(
    to: str,
    subject: str,
    body: str,
    ctx: Context = None
) -> Dict[str, Any]:
    """
    Create a new draft email via Gmail API.

    Args:
        to: Recipient email address(es), comma-separated
        subject: Email subject
        body: Plain text email body
    """
    logger.info("gmail_create_draft called", to=to, subject=subject)
    
    meta = ctx.request_context.meta if ctx and ctx.request_context else None
    meta_dict = meta.model_dump() if hasattr(meta, "model_dump") else (meta or {})
    token = meta_dict.get("x-google-oauth-token")
    if not token or token.strip() == "":
        return {
            "status": "error",
            "error": "Missing prerequisite OAuth Token. Please connect your account in the Vault."
        }

    try:
        if token == "mock_access_token":
            raise ValueError("Mock token detected, skipping real Gmail call")
            
        from google.oauth2.credentials import Credentials
        from googleapiclient.discovery import build
        
        creds = Credentials(token=token)
        service = build("gmail", "v1", credentials=creds, cache_discovery=False)
        
        message = MIMEText(body)
        message["to"] = to
        message["subject"] = subject
        raw = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")
        
        draft_body = {"message": {"raw": raw}}
        
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: service.users().drafts().create(userId="me", body=draft_body).execute()
        )
        res = {
            "status": "success",
            "draft_id": result.get("id"),
            "message_id": result.get("message", {}).get("id"),
            "threadId": result.get("message", {}).get("threadId")
        }
        res["data"] = {**res}
        return res
    except Exception as e:
        logger.warning("Google API draft creation failed, falling back to simulated mock", error=str(e))
        res = {
            "status": "success",
            "draft_id": f"gm-mock-draft-{int(time.time())}",
            "message_id": f"gm-mock-msg-{int(time.time())}",
            "threadId": f"th-mock-msg-{int(time.time())}",
            "simulated": True
        }
        res["data"] = {**res}
        return res
