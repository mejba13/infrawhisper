from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.config import get_settings
from app.routers import health, analyze, query, optimize


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    print(f"InfraWhisper AI Engine starting — model: {settings.claude_model}")
    yield
    print("AI Engine shutting down")


def create_app() -> FastAPI:
    app = FastAPI(
        title="InfraWhisper AI Engine",
        description="Claude-powered Kubernetes infrastructure analysis",
        version="0.1.0",
        lifespan=lifespan,
    )
    app.include_router(health.router)
    app.include_router(analyze.router)
    app.include_router(query.router)
    app.include_router(optimize.router)
    return app


app = create_app()
