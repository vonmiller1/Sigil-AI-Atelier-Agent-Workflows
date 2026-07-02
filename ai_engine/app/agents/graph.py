from langgraph.graph import StateGraph, END
from langchain_core.messages import SystemMessage, ToolMessage, AIMessage
from app.agents.state import AgentState
from app.tools.mcp_bridge import get_langchain_tools
from app.utils.model_factory import get_llm

async def agent_node(state: AgentState):
    messages = list(state.get("messages", []))
    instructions = state.get("instructions", "")
    model_id = state.get("model_id")
    api_key = state.get("api_key")
    provider_name = state.get("provider_name")

    # Inject database connection context instructions dynamically
    active_dbs = state.get("active_db_ids") or []
    if active_dbs:
        db_info_str = "\n\nYou have access to the following active database connections. Use the corresponding connection ID as the `db_connection_id` parameter to run queries:\n"
        for db in active_dbs:
            db_info_str += f"- Database Name: {db.get('name')}, SQL Dialect/Engine: {db.get('engine')}, Connection ID: {db.get('db_id')}\n"
        db_info_str += "\nWhen querying, construct valid SQL query statements matching the target database's SQL Dialect and execute them using the `read_db` tool.\n"
        instructions = (instructions or "") + db_info_str

    # 1. Prepare messages list for model call
    import datetime
    current_time_str = datetime.datetime.now().strftime("%B %d, %Y at %I:%M %p Local Time")

    formatting_instructions = (
        f"\n\nCurrent Date and Time: {current_time_str}\n\n"
        "Format your responses professionally: use clear paragraphs for explanations, "
        "and use bullet points (separated by newlines, e.g. starting with '- ') for listing multiple items "
        "or list elements (such as emails, labels, names, tools, etc.). "
        "Do not list multiple items on a single line or group them into a flat comma/hyphen-separated sentence. "
        "Bold key terms, labels, or titles using markdown '**' for readability."
    )
    full_instructions = instructions + formatting_instructions if instructions else formatting_instructions

    model_messages = []
    if full_instructions:
        model_messages.append(SystemMessage(content=full_instructions))
    model_messages.extend(messages)

    # 2. Get all tools (MCP + dynamic knowledge base search tools)
    tools = get_all_tools(state)

    # 3. Instantiate dynamic LLM client
    model = get_llm(state)

    # 4. Bind tools if present
    if tools:
        model_to_call = model.bind_tools(tools)
    else:
        model_to_call = model

    # 5. Add thinking trace entry
    trace_entry = {
        "type": "on_llm_start",
        "message": f"🧠 Model evaluating parameters and reasoning about next steps..."
    }

    # 6. Invoke model
    response = await model_to_call.ainvoke(model_messages)

    return {
        "messages": [response],
        "trace": [trace_entry]
    }


def get_all_tools(state: AgentState):
    from app.tools.mcp_bridge import get_langchain_tools
    tools = get_langchain_tools(state.get("tools", []), state.get("auth_vault", {}))

    active_kbs = state.get("active_kb_ids")
    if active_kbs:
        from app.tools.rag_tool import search_knowledge_base
        from langchain_core.tools import StructuredTool
        import re

        for kb in active_kbs:
            kb_id = kb.get("kb_id")
            kb_name = kb.get("name", "knowledge base")

            if kb_id:
                def make_search_tool(k_id, k_name):
                    async def search_fn(query: str) -> str:
                        return await search_knowledge_base(query, k_id)
                    
                    if len(active_kbs) == 1:
                        tool_name = "search_knowledge_base"
                    else:
                        clean_name = re.sub(r'[^a-zA-Z0-9_]', '_', k_name).lower()
                        tool_name = f"search_kb_{clean_name}"

                    return StructuredTool.from_function(
                        coroutine=search_fn,
                        name=tool_name,
                        description=(
                            f"Search the knowledge base '{k_name}' for detailed factual context "
                            f"and documents about: {k_name}."
                        )
                    )
                
                tools.append(make_search_tool(kb_id, kb_name))
    return tools


async def tools_node(state: AgentState):
    messages = state.get("messages", [])
    last_message = messages[-1]

    tools = get_all_tools(state)
    tools_by_name = {tool.name: tool for tool in tools}

    tool_messages = []
    trace_entries = []

    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        for tool_call in last_message.tool_calls:
            name = tool_call["name"]
            arguments = tool_call["args"]
            tool_id = tool_call["id"]

            # Append on_tool_start log
            trace_entries.append({
                "type": "on_tool_start",
                "tool": name,
                "input": arguments
            })

            # Execute tool
            if name in tools_by_name:
                try:
                    tool = tools_by_name[name]
                    output = await tool.ainvoke(arguments)
                except Exception as e:
                    output = f"Error executing tool: {str(e)}"
            else:
                output = f"Error: Tool '{name}' not found."

            # Append on_tool_end log
            trace_entries.append({
                "type": "on_tool_end",
                "tool": name,
                "output": output
            })

            # Append ToolMessage
            tool_messages.append(ToolMessage(content=str(output), name=name, tool_call_id=tool_id))

    return {
        "messages": tool_messages,
        "trace": trace_entries
    }

def should_continue(state: AgentState):
    messages = state.get("messages", [])
    if not messages:
        return END
    last_message = messages[-1]
    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        return "tools"
    return END

# Build the LangGraph state machine
workflow = StateGraph(AgentState)
workflow.add_node("agent", agent_node)
workflow.add_node("tools", tools_node)

workflow.set_entry_point("agent")
workflow.add_conditional_edges("agent", should_continue, {
    "tools": "tools",
    END: END
})
workflow.add_edge("tools", "agent")

compiled_graph = workflow.compile()
