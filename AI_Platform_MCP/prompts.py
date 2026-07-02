import logging
from AI_Platform_MCP.app import mcp

logger = logging.getLogger("YakkayCoreProtocolMesh.prompts")

@mcp.prompt(
    name="system-validator",
    title="System Validator Instruction Set",
    description="Generates custom validator prompt templates for validating specific software components."
)
async def system_validator(component: str, validation_rules: str) -> str:
    """
    Exposes a dynamic automated validation instruction flow template.
    
    Generates a structured prompt that instructs an LLM to evaluate the integrity 
    of a system component against configured constraints.
    
    Args:
        component: The name of the software module or architecture block to evaluate.
        validation_rules: A markdown or text string list of target constraints.
    """
    logger.info(f"Generating prompt template 'system-validator' for component '{component}'.")
    
    if not component.strip():
        logger.error("Attempted to construct prompt template with an empty component identifier.")
        raise ValueError("Parameter 'component' must contain a non-empty string.")

    template_payload = f"""You are the official Yakkay Automated Validation Agent assigned to inspect the '{component}' component.

Your objective is to conduct a strict validation scan and verify compliance against these rules:
{validation_rules}

### Output Specification:
Your final validation response must conform to this exact JSON schema structure:
{{
  "validation_status": "PASSED" | "FAILED",
  "checked_component": "{component}",
  "scanned_rules_count": <number of rules processed>,
  "findings": [
    {{
      "rule": "<rule text>",
      "status": "COMPLIANT" | "NON_COMPLIANT",
      "details": "<detailed observation or stack trace, if failed>"
    }}
  ],
  "remediation_actions": [
    "<actionable steps to resolve failures, if status is FAILED>"
  ]
}}

Ensure no extra conversational preamble or postscript is included. Return ONLY the valid JSON block.
"""
    return template_payload
