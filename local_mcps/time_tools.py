"""
Local MCP Server — Time Tools
URL: http://localhost:8092/mcp
啟動方式: python local_mcps/time_tools.py
"""
from datetime import datetime, timezone, timedelta
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("Local Time Tools", host="0.0.0.0", port=8092)


@mcp.tool()
def get_current_time(timezone_offset_hours: int = 8) -> str:
    """
    Get the current date and time.
    timezone_offset_hours: UTC offset (default 8 for Asia/Taipei).
    """
    tz = timezone(timedelta(hours=timezone_offset_hours))
    now = datetime.now(tz)
    return now.strftime("%Y-%m-%d %H:%M:%S %Z")


@mcp.tool()
def days_between(date_a: str, date_b: str) -> int:
    """
    Calculate the number of days between two dates.
    Dates must be in YYYY-MM-DD format.
    """
    fmt = "%Y-%m-%d"
    d1 = datetime.strptime(date_a, fmt)
    d2 = datetime.strptime(date_b, fmt)
    return abs((d2 - d1).days)


@mcp.tool()
def add_days(date: str, days: int) -> str:
    """
    Add (or subtract) days from a date.
    date: YYYY-MM-DD format.
    days: number of days to add (negative to subtract).
    """
    d = datetime.strptime(date, "%Y-%m-%d")
    result = d + timedelta(days=days)
    return result.strftime("%Y-%m-%d")


@mcp.tool()
def day_of_week(date: str) -> str:
    """
    Return the day of week for a given date (YYYY-MM-DD).
    """
    d = datetime.strptime(date, "%Y-%m-%d")
    return d.strftime("%A")


@mcp.tool()
def format_timestamp(unix_timestamp: int, timezone_offset_hours: int = 8) -> str:
    """
    Convert a Unix timestamp to a human-readable datetime string.
    timezone_offset_hours: UTC offset (default 8 for Asia/Taipei).
    """
    tz = timezone(timedelta(hours=timezone_offset_hours))
    dt = datetime.fromtimestamp(unix_timestamp, tz=tz)
    return dt.strftime("%Y-%m-%d %H:%M:%S %Z")


if __name__ == "__main__":
    print("🕐 Time Tools MCP server running on http://localhost:8092/mcp")
    mcp.run(transport="streamable-http")
