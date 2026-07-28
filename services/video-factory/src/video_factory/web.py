from __future__ import annotations

from pathlib import Path

from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

from .api import app
from .console_api import router as console_router

app.include_router(console_router)

_STATIC_ROOT = Path(__file__).resolve().parent / "static"


@app.get("/", include_in_schema=False)
def console_redirect() -> RedirectResponse:
    return RedirectResponse(url="/console/")


@app.get("/console", include_in_schema=False)
def console_path_redirect() -> RedirectResponse:
    return RedirectResponse(url="/console/")


@app.get("/console/", include_in_schema=False)
def console_index() -> FileResponse:
    return FileResponse(_STATIC_ROOT / "console.html", media_type="text/html")


app.mount("/console", StaticFiles(directory=_STATIC_ROOT), name="console")
