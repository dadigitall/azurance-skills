# Azurance LLM Kit

Agent-ready integration kit for Azurance APIs: OpenAPI contracts, ERP workflows, and a standards-based `azurance-api` skill for Codex, Claude Code, Windsurf, Cursor, and other coding agents.

## Quick start

Run the installer from a terminal to open the developer-friendly menu:

```bash
npx azurance-llm
```

The menu can install the project context, the multi-agent skill bundle, global skills, agent bridges, refreshes, or a status report. In a non-interactive shell, no-argument invocation keeps the backward-compatible project context install.

For a deterministic setup in CI or a bootstrap script:

```bash
# Project context + skills for Codex, Claude Code, Windsurf, and Cursor
npx azurance-llm --install all --agent all --scope project

# One global skill installation
npx azurance-llm --install skill --agent claude --scope global

# Refresh every existing Azurance installation found in the project and home directory
npx azurance-llm --update --agent all --scope both

# Inspect what is already installed
npx azurance-llm --status
```

Select an integration surface when needed:

```bash
npx azurance-llm --install all --agent all --target provider
npx azurance-llm --install all --agent all --target insurer
```

Preview any operation without writing files:

```bash
npx azurance-llm --install all --agent all --dry-run
```

## Agent compatibility

The canonical bundle is a real `SKILL.md` with YAML frontmatter and portable `references/` files. The installer places it where each supported agent discovers skills:

| Agent | Project | Global |
| --- | --- | --- |
| Codex / Open Agent Skills | `.agents/skills/azurance-api/` | `~/.agents/skills/azurance-api/` |
| Claude Code | `.claude/skills/azurance-api/` | `~/.claude/skills/azurance-api/` |
| Windsurf | `.windsurf/skills/azurance-api/` | `~/.codeium/windsurf/skills/azurance-api/` |
| Cursor | `.cursor/rules/azurance-api.mdc` | Not applicable; Cursor rules are project-scoped |

Cursor uses a small rule bridge because its documented extension point is `.cursor/rules`, not a normal skill directory. Generic bridges for an existing or new `CLAUDE.md`, `GEMINI.md`, and `.github/copilot-instructions.md` can be installed explicitly:

```bash
npx azurance-llm --install adapter --agent generic
```

The project context remains available under `.azurance/llm/` and `AGENTS.md` for agents that do not implement skills. Existing personal files are preserved; only the marked Azurance section is refreshed by `--update` or `--force`.

## Generated files

```text
AGENTS.md
.azurance/llm/
  context.md
  provider-api.md
  insurer-api.md
  openapi/
    provider-api.openapi.yml
    insurer-api.openapi.yml
.agents/skills/azurance-api/
  SKILL.md
  agents/openai.yaml
  references/...
```

`SKILL.md` is intentionally short. It routes the agent to the relevant context, provider/insurer workflow, and OpenAPI contract instead of duplicating every reference in the prompt.

## Update and safety model

- New files are created without deleting user files.
- Existing files are skipped by default.
- `--update` detects installed Azurance skills and refreshes only their managed files.
- `--force` remains available as a lower-level replacement flag.
- Global paths are written only when `--scope global` or the global menu option is explicitly selected.
- `--status` reports project and global installations without changing anything.

## What it gives coding agents

- Public Azurance API base URLs for sandbox and production.
- Authentication rules using `X-Api-Key`.
- Security constraints for keeping keys server-side.
- Provider workflows: auth, network, covered persons, consent, eligibility, prior authorizations, clinical context, diagnoses, prescriptions, medical records, media, service executions, claims, billing, webhooks, and reference data.
- Insurer workflows: plans, coverage types, reimbursement, members, subscriptions, beneficiaries, eligibility, claims, fraud assessment, prior authorizations, provider network, billing, reference data, webhooks, analytics, and notifications.
- OpenAPI contracts for exact endpoints, methods, headers, scopes, schemas, and examples.

## Development

```bash
npm test
node bin/azurance-llm.js --help
node bin/azurance-llm.js --install all --agent all --dry-run
npm pack --dry-run
```
