from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.extensions.router import router as extensions_router
from app.mcp.server import session_manager, mcp_endpoint

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start the MCP session manager's internal task group before serving
    # requests — required by StreamableHTTPSessionManager.
    async with session_manager.run():
        yield


app = FastAPI(
    title="Jesseverse",
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

# MCP server — registered as a plain Route so POST /mcp is matched exactly
# with no 307 redirect (unlike app.mount which always redirects the bare path).
app.add_route("/mcp", mcp_endpoint)
