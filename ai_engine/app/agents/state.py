from typing import TypedDict, Annotated, Sequence, Dict, Any, List, Optional
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages

def append_trace(left: list, right: list) -> list:
    return (left or []) + (right or [])

class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], add_messages]
    instructions: str
    tools: List[str]
    auth_vault: Dict[str, Any]
    provider_name: str
    api_key: str
    custom_base_url: Optional[str]
    model_id: str
    active_kb_ids: Optional[List[Dict[str, str]]]
    active_db_ids: Optional[List[Dict[str, str]]]
    trace: Annotated[List[Dict[str, Any]], append_trace]
