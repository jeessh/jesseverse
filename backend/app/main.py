from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.extensions.router import router as extensions_router
from app.mcp.server import mcp_asgi_app

settings = get_settings()

app = FastAPI(
    title="Jessiverse",
    description="Hub backend: extension registry + MCP server",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
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
# mcp_asgi_app is a class instance so Starlette uses it as a raw ASGI app.
app.add_route("/mcp", mcp_asgi_app)
