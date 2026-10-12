"""
Agent tool implementations. Each tool declares a name, a risk_level
("low"|"medium"|"high") and an async executor. risk_level feeds the
human-approval gate in agent_service.requires_approval().

`calculator` uses an AST-walk evaluator rather than `eval()`: eval() on
arbitrary user/LLM-supplied text is a code-execution vulnerability no
matter how the string was produced, so this restricts evaluation to a
whitelist of arithmetic AST node types and numeric literals only.
"""
import ast
import operator
from dataclasses import dataclass
from typing import Any, Awaitable, Callable

_ALLOWED_BINOPS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.Pow: operator.pow,
    ast.Mod: operator.mod,
}
_ALLOWED_UNARYOPS = {
    ast.USub: operator.neg,
    ast.UAdd: operator.pos,
}


class UnsafeExpressionError(Exception):
    pass


def _eval_node(node: ast.AST) -> float:
    if isinstance(node, ast.Expression):
        return _eval_node(node.body)
    if isinstance(node, ast.Constant):
        if isinstance(node.value, bool) or not isinstance(node.value, (int, float)):
            raise UnsafeExpressionError("Only numeric constants are allowed.")
        return node.value
    if isinstance(node, ast.BinOp) and type(node.op) in _ALLOWED_BINOPS:
        left = _eval_node(node.left)
        right = _eval_node(node.right)
        return _ALLOWED_BINOPS[type(node.op)](left, right)
    if isinstance(node, ast.UnaryOp) and type(node.op) in _ALLOWED_UNARYOPS:
        return _ALLOWED_UNARYOPS[type(node.op)](_eval_node(node.operand))
    raise UnsafeExpressionError(f"Disallowed expression node: {type(node).__name__}")


def safe_calculate(expression: str) -> float:
    try:
        tree = ast.parse(expression, mode="eval")
    except SyntaxError as exc:
        raise UnsafeExpressionError(f"Invalid expression syntax: {exc}") from exc
    return _eval_node(tree)


async def execute_calculator(tool_input: dict) -> dict:
    expression = tool_input.get("expression", "")
    try:
        result = safe_calculate(expression)
        return {"result": result}
    except (UnsafeExpressionError, ZeroDivisionError, TypeError) as exc:
        return {"error": str(exc)}


async def execute_knowledge_search(tool_input: dict, *, db, organization_id: str, role: str) -> dict:
    from app.ai.embeddings import get_embedding_provider
    from app.ai.rag import retrieve_relevant_chunks

    query = tool_input.get("query", "")
    provider = get_embedding_provider()
    query_embedding = await provider.embed(query)
    result = await retrieve_relevant_chunks(
        db, organization_id=organization_id, role=role, query=query, query_embedding=query_embedding
    )
    return {
        "results": [
            {"document_name": c.document_name, "content": c.content, "score": round(c.score, 4)}
            for c in result.chunks
        ]
    }


async def execute_crm_lookup(tool_input: dict) -> dict:
    """Simulated: no real CRM is wired up in this reference implementation."""
    account = tool_input.get("account_name", "unknown")
    return {
        "simulated": True,
        "account_name": account,
        "status": "active",
        "note": "This is a simulated CRM response; connect a real CRM integration to replace this stub.",
    }


async def execute_http_api(tool_input: dict) -> dict:
    """Simulated: outbound HTTP from agent tool calls is intentionally stubbed, not wired to live egress."""
    url = tool_input.get("url", "")
    return {
        "simulated": True,
        "requested_url": url,
        "note": "Outbound HTTP tool calls are simulated in this reference implementation for safety.",
    }


@dataclass
class ToolDefinition:
    name: str
    description: str
    risk_level: str  # "low" | "medium" | "high"
    executor: Callable[..., Awaitable[dict]]


TOOL_REGISTRY: dict[str, ToolDefinition] = {
    "calculator": ToolDefinition("calculator", "Evaluate an arithmetic expression.", "low", execute_calculator),
    "knowledge_search": ToolDefinition(
        "knowledge_search", "Search the organization's permission-aware knowledge base.", "low", execute_knowledge_search
    ),
    "crm_lookup": ToolDefinition("crm_lookup", "Look up an account in the CRM (simulated).", "medium", execute_crm_lookup),
    "http_api": ToolDefinition("http_api", "Call an external HTTP API (simulated).", "high", execute_http_api),
}


def get_tool(name: str) -> ToolDefinition | None:
    return TOOL_REGISTRY.get(name)
