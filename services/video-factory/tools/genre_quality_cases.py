"""Original fictional genre probes; source-conditioned second shots, no approvals."""
from __future__ import annotations

import copy
import hashlib
from pathlib import Path

from video_factory.commands import run_command
from video_factory.models import ShotManifest

GENRES = (
    ("portrait", "人物・演技", "A fictional adult Japanese woman with a short straight black bob, wearing a cream linen blouse, seated beside a softly lit workshop window. Photorealistic cinema, natural skin texture, realistic anatomy, subtle expressions, 50mm lens, warm neutral color grade.",
     "She looks down thoughtfully, slowly raises her eyes toward someone just off camera and gives a small genuine smile. One continuous medium close-up; restrained camera dolly inward.",
     "Continue the same shot with the exact same woman, hairstyle, blouse, lighting and workshop. Her smile relaxes; she turns slightly toward the window and takes a calm breath. Natural blinking, subtle head and shoulder motion, continuous gentle camera drift."),
    ("manga", "漫画風", "Original black-and-white manga animation. A fictional adult traveler with short dark hair, round glasses and a long black coat waits alone on a rural railway platform. Bold expressive ink outlines, restrained screentone shading, clean drawn anatomy, black-and-white only, hand-drawn visual storytelling. No existing characters.",
     "Wind lifts the coat hem as the traveler turns to look down the empty railway track. The camera tracks sideways past a foreground wooden post. Full-frame drawn moving scene, not a static comic page.",
     "Continue the same drawn traveler and same platform. A distant train headlight becomes visible, the traveler leans forward in anticipation, and wind continues to move the coat. Keep the identical black-and-white ink and screentone style, no cuts."),
    ("anime", "アニメ風", "Original hand-drawn 2D animated film. A fictional adult courier with short chestnut hair, a teal jacket and a small tan shoulder bag stands on a stone bridge above a canal in a sunlit imaginary town. Crisp expressive linework, warm hand-painted backgrounds, cel-shaded characters, soft atmospheric perspective. No existing franchise characters.",
     "The courier raises one hand to shade their eyes and looks toward the far end of the bridge. Clouds move gently overhead, canal water sparkles and leaves drift through the foreground. Slow cinematic sideward tracking shot.",
     "Continue the exact same courier, teal jacket, bag and bridge in the same hand-drawn style. The courier lowers their hand, smiles and takes two purposeful steps forward; the shoulder bag sways naturally. Water and leaves continue moving."),
    ("drama", "ドラマ", "A fictional cinematic drama in a small quiet railway waiting room at dusk. A fictional adult man with short dark hair and a charcoal coat sits beside a rain-streaked window, holding a plain sealed cream envelope. Desaturated blue exterior, warm practical lamp inside, natural human proportions, 35mm film look. No readable lettering.",
     "He studies the envelope, hesitates and looks toward the doorway. His eyes and breathing convey anticipation without exaggerated acting. Rain travels down the window. Slow push from medium shot toward his face and upper body.",
     "Continue the same man, coat, envelope and waiting room. He notices someone off camera, slowly stands and gives a small relieved smile, still holding the envelope. Camera gently rises with him, rain and warm lamp remain consistent. No new person enters frame."),
    ("liveaction", "実写風", "Photorealistic cinematic nature footage of an imaginary rocky coastline at dawn, a small white lighthouse on a distant grassy headland, blue-green ocean, warm early sunlight breaking through soft mist. Physically plausible light, detailed rocks and water, restrained natural colors, no people or lettering. Fictional setting, not documentary evidence.",
     "A low camera glides slowly forward above wet coastal rocks while a small wave approaches and breaks into fine foam. Mist drifts near the distant lighthouse. Continuous believable water motion, one uninterrupted shot.",
     "Continue forward along the exact same coast toward the same distant lighthouse. The broken wave retreats through the rocks while another swell approaches, sunlit sea spray moves in the breeze. Preserve the coastline geometry, dawn light and natural water scale."),
)


def candidates(baseline: dict, project: str, root: Path, make_manifest) -> list[tuple[str, dict, ShotManifest]]:
    result = []
    for genre, label, style, opening, continuation in GENRES:
        for phase, action in enumerate((opening, continuation), 1):
            name = f"{genre}-{phase}"
            graph = copy.deepcopy(baseline)
            graph["7"]["inputs"].update(width=1280, height=704, length=121)
            graph["8"]["inputs"]["steps"] = 50
            graph["2"]["inputs"]["shift"] = 5.0
            graph["11"]["inputs"]["filename_prefix"] = f"GenreQA_{name}"
            if phase == 2:
                graph["12"] = {"class_type": "LoadImage", "inputs": {"image": "{{source_image}}"}}
                graph["7"]["inputs"]["start_image"] = ["12", 0]
            manifest = make_manifest(project, len(result) + 1, name, str(root / f"{name}-workflow.json"))
            prompt = f"{style} {action} No subtitles, logos, watermarks or on-screen text."
            shot = manifest.shots[0]
            shot.metadata.update(prompt=prompt, seed=2026090700 + len(result),
                                 negative_prompt="static image, frozen motion, slideshow, malformed hands, extra limbs, face morphing, flicker, subtitles, watermarks, oversaturated, blurry",
                                 genre=genre, continuation=phase == 2)
            manifest.project_name = f"{label} internal source-conditioned quality probe"
            manifest.brief_sha256 = hashlib.sha256(prompt.encode()).hexdigest()
            manifest.metadata.update(genre=genre, stage=phase, quality_accepted=False)
            result.append((name, graph, manifest))
    return result


def bind_continuation(manifest: ShotManifest, previous: Path, image_path: Path) -> None:
    run_command(["ffmpeg", "-y", "-v", "error", "-sseof", "-0.05", "-i", str(previous),
                 "-frames:v", "1", "-update", "1", str(image_path)], timeout=120)
    if not image_path.is_file():
        raise ValueError("Continuation reference frame is missing")
    shot = manifest.shots[0]
    shot.source_assets = [str(image_path)]
    shot.metadata["comfyui_upload_source_image"] = True
    shot.metadata["reference_source_sha256"] = hashlib.sha256(previous.read_bytes()).hexdigest()
