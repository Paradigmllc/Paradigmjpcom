from __future__ import annotations

from .engine_profiles import catalog_status, load_engine_profile_catalog
from .router import engine_availability
from .settings import Settings


def engine_catalog_payload(settings: Settings) -> dict[str, object]:
    try:
        catalog = load_engine_profile_catalog(settings.engine_profile_catalog_path)
        return {
            "ok": True,
            **catalog_status(
                catalog,
                availability=engine_availability(settings),
                workflow_registry_path=settings.comfyui_workflow_registry,
                model_registry_path=settings.model_registry_path,
            ),
        }
    except (OSError, ValueError) as error:
        return {
            "ok": False,
            "total": 0,
            "ready": 0,
            "blocked": 0,
            "profiles": [],
            "error": str(error),
        }
