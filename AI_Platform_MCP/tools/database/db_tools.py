import sys
import os
import json
import sqlparse
from sqlalchemy import inspect, text
from mcp.server.fastmcp import Context

# Ensure the project root is in sys.path for importing db_manager
current_dir = os.path.dirname(os.path.abspath(__file__)) # database/
tools_dir = os.path.dirname(current_dir) # tools/
mcp_dir = os.path.dirname(tools_dir) # AI_Platform_MCP/
project_root = os.path.dirname(mcp_dir) # Yakkay/AI_Agent_Platform/

if project_root not in sys.path:
    sys.path.insert(0, project_root)

from ai_engine.app.utils.db_manager import db_manager
from AI_Platform_MCP.app import mcp

try:
    from src.core.logging import get_logger
    logger = get_logger(__name__)
except ImportError:
    import logging
    class SimpleLogger:
        def __init__(self, name):
            self._log = logging.getLogger(name)
        def info(self, msg, **kw): self._log.info(f"{msg} {kw}")
        def warning(self, msg, **kw): self._log.warning(f"{msg} {kw}")
        def error(self, msg, **kw): self._log.error(f"{msg} {kw}")
        def debug(self, msg, **kw): self._log.debug(f"{msg} {kw}")
    logger = SimpleLogger(__name__)


def validate_sql(query: str) -> None:
    """
    Validates a SQL query to ensure it is a single SELECT statement.
    Raises ValueError if validation fails.
    """
    stripped_query = query.strip()
    if not stripped_query:
        raise ValueError("Security Violation: Query is empty.")

    parsed = sqlparse.parse(stripped_query)
    if len(parsed) != 1:
        raise ValueError("Security Violation: Only a single SQL statement is permitted.")

    statement = parsed[0]
    statement_type = statement.get_type()
    
    if statement_type != "SELECT":
        raise ValueError(f"Security Violation: Only SELECT queries are permitted. Got: {statement_type}")


@mcp.tool()
async def list_database_tables(db_connection_id: str, ctx: Context = None) -> str:
    """
    List all tables available in the database connection.

    Args:
        db_connection_id: The unique identifier (MongoDB ObjectId) of the database connection.
    """
    logger.info("list_database_tables called", db_connection_id=db_connection_id)
    try:
        engine = db_manager.get_engine(db_connection_id)
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        return json.dumps({
            "success": True,
            "tables": tables
        }, indent=2)
    except Exception as e:
        logger.error("list_database_tables failed", error=str(e))
        return json.dumps({
            "success": False,
            "error": str(e)
        }, indent=2)


@mcp.tool()
async def get_table_schema(db_connection_id: str, table_names: list, ctx: Context = None) -> str:
    """
    Retrieve columns and data types for the specified tables.

    Args:
        db_connection_id: The unique identifier (MongoDB ObjectId) of the database connection.
        table_names: A list of table names to fetch schemas for.
    """
    logger.info("get_table_schema called", db_connection_id=db_connection_id, table_names=table_names)
    try:
        engine = db_manager.get_engine(db_connection_id)
        inspector = inspect(engine)
        
        schemas = {}
        for table in table_names:
            # Check if table exists in database
            columns = inspector.get_columns(table)
            schemas[table] = [
                {
                    "name": col["name"],
                    "type": str(col["type"]),
                    "nullable": col.get("nullable", True),
                    "default": str(col["default"]) if col.get("default") is not None else None
                }
                for col in columns
            ]
            
        return json.dumps({
            "success": True,
            "schemas": schemas
        }, indent=2)
    except Exception as e:
        logger.error("get_table_schema failed", error=str(e))
        return json.dumps({
            "success": False,
            "error": str(e)
        }, indent=2)


@mcp.tool()
async def read_db(db_connection_id: str, query: str, ctx: Context = None) -> str:
    """
    Execute a validated read-only SELECT SQL query on the database.
    This is the single entry point for all database reads, including schema queries
    and data SELECT statements. Only single SELECT statements are allowed.
    Results are capped at 50 rows.

    Args:
        db_connection_id: The unique identifier (MongoDB ObjectId) of the database connection.
        query: The SELECT query string to execute.
    """
    logger.info("read_db called", db_connection_id=db_connection_id, query=query)
    try:
        # Validate query before connecting/executing
        validate_sql(query)
        
        engine = db_manager.get_engine(db_connection_id)
        
        with engine.connect() as conn:
            result = conn.execute(text(query))
            
            # Extract column names
            columns = list(result.keys())
            
            # Fetch up to 50 rows + 1 extra to check if there are more
            rows = result.fetchmany(51)
            
            has_more = len(rows) > 50
            if has_more:
                rows = rows[:50]
                
            # Serialize rows
            serialized_rows = []
            for row in rows:
                row_dict = {}
                for idx, col in enumerate(columns):
                    val = row[idx]
                    # Handle bytes, decimals, dates/datetimes etc.
                    if isinstance(val, (bytes, bytearray)):
                        row_dict[col] = val.decode('utf-8', errors='replace')
                    elif hasattr(val, 'isoformat'): # datetime / date / time
                        row_dict[col] = val.isoformat()
                    elif hasattr(val, 'to_eng_string'): # decimal
                        row_dict[col] = str(val)
                    else:
                        try:
                            # Try to serialize to test if JSON safe
                            json.dumps(val)
                            row_dict[col] = val
                        except TypeError:
                            row_dict[col] = str(val)
                serialized_rows.append(row_dict)
                
            return json.dumps({
                "success": True,
                "columns": columns,
                "rows": serialized_rows,
                "has_more": has_more
            }, indent=2)
            
    except Exception as e:
        logger.error("read_db failed", error=str(e))
        return json.dumps({
            "success": False,
            "error": str(e)
        }, indent=2)
