from __future__ import annotations

from .models import (
    ClientBrief,
    LikenessConsent,
    Severity,
    ShotKind,
    ValidationFinding,
    ValidationReport,
)


def validate_brief(brief: ClientBrief) -> ValidationReport:
    findings: list[ValidationFinding] = []

    if not brief.rights.source_assets_cleared:
        findings.append(
            ValidationFinding(
                severity=Severity.ERROR,
                code="source-rights-not-cleared",
                field="rights.source_assets_cleared",
                message="Supplied-material rights must be confirmed before production.",
            )
        )
    if not brief.rights.claims_approved_by_client:
        findings.append(
            ValidationFinding(
                severity=Severity.ERROR,
                code="claims-not-approved",
                field="rights.claims_approved_by_client",
                message="The client must approve factual and product claims.",
            )
        )

    generative_requested = any(
        kind
        in {
            ShotKind.GENERATIVE,
            ShotKind.THREE_D,
            ShotKind.PORTRAIT_ANIMATION,
            ShotKind.LIP_SYNC,
        }
        for kind in brief.requested_shot_kinds
    )
    if generative_requested and not brief.rights.ai_generation_allowed:
        findings.append(
            ValidationFinding(
                severity=Severity.ERROR,
                code="ai-prohibited",
                field="rights.ai_generation_allowed",
                message="The brief requests generative production but AI generation is prohibited.",
            )
        )

    if (
        ShotKind.PORTRAIT_ANIMATION in brief.requested_shot_kinds
        and brief.rights.likeness_consent is not LikenessConsent.GRANTED
    ):
            findings.append(
                ValidationFinding(
                    severity=Severity.ERROR,
                    code="likeness-consent-required",
                    field="rights.likeness_consent",
                    message="Portrait animation requires documented likeness consent.",
                )
            )
    if (
        ShotKind.LIP_SYNC in brief.requested_shot_kinds
        and brief.rights.voice_consent is not LikenessConsent.GRANTED
    ):
            findings.append(
                ValidationFinding(
                    severity=Severity.ERROR,
                    code="voice-consent-required",
                    field="rights.voice_consent",
                    message="Lip-sync or voice-clone work requires documented voice consent.",
                )
            )

    if not brief.source_assets:
        findings.append(
            ValidationFinding(
                severity=Severity.WARNING,
                code="no-source-assets",
                field="source_assets",
                message=(
                    "No source assets were supplied; the plan will favor motion "
                    "graphics and mockable shots."
                ),
            )
        )
    if len(brief.deliverables) > 6:
        findings.append(
            ValidationFinding(
                severity=Severity.WARNING,
                code="high-variant-count",
                field="deliverables",
                message=(
                    "A high variant count may require template-specific reflow rather "
                    "than simple transcoding."
                ),
            )
        )

    valid = not any(item.severity is Severity.ERROR for item in findings)
    return ValidationReport(valid=valid, findings=findings)
