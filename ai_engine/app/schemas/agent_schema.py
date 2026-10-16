from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class AgentConfig(BaseModel):
    instructions: str = Field(..., description="System prompt instructions")
    tools: List[str] = Field(..., description="List of selected tool names")
    model_id: str = Field(..., description="Model ID to invoke")
    provider_name: str = Field(..., description="Model provider name")
    api_key: str = Field(..., description="API Access Key for the model provider")
    custom_base_url: Optional[str] = Field(None, description="Custom base URL for the model provider")
    active_kb_ids: Optional[List[Dict[str, str]]] = Field(default=None, description="List of active knowledge base objects containing kb_id and name")
    active_db_ids: Optional[List[Dict[str, str]]] = Field(default=None, description="List of active database connection objects containing db_id, name, and engine")

class RunRequest(BaseModel):
    prompt: str = Field(..., description="The user prompt to execute")
    agent_config: AgentConfig = Field(..., description="Active configuration of the agent")
    auth_vault: Dict[str, Any] = Field(default_factory=dict, description="Active user's OAuth credentials")
