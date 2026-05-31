# Agent Workflow

## 1. Understand First

- Read `AGENTS.md` before planning or editing.
- Inspect the real files involved: routes, modules, DTOs, tests, configs, and shared packages.
- Reuse what already exists.
- If something cannot be confirmed from the repo, write `Not detected yet`.

## 2. Plan Second

- Explain the requested change in repo-specific terms.
- List the files you expect to touch.
- Make a short implementation and validation plan before editing.

## 3. Implement Third

- Prefer the smallest safe change that matches existing patterns.
- Reuse existing utilities, components, services, hooks, DTOs, and packages.
- Avoid unrelated files, generated outputs, env files, and destructive edits unless explicitly required.

## 4. Validate Fourth

- Run the narrowest relevant checks first.
- Use the existing lint, typecheck, build, unit, e2e, and Playwright commands when applicable.
- If validation is skipped or blocked, say so explicitly.

## 5. Summarize Changes Last

- Report what changed.
- Report what validation ran.
- Report any remaining risks, assumptions, or `Not detected yet` gaps.
