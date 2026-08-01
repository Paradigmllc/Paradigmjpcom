from __future__ import annotations

import json
from pathlib import Path

import typer

from .delivery import deliver_project
from .doctor import doctor_report
from .finalization import finalize_project
from .io import load_brief, write_json, write_model
from .model_registry import assert_model_bindings_approved, model_registry_readiness
from .models import ReviewStage, ShotManifest
from .pipeline import production_flow
from .planner import plan_brief
from .review import approve_review
from .settings import Settings
from .state import load_project_state, transition_project_state
from .validation import validate_brief
from .workflow_registry import (
    bind_workflow_contract,
    disable_workflow_contract,
    load_workflow_registry,
    registry_readiness,
)
from .workspace import ProjectWorkspace

app = typer.Typer(no_args_is_help=True, help="Paradigm Video Factory")
workflow_app = typer.Typer(no_args_is_help=True, help="Approved ComfyUI workflow registry")
app.add_typer(workflow_app, name="workflows")


@app.command()
def validate(brief: Path) -> None:
    """Validate a client brief and its rights declarations."""
    model = load_brief(brief)
    report = validate_brief(model)
    typer.echo(report.model_dump_json(indent=2))
    if not report.valid:
        raise typer.Exit(code=2)


@app.command()
def plan(
    brief: Path,
    output: Path | None = typer.Option(None),
    provider: str = typer.Option("deterministic"),
) -> None:
    """Create a shot manifest from a validated brief."""
    settings = Settings.from_env()
    model = load_brief(brief)
    report = validate_brief(model)
    if not report.valid:
        typer.echo(report.model_dump_json(indent=2))
        raise typer.Exit(code=2)
    manifest = plan_brief(model, settings, provider=provider)
    if output:
        write_model(output, manifest)
        typer.echo(str(output))
    else:
        typer.echo(manifest.model_dump_json(indent=2))


@app.command()
def run(
    brief: Path,
    dry_run: bool = typer.Option(False, help="Never call external engines."),
    planner_provider: str = typer.Option("deterministic"),
    auto_approve: bool = typer.Option(False, help="Test-only; requires --dry-run."),
    delivery_target: str = typer.Option("local"),
) -> None:
    """Run production until review, or deliver an auto-approved dry-run fixture."""
    result = production_flow(
        brief_path=str(brief),
        dry_run=dry_run,
        planner_provider=planner_provider,
        auto_approve=auto_approve,
        delivery_target=delivery_target,
    )
    typer.echo(result.model_dump_json(indent=2))
    if result.status == "failed":
        raise typer.Exit(code=3)


def _approve_stage(
    project_id: str,
    reviewer: str,
    notes: str | None,
    stage: ReviewStage,
) -> None:
    settings = Settings.from_env()
    workspace = ProjectWorkspace.create(settings.workspace, project_id)
    state_path = workspace.root / "state.json"
    expected_state = (
        "draft_review_required"
        if stage is ReviewStage.DRAFT
        else "final_review_required"
    )
    approved_state = "draft_approved" if stage is ReviewStage.DRAFT else "final_approved"
    state = load_project_state(state_path)
    if state.status != expected_state:
        raise typer.BadParameter(
            f"Project state must be {expected_state}, got {state.status}"
        )
    review = approve_review(
        workspace.review / f"{stage.value}-review.json",
        reviewer,
        notes,
        expected_stage=stage,
    )
    transition_project_state(
        state_path,
        approved_state,
        expected=expected_state,
    )
    typer.echo(review.model_dump_json(indent=2))


@app.command(name="approve-draft")
def approve_draft(
    project_id: str,
    reviewer: str = typer.Option(...),
    notes: str | None = typer.Option(None),
) -> None:
    """Approve the QA-passed draft and unlock finalization."""
    _approve_stage(project_id, reviewer, notes, ReviewStage.DRAFT)


@app.command()
def approve(
    project_id: str,
    reviewer: str = typer.Option(...),
    notes: str | None = typer.Option(None),
) -> None:
    """Compatibility alias for approve-draft."""
    _approve_stage(project_id, reviewer, notes, ReviewStage.DRAFT)


@app.command()
def finalize(project_id: str) -> None:
    """Freeze an approved draft into final masters and open final review."""
    settings = Settings.from_env()
    workspace = ProjectWorkspace.create(settings.workspace, project_id)
    manifest = ShotManifest.model_validate_json(
        (workspace.root / "shot-manifest.json").read_text(encoding="utf-8")
    )
    review = finalize_project(manifest, workspace, settings)
    typer.echo(review.model_dump_json(indent=2))


@app.command(name="approve-final")
def approve_final(
    project_id: str,
    reviewer: str = typer.Option(...),
    notes: str | None = typer.Option(None),
) -> None:
    """Approve immutable final masters and unlock delivery."""
    _approve_stage(project_id, reviewer, notes, ReviewStage.FINAL)


@app.command()
def deliver(
    project_id: str,
    target: str = typer.Option("local"),
) -> None:
    """Create variants and deliver an approved project."""
    settings = Settings.from_env()
    workspace = ProjectWorkspace.create(settings.workspace, project_id)
    manifest = ShotManifest.model_validate_json(
        (workspace.root / "shot-manifest.json").read_text(encoding="utf-8")
    )
    record = deliver_project(manifest, workspace, settings, target=target)
    typer.echo(record.model_dump_json(indent=2))




def _parse_model_bindings(values: list[str]) -> dict[str, str]:
    bindings: dict[str, str] = {}
    for value in values:
        key, separator, artifact = value.partition("=")
        if not separator or not key.strip() or not artifact.strip():
            raise typer.BadParameter(
                "Model bindings must use symbolic-slot=exact-artifact-filename"
            )
        bindings[key.strip()] = artifact.strip()
    return bindings


@workflow_app.command(name="list")
def workflow_list() -> None:
    """Show approved contracts, bindings, and fail-closed readiness."""
    settings = Settings.from_env()
    registry = load_workflow_registry(settings.comfyui_workflow_registry)
    typer.echo(
        json.dumps(
            registry_readiness(registry, settings.comfyui_workflow_root),
            indent=2,
            default=str,
        )
    )


@workflow_app.command(name="models")
def workflow_models() -> None:
    """Show model-license and workflow-approval readiness."""
    settings = Settings.from_env()
    typer.echo(
        json.dumps(
            model_registry_readiness(settings.model_registry_path),
            indent=2,
            default=str,
        )
    )


@workflow_app.command(name="bind")
def workflow_bind(
    workflow_id: str,
    workflow: Path,
    reviewed_by: str = typer.Option(..., help="Human reviewer recorded in the registry."),
    model_binding: list[str] = typer.Option(
        [],
        "--model-binding",
        help="Repeat symbolic-slot=exact-model-filename for every required model.",
    ),
    confirm_license_review: bool = typer.Option(
        False,
        "--confirm-license-review",
        help="Required acknowledgement that code, model, custom-node, and output terms were reviewed.",
    ),
    offline: bool = typer.Option(
        False,
        help="Skip endpoint node verification; prohibited in production.",
    ),
) -> None:
    """Bind a reviewed API-format workflow to an approved contract."""
    settings = Settings.from_env()
    if not confirm_license_review:
        raise typer.BadParameter("--confirm-license-review is required")
    if offline and settings.environment == "production":
        raise typer.BadParameter("Offline workflow binding is prohibited in production")
    bindings = _parse_model_bindings(model_binding)
    assert_model_bindings_approved(
        bindings,
        workflow_id=workflow_id,
        registry_path=settings.model_registry_path,
        region=settings.production_region,
    )
    bound = bind_workflow_contract(
        registry_path=settings.comfyui_workflow_registry,
        root=settings.comfyui_workflow_root,
        workflow_id=workflow_id,
        source=workflow,
        reviewed_by=reviewed_by,
        bound_profile=settings.comfyui_profile,
        model_bindings=bindings,
        base_url=settings.comfyui_base_url,
        api_key=settings.comfyui_api_key,
        verify_endpoint=not offline,
    )
    typer.echo(bound.model_dump_json(indent=2))


@workflow_app.command(name="disable")
def workflow_disable(workflow_id: str) -> None:
    """Disable a bound workflow without deleting its audit record."""
    settings = Settings.from_env()
    disabled = disable_workflow_contract(
        settings.comfyui_workflow_registry,
        workflow_id,
    )
    typer.echo(disabled.model_dump_json(indent=2))


@app.command(name="doctor")
def doctor_command() -> None:
    """Inspect binaries, engine configuration, and endpoint reachability."""
    typer.echo(json.dumps(doctor_report(Settings.from_env()), indent=2, default=str))


@app.command(name="export-schemas")
def export_schemas(directory: Path = Path("schemas")) -> None:
    """Export the canonical Pydantic JSON schemas."""
    from .models import ClientBrief, DeliveryRecord, ShotManifest

    directory.mkdir(parents=True, exist_ok=True)
    write_json(directory / "brief.schema.json", ClientBrief.model_json_schema())
    write_json(directory / "shot-manifest.schema.json", ShotManifest.model_json_schema())
    write_json(directory / "delivery.schema.json", DeliveryRecord.model_json_schema())
    typer.echo(str(directory))




@app.command(name="comfy-proxy")
def comfy_proxy_command(
    host: str = typer.Option("127.0.0.1"),
    port: int = typer.Option(8189),
) -> None:
    """Start the authenticated, route-limited ComfyUI reverse proxy."""
    try:
        import uvicorn
    except ImportError as error:
        raise typer.BadParameter("Install the api extra: pip install -e '.[api]'") from error
    uvicorn.run("video_factory.comfy_proxy:app", host=host, port=port, reload=False)


@app.command(name="api")
def api_command(
    host: str = typer.Option("127.0.0.1"),
    port: int = typer.Option(8080),
) -> None:
    """Start the FastAPI service."""
    try:
        import uvicorn
    except ImportError as error:
        raise typer.BadParameter("Install the api extra: pip install -e '.[api]'") from error
    uvicorn.run("video_factory.api:app", host=host, port=port, reload=False)
