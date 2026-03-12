import json
import anthropic
from app.config import get_settings


class ClaudeClient:
    def __init__(self) -> None:
        settings = get_settings()
        self._client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
        self._model = settings.claude_model
        self._max_tokens = settings.claude_max_tokens

    async def complete(self, system: str, user: str) -> str:
        message = await self._client.messages.create(
            model=self._model,
            max_tokens=self._max_tokens,
            system=system,
            messages=[{"role": "user", "content": user}],
        )
        return message.content[0].text

    async def complete_json(self, system: str, user: str) -> dict:
        json_system = (
            system
            + "\n\nIMPORTANT: Your response MUST be valid JSON only. "
            "Do not include markdown, code fences, or any text outside the JSON object."
        )
        text = await self.complete(json_system, user)
        text = text.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            text = "\n".join(lines[1:-1])
        return json.loads(text)
