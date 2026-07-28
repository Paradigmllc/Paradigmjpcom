from __future__ import annotations

from pathlib import Path

from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

from .api import app
from .console_api import router as console_router

app.include_router(console_router)

_STATIC_ROOT = Path(__file__).resolve().parent / "static"
app.mount("/console", StaticFiles(directory=_STATIC_ROOT, html=True), name="console")


@app.get("/", include_in_schema=False)
def console_redirect() -> RedirectResponse:
    return RedirectResponse(url="/console/")
