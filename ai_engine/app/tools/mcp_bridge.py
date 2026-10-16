import os
import sys
import asyncio
from typing import Dict, Any, List
from langchain_core.tools import StructuredTool

# Resolve workspace root to import AI_Platform_MCP
current_dir = os.path.dirname(os.path.abspath(__file__))
app_dir = os.path.dirname(current_dir)
engine_dir = os.path.dirname(app_dir)
workspace_root = os.path.dirname(engine_dir)

if workspace_root not in sys.path:
    sys.path.insert(0, workspace_root)

# Mock classes to simulate FastMCP request context containing the token
class MockMeta:
    def __init__(self, data):
        self._data = data

    def model_dump(self):
        return self._data

class MockRequestContext:
    def __init__(self, meta_data):
        self.meta = MockMeta(meta_data)

class MockContext:
    def __init__(self, meta_data):
        self.request_context = MockRequestContext(meta_data)

async def call_mcp_tool(name: str, arguments: dict, auth_vault: dict) -> str:
    # Ensure tool packages are registered in mcp instance
    import AI_Platform_MCP.tools.google.mail
    import AI_Platform_MCP.tools.microsoft.mail
    import AI_Platform_MCP.tools.general.search
    import AI_Platform_MCP.tools.database.db_tools
    from AI_Platform_MCP.app import mcp

    # 1. Construct context mapping user's OAuth tokens
    meta_data = {}
    if name.startswith("gmail_") or name.startswith("google_"):
        google_vault = auth_vault.get("google") or {}
        token = google_vault.get("access_token")
        if token:
            meta_data = {"x-google-oauth-token": token}
    elif name.startswith("outlook_") or name.startswith("microsoft_"):
        ms_vault = auth_vault.get("microsoft") or {}
        token = ms_vault.get("access_token")
        if token:
            meta_data = {"x-microsoft-oauth-token": token}

    ctx = MockContext(meta_data)

    # 2. Call the tool manager directly with our context
    result = await mcp._tool_manager.call_tool(
        name,
        arguments,
        context=ctx,
        convert_result=True
    )

    # 3. Format result payload into standard clean string representation
    if isinstance(result, dict) and "content" in result:
        blocks = result["content"]
        if isinstance(blocks, list) and len(blocks) > 0:
            return "\n".join(b.get("text", "") for b in blocks if b.get("type") == "text")
    elif isinstance(result, list):
        texts = []
        for block in result:
            if hasattr(block, "text"):
                texts.append(block.text)
            elif isinstance(block, dict) and "text" in block:
                texts.append(block["text"])
            else:
                texts.append(str(block))
        return "\n".join(texts)

    return str(result)

def get_langchain_tools(selected_tool_names: List[str], auth_vault: dict) -> List[StructuredTool]:
    # Import tools to trigger FastMCP decorator registration
    import AI_Platform_MCP.tools.google.mail
    import AI_Platform_MCP.tools.microsoft.mail
    import AI_Platform_MCP.tools.general.search
    import AI_Platform_MCP.tools.database.db_tools
    from AI_Platform_MCP.app import mcp

    mcp_tools = mcp._tool_manager.list_tools()
    langchain_tools = []

    for tool_info in mcp_tools:
        if tool_info.name not in selected_tool_names:
            continue

        # Use a closure helper function to avoid lazy evaluation issues in loop
        def create_wrapper(t_name):
            async def run_tool(**kwargs):
                return await call_mcp_tool(t_name, kwargs, auth_vault)
            return run_tool

        lc_tool = StructuredTool(
            name=tool_info.name,
            description=tool_info.description or "",
            args_schema=tool_info.fn_metadata.arg_model,
            coroutine=create_wrapper(tool_info.name)
        )
        langchain_tools.append(lc_tool)

    return langchain_tools
