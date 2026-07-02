import sys
import os

# Add the ai_engine directory to the path so we can import app.agents.graph
workspace_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
ai_engine_path = os.path.join(workspace_root, "ai_engine")
sys.path.insert(0, ai_engine_path)

def generate():
    try:
        print("Importing compiled graph from AI engine agents...")
        from app.agents.graph import compiled_graph
    except Exception as e:
        print(f"[ERROR] Failed to import app.agents.graph: {e}")
        print("Please check that the system path includes the 'ai_engine' directory.")
        return
        
    diagrams_dir = os.path.dirname(os.path.abspath(__file__))
    os.makedirs(diagrams_dir, exist_ok=True)
    
    print("Fetching LangGraph graph object...")
    graph_obj = compiled_graph.get_graph()
    
    # 1. Generate Mermaid Markdown
    mermaid_code = graph_obj.draw_mermaid()
    mermaid_file = os.path.join(diagrams_dir, "playground_graph.md")
    
    with open(mermaid_file, "w", encoding="utf-8") as f:
        f.write("# Honest LangGraph Playground Execution Flow (Generated)\n\n")
        f.write("```mermaid\n")
        f.write(mermaid_code)
        f.write("\n```\n")
    print(f"Mermaid source successfully saved to: {mermaid_file}")
    
    # 2. Try to generate PNG using LangGraph's draw_mermaid_png()
    png_file = os.path.join(diagrams_dir, "playground_graph.png")
    try:
        print("Attempting to render PNG image...")
        png_bytes = graph_obj.draw_mermaid_png()
        with open(png_file, "wb") as f:
            f.write(png_bytes)
        print(f"PNG diagram successfully generated and saved to: {png_file}")
    except Exception as e:
        print("\n[NOTE] Could not generate PNG file directly because pygraphviz/graphviz or mermaid.ink is not configured.")
        print(f"Error detail: {e}")
        print("You can copy the Mermaid source code from 'playground_graph.md' and paste it into any Mermaid viewer to render the graph.")

if __name__ == "__main__":
    generate()
