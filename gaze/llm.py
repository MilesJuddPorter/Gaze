"""AsyncAnthropic wrapper with JSON parsing."""

import json
import re
import logging
from typing import Optional

import anthropic

logger = logging.getLogger(__name__)

TRIAGE_MODEL = "claude-haiku-4-5-20251001"
ACT_MODEL = "claude-sonnet-4-5-20251001"

_client: Optional[anthropic.AsyncAnthropic] = None


def get_client() -> anthropic.AsyncAnthropic:
    global _client
    if _client is None:
        _client = anthropic.AsyncAnthropic()
    return _client


def parse_json(text: str) -> Optional[dict]:
    """Extract and parse the first JSON object from LLM response text."""
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Try to extract a JSON object embedded in prose
    match = re.search(r"\{[^{}]*\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    logger.warning("Could not parse JSON from LLM response: %s", text[:200])
    return None


async def call_llm(
    system_prompt: str,
    user_prompt: str,
    model: str = TRIAGE_MODEL,
) -> Optional[dict]:
    """Call the Anthropic API and return parsed JSON from the response."""
    client = get_client()
    try:
        response = await client.messages.create(
            model=model,
            max_tokens=1024,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
        text = response.content[0].text
        return parse_json(text)
    except Exception as e:
        logger.error("LLM call failed (model=%s): %s", model, e)
        return None
