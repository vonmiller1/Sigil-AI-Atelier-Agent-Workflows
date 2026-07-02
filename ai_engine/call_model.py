import httpx
from typing import Optional, Dict, Any, List

PROVIDER_URL_MAP = {
    "OpenAI": "https://api.openai.com/v1",
    "Groq": "https://api.groq.com/openai/v1",
    "Cerebras": "https://api.cerebras.ai/v1",
    "Gemini": "https://generativelanguage.googleapis.com/v1beta/openai",
    "Mistral": "https://api.mistral.ai/v1"
}

async def execute_chat_completion(
    provider_name: str,
    api_key: str,
    custom_base_url: Optional[str],
    model_id: str,
    messages: List[Dict[str, str]],
    max_tokens: Optional[int] = None
) -> Dict[str, Any]:
    """
    Generic standard method to call any model provider using OpenAI-compatible API format,
    avoiding the need for provider-specific code.
    """
    # 1. Resolve Base URL
    if provider_name in PROVIDER_URL_MAP:
        base_url = PROVIDER_URL_MAP[provider_name]
    else:
        if not custom_base_url:
            return {
                "success": False,
                "status_code": 400,
                "error": "Custom provider selected but no custom_base_url was provided."
            }
        base_url = custom_base_url

    # Normalize url: remove trailing slash, handle OpenRouter, and strip standard API endpoint suffixes
    base_url = base_url.strip()
    if "openrouter.ai" in base_url.lower():
        base_url = "https://openrouter.ai/api/v1"
    else:
        base_url = base_url.rstrip("/")
        for suffix in ["/models", "/chat/completions", "/completions", "/chat"]:
            if base_url.lower().endswith(suffix):
                base_url = base_url[:-len(suffix)]
                base_url = base_url.rstrip("/")
                break

    chat_url = f"{base_url}/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    body = {
        "model": model_id,
        "messages": messages
    }
    
    if max_tokens is not None:
        body["max_tokens"] = max_tokens
    
    try:
        async with httpx.AsyncClient(follow_redirects=True) as client:
            response = await client.post(chat_url, headers=headers, json=body, timeout=30.0)
            
            if response.status_code == 200:
                return {
                    "success": True,
                    "data": response.json()
                }
            else:
                # Capture provider error details if JSON
                try:
                    err_json = response.json()
                    if isinstance(err_json, dict) and "error" in err_json:
                        err_detail = err_json["error"].get("message", str(err_json))
                    else:
                        err_detail = str(err_json)
                except Exception:
                    err_detail = response.text or f"HTTP status {response.status_code}"
                
                return {
                    "success": False,
                    "status_code": response.status_code,
                    "error": err_detail
                }
                
    except httpx.RequestError as e:
        return {
            "success": False,
            "status_code": 503,
            "error": f"Connection error: Could not reach provider endpoint at {chat_url}. {str(e)}"
        }
    except Exception as e:
        return {
            "success": False,
            "status_code": 500,
            "error": f"An unexpected error occurred: {str(e)}"
        }

async def test_model_call(
    provider_name: str,
    api_key: str,
    custom_base_url: Optional[str],
    model_id: str
) -> Dict[str, Any]:
    """
    Attempts to perform a micro-completion check (max_tokens=1) to verify
    if the selected model is available and credentials are valid.
    """
    return await execute_chat_completion(
        provider_name=provider_name,
        api_key=api_key,
        custom_base_url=custom_base_url,
        model_id=model_id,
        messages=[{"role": "user", "content": "ping"}],
        max_tokens=1
    )
