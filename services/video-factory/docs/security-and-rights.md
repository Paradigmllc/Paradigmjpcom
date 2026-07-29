# Security and rights controls

## Blocking brief conditions

Production must not start when:

- supplied-material rights are not confirmed;
- a real person's likeness or voice is used without consent;
- the client prohibits AI generation but the plan requests generative shots;
- an approver is absent;
- a claim requires legal, medical, financial, regulatory, or product proof that has not been supplied;
- an engine/model/custom node is not approved in the registry;
- a source URL is outside the Playwright allow-list;
- a workflow requests credentials or private customer data that are unnecessary for production.

## Data isolation

Use one workspace directory and one external-storage prefix per client. Do not mount unrelated client roots into GPU workers. Prefer time-limited internal URLs over copying credentials or cloud keys into workflow JSON.

## Prompt and workflow safety

Treat prompts, HTML, URLs, workflow JSON, and uploaded files as untrusted. The factory never evaluates arbitrary Python from a brief. External commands are configured by operators and executed as argv arrays without a shell.

## ComfyUI controls

- stable tagged core release;
- private network binding;
- custom nodes disabled by default;
- immutable custom-node commit when approved;
- model and LoRA hashes recorded;
- manager installation disabled in production;
- no runtime `pip install`, `eval`, or `exec` nodes;
- outbound network restricted where practical;
- API nodes disabled unless explicitly required and reviewed.

## Generated-media policy

Generated media may be used for illustration, atmosphere, conceptual storytelling, or clearly fictional presentation. It must not be represented as documentary evidence, a real customer, a real medical result, an actual product behavior, an actual property condition, or a real historical event without explicit factual grounding and disclosure.

## Delivery

A human reviewer must approve the creative master. A second final check confirms output specification, rights/provenance, captions, claims, and destination before delivery.


## Review-platform credentials

Frame.io access tokens and rclone credentials are deployment secrets. They are never serialized into the project manifest, delivery record, logs, or provenance. Only returned review URLs may be stored with client artifacts.
