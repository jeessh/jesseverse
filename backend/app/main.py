from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.extensions import service as ext_service
from app.extensions.router import router as extensions_router
from app.mcp.server import mcp_asgi_app
from app.reminders.router import router as reminders_router

settings = get_settings()

app = FastAPI(
    title="Jesseverse",
    description="Hub backend: extension registry + MCP server",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def _startup() -> None:
    ext_service.get_http_client()


@app.on_event("shutdown")
async def _shutdown() -> None:
    await ext_service.close_http_client()


@app.get("/api/health")
def health():
    return {"status": "ok"}


# extension registry rest api
app.include_router(extensions_router, prefix="/api/extensions", tags=["Extensions"])

# daily reminder digest + trigger management
app.include_router(reminders_router, prefix="/api/reminders", tags=["Reminders"])

# mcp server — registered as a plain Route so POST /mcp matches exactly
# (app.mount always sends a 307 redirect on the bare path)
app.add_route("/mcp", mcp_asgi_app)
