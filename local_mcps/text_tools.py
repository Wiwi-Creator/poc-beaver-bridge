"""
Local MCP Server — Text Tools
URL: http://localhost:8093/mcp
啟動方式: python local_mcps/text_tools.py
"""
import re
from collections import Counter
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("Local Text Tools", host="0.0.0.0", port=8093)


@mcp.tool()
def word_count(text: str) -> dict:
    """
    Count words, characters, lines, and sentences in a text.
    Returns a summary dict.
    """
    words = text.split()
    sentences = re.split(r'[.!?]+', text)
    sentences = [s.strip() for s in sentences if s.strip()]
    return {
        "words": len(words),
        "characters": len(text),
        "characters_no_spaces": len(text.replace(" ", "")),
        "lines": len(text.splitlines()),
        "sentences": len(sentences),
    }


@mcp.tool()
def top_words(text: str, n: int = 10) -> list[dict]:
    """
    Return the top N most frequent words in the text (case-insensitive, punctuation removed).
    """
    cleaned = re.sub(r"[^\w\s]", "", text.lower())
    words = cleaned.split()
    counts = Counter(words).most_common(n)
    return [{"word": w, "count": c} for w, c in counts]


@mcp.tool()
def reverse_text(text: str) -> str:
    """Reverse the given text."""
    return text[::-1]


@mcp.tool()
def to_snake_case(text: str) -> str:
    """Convert a string to snake_case."""
    s = re.sub(r"[\s\-]+", "_", text)
    s = re.sub(r"([A-Z])", lambda m: f"_{m.group(1).lower()}", s)
    s = re.sub(r"_+", "_", s).strip("_")
    return s.lower()


@mcp.tool()
def extract_emails(text: str) -> list[str]:
    """Extract all email addresses found in the text."""
    pattern = r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}"
    return re.findall(pattern, text)


@mcp.tool()
def extract_urls(text: str) -> list[str]:
    """Extract all URLs (http/https) found in the text."""
    pattern = r"https?://[^\s]+"
    return re.findall(pattern, text)


@mcp.tool()
def truncate(text: str, max_length: int = 100, suffix: str = "...") -> str:
    """Truncate text to max_length characters, appending suffix if truncated."""
    if len(text) <= max_length:
        return text
    return text[:max_length - len(suffix)] + suffix


if __name__ == "__main__":
    print("📝 Text Tools MCP server running on http://localhost:8093/mcp")
    mcp.run(transport="streamable-http")
