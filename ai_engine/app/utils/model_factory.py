import os
from app.agents.state import AgentState
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI

def clean_base_url(url: str) -> str:
    if not url:
        return ""
    url = url.strip()
    if "openrouter.ai" in url.lower():
        return "https://openrouter.ai/api/v1"
    url = url.rstrip("/")
    for suffix in ["/models", "/chat/completions", "/completions", "/chat"]:
        if url.lower().endswith(suffix):
            url = url[:-len(suffix)]
            url = url.rstrip("/")
            break
    return url

def get_llm(state: AgentState):
    provider = str(state.get("provider_name", "")).strip().lower()
    model_id = state.get("model_id")
    api_key = state.get("api_key")
    custom_base_url = state.get("custom_base_url")

    # Mapped standard base URLs
    PROVIDER_URL_MAP = {
        "openai": "https://api.openai.com/v1",
        "groq": "https://api.groq.com/openai/v1",
        "cerebras": "https://api.cerebras.ai/v1",
        "mistral": "https://api.mistral.ai/v1"
    }

    if provider == "gemini":
        model = ChatGoogleGenerativeAI(
            model=model_id,
            google_api_key=api_key,
            temperature=0.2
        )
    else:
        base_url = None
        if provider in PROVIDER_URL_MAP:
            base_url = PROVIDER_URL_MAP[provider]
        elif custom_base_url:
            base_url = clean_base_url(custom_base_url)

        # Use ChatOpenAI for OpenAI-compatible endpoints
        if base_url:
            model = ChatOpenAI(
                model=model_id,
                api_key=api_key,
                base_url=base_url,
                temperature=0.2
            )
        else:
            # Fallback to standard OpenAI if base_url is unspecified
            model = ChatOpenAI(
                model=model_id,
                api_key=api_key,
                temperature=0.2
            )

    from app.utils.governed_model import GovernedChatModel
    return GovernedChatModel(inner_model=model)
