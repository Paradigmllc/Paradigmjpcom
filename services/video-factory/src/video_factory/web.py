from __future__ import annotations

from pathlib import Path

from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

from .api import app
from .console_api import router as console_router
from .engine_profile_api import router as engine_profile_router
from .registry_api import router as registry_router
from .uploads import router as upload_router

app.include_router(console_router)
app.include_router(engine_profile_router)
app.include_router(registry_router)
app.include_router(upload_router)

_STATIC_ROOT = Path(__file__).resolve().parent / "static"


@app.get("/", include_in_schema=False)
def console_redirect() -> RedirectResponse:
    return RedirectResponse(url="/console/")


@app.get("/console", include_in_schema=False)
def console_path_redirect() -> RedirectResponse:
    return RedirectResponse(url="/console/")


@app.get("/console/", include_in_schema=False)
def console_index() -> HTMLResponse:
    source = (_STATIC_ROOT / "console.html").read_text(encoding="utf-8")
    marker = "</body>"
    if marker not in source:
        raise RuntimeError("Video Factory console HTML is missing the body terminator")
    source = source.replace(
        marker,
        (
            '<script src="/console/console-run-poll.js" defer></script>\n'
            '<script src="/console/console-registry-link.js" defer></script>\n'
            '<script src="/console/console-vast-connect.js" defer></script>\n'
            '<script src="/console/console-gpu-lifecycle.js" defer></script>\n'
            '<script src="/console/console-upload.js" defer></script>\n'
            "</body>"
        ),
        1,
    )
    return HTMLResponse(source)


app.mount("/console", StaticFiles(directory=_STATIC_ROOT), name="console")
