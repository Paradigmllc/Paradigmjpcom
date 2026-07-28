# Bound ComfyUI API workflows

Only API-format workflow JSON files approved through `workflows/comfyui/registry.yaml` belong here. A contract is executable only when its exact model artifacts, custom nodes, output node, license review, and JSON file are all bound and the registry entry is changed to `approval: approved_bound` and `enabled: true`.

Do not place UI-format graphs in this directory. Do not let an agent enable a workflow merely because ComfyUI can load it.
