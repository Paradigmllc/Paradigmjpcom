# Context Budget Guard

Activation: Always On

- Startup files are entrypoints, not history stores.
- Keep `Task.md` and `CLAUDE.md` under 120 lines.
- Keep generated shared rule files under 240 lines.
- Use `docs/handoff-archive/` for old handoffs.
- Use `docs/knowledge/` or `docs/refactor/` for detailed specs and audits.
- Run `npm run context:audit` before finishing changes to agent rules, handoffs, or context files.
