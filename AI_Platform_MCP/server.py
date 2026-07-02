import sys
import os
import argparse
import logging



# Ensure parent and current directory are in sys.path for package and local module resolution
server_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(server_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)
if server_dir not in sys.path:
    sys.path.insert(0, server_dir)

# Import the shared FastMCP instance
from AI_Platform_MCP.app import mcp

# Configure standard error logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stderr)]
)
logger = logging.getLogger("YakkayCoreProtocolMesh")

# Import execution units to bind decorators to the mcp instance
try:
    import AI_Platform_MCP.tools
    import AI_Platform_MCP.tools.google.mail
    import AI_Platform_MCP.tools.microsoft.mail
    import AI_Platform_MCP.tools.general.search
    import AI_Platform_MCP.tools.database.db_tools
    import AI_Platform_MCP.resources
    import AI_Platform_MCP.prompts
    logger.info("Successfully registered all tools, resources, and prompt templates.")
except ImportError as e:
    logger.error(f"Error registering MCP execution decorators: {str(e)}")

def run_server():
    """
    Dual-execution entry point layer.
    Checks CLI flags to determine transport layer.
    """
    parser = argparse.ArgumentParser(description="Yakkay Core Protocol Mesh Server")
    parser.add_argument(
        "--stdio",
        action="store_true",
        help="Use standard I/O pipes for host communication (A2A execution)."
    )
    args = parser.parse_args()

    if args.stdio:
        logger.info("Initializing stdio host communication transport layer...")
        mcp.run(transport="stdio")
    else:
        logger.info("Initializing HTTP Server-Sent Events (SSE) transport layer on port 8080...")
        # Bind the server port to 8080 in runtime settings
        mcp.settings.port = 8080
        mcp.run(transport="sse")

if __name__ == "__main__":
    run_server()
