"""
Local MCP Server — Calculator
URL: http://localhost:8091/mcp
啟動方式: python local_mcps/calculator.py
"""
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("Local Calculator", host="0.0.0.0", port=8091)


@mcp.tool()
def add(a: float, b: float) -> float:
    """Add two numbers together."""
    return a + b


@mcp.tool()
def subtract(a: float, b: float) -> float:
    """Subtract b from a."""
    return a - b


@mcp.tool()
def multiply(a: float, b: float) -> float:
    """Multiply two numbers."""
    return a * b


@mcp.tool()
def divide(a: float, b: float) -> float:
    """Divide a by b. Raises error if b is zero."""
    if b == 0:
        raise ValueError("Cannot divide by zero")
    return a / b


@mcp.tool()
def power(base: float, exponent: float) -> float:
    """Raise base to the power of exponent."""
    return base ** exponent


@mcp.tool()
def percentage(value: float, total: float) -> float:
    """Calculate what percentage value is of total."""
    if total == 0:
        raise ValueError("Total cannot be zero")
    return round((value / total) * 100, 2)


if __name__ == "__main__":
    print("🧮 Calculator MCP server running on http://localhost:8091/mcp")
    mcp.run(transport="streamable-http")
