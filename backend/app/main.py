from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.extensions.router import router as extensions_router
from app.mcp.server import mcp, mcp_asgi_app

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # FastAPI does not forward lifespan events to mounted ASGI sub-apps, so
    # we manually run the MCP session manager here. Without this the
    # StreamableHTTPSessionManager's task group is never initialised and
    # every request raises "Task group is not initialized".
    async with mcp.session_manager.run():
        yield


app = FastAPI(
    title="Jessiverse",
    description="Hub backend: extension registry + MCP server",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok"}


# Extension registry REST API
app.include_router(extensions_router, prefix="/api/extensions", tags=["Extensions"])

# MCP server — AI clients connect to /mcp
app.mount("/mcp", mcp_asgi_app)
