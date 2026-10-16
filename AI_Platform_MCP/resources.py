import logging
from AI_Platform_MCP.app import mcp

logger = logging.getLogger("YakkayCoreProtocolMesh.resources")

@mcp.resource(
    "platform://docs/system-guidelines",
    name="System Guidelines Document",
    title="System Guidelines",
    description="Loads platform system markdown instructions for companion agents.",
    mime_type="text/markdown"
)
async def get_system_guidelines() -> str:
    """
    Exposes static, read-only system-level guidelines markdown context.
    
    This provides companion agents with design guidelines and rules for 
    communication across the decoupled microservice mesh.
    """
    logger.info("Serving platform://docs/system-guidelines context resource.")
    
    guidelines_doc = """# Yakkay Core Protocol Guidelines & Design Standards

This document establishes standard patterns for agent execution, metadata sharing,
and cross-service integration across the Yakkay AI Platform.

## 1. Transport Architectures
- **Inter-process (A2A)**: Executed locally using stdin/stdout streams via `--stdio`.
- **Mesh/Remote (SSE)**: Decoupled client connections query tool schemas via port `8080`.

## 2. Resource Management Rules
- Resources must remain read-only and free of execution side-effects.
- Exposed contexts should leverage explicit mime-types to allow caller parsing.

## 3. Tool Registration & Scalability
- Tools must contain descriptive docstrings to facilitate LLM parameter parsing.
- Implement strict Pydantic type validation on all custom tool function schemas.
"""
    return guidelines_doc
