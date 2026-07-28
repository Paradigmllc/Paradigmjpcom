# Paradigm Video Factory Production Surface

The implementation lives in `services/video-factory` and is operated through the project skill at `.agents/skills/paradigm-video-producer/SKILL.md`.

Production remains fail-closed until `video-factory doctor` reports `production_ready: true`. GPU payment/provisioning and provider credentials are external commercial inputs and are never created or committed by CI.

Required activation order:

1. configure the private GPU ComfyUI endpoint and authenticated proxy;
2. register exact model artifacts, hashes, licenses, regions, and approved workflows;
3. bind API-format workflows with a named reviewer;
4. run the controlled fixture;
5. enable customer production only after both human approval gates and delivery evidence are verified.
