from typing import TypeVar, Type
from pydantic import BaseModel, ValidationError
import json

T = TypeVar("T", bound=BaseModel)


def parse_response(data: dict, model: Type[T]) -> T:
    try:
        return model.model_validate(data)
    except ValidationError as e:
        raise ValueError(f"Claude response did not match expected schema: {e}") from e


def safe_json_loads(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1]).strip()
    return json.loads(text)
