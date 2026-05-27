# Azurance LLM Kit

Agent-ready integration kit for Azurance APIs: OpenAPI contracts, ERP workflows, and LLM-friendly context for Codex, Cursor, Claude, Windsurf, and other AI coding tools.

## Usage

Install the full Azurance context in a project:

```bash
npx azurance-llm
```

Install only one integration surface:

```bash
npx azurance-llm --target provider
npx azurance-llm --target insurer
```

Preview changes without writing files:

```bash
npx azurance-llm --dry-run
```

Install into another directory:

```bash
npx azurance-llm --dir ./my-erp-project
```

## Generated Files

```text
AGENTS.md
.azurance/
  llm/
    context.md
    provider-api.md
    insurer-api.md
    openapi/
      provider-api-bff.openapi.yml
      insurer-bff.openapi.yml
```

`AGENTS.md` is the entrypoint for coding agents. It points agents to the Azurance context files and OpenAPI contracts.

## What It Gives AI Coding Tools

- Public Azurance API base URLs for sandbox and production.
- Authentication rules using `X-Api-Key`.
- Security constraints for keeping keys server-side.
- ERP provider workflows for eligibility checks, claims, documents, billing sync, and webhooks.
- ERP insurer workflows for plans, members, subscriptions, beneficiaries, eligibility, and claims.
- OpenAPI contracts for exact endpoints, methods, headers, and schemas.

## Supported AI Tools

This kit is file-based and works with tools that read project context, including Codex, Cursor, Claude Code, Windsurf, GitHub Copilot Chat, Continue, Cline, Roo Code, and similar coding agents.

## Development

```bash
npm test
node bin/azurance-llm.js --dry-run
npm pack --dry-run
```
