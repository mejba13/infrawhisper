# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**InfraWhisper** — early-stage Python 3.12 project. The Product Requirements Document is at `InfraWhisper_PRD_v1.0.docx`. No source code beyond the PyCharm stub in `main.py` exists yet.

## Setup

No package management is configured yet. When dependencies are added, prefer `pyproject.toml` (PEP 517/518) with a tool like Poetry or uv.

Suggested initial setup:
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt   # once created
```

## Development Commands

These will be established as the project matures. Likely conventions for a Python project:

```bash
# Run the app
python main.py

# Run tests (once pytest is added)
pytest
pytest tests/test_foo.py::test_specific  # single test

# Lint / format (Black is configured in the IDE)
black .
ruff check .
```

## Architecture

No architecture exists yet. As the project is built out, document the structure here. Key decisions to capture:
- Entry point location (`main.py` or `src/infrawhisper/__main__.py`)
- Packaging structure (flat vs `src/` layout)
- Key external integrations described in the PRD
