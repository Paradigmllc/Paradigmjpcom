# ComfyUI API workflows

Export production workflows from ComfyUI with **File -> Export (API)** and store the API-format JSON in this directory. Do not commit model weights or secrets.

A shot may declare:

```yaml
metadata:
  comfyui_workflow: workflows/comfyui/wan-i2v-api.json
  comfyui_bindings:
    prompt: A clean product-launch scene...
    negative_prompt: distorted text, logo mutation
    seed: 12345
    width: 1280
    height: 720
```

The adapter replaces exact string placeholders such as `{{prompt}}`, `{{seed}}`, `{{width}}`, and `{{height}}` anywhere inside the exported API workflow.

Before enabling a workflow:

1. Pin the ComfyUI stable release.
2. Pin every custom node and record it in `licenses/registry.yaml`.
3. Record exact model filenames and SHA-256 hashes.
4. Verify code, model, LoRA, voice, font, and output-license conditions.
5. Run a low-resolution fixture and retain the workflow plus provenance.
6. Keep confidential client assets out of tools or nodes whose data handling is not approved.
