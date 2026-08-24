---
name: azurance-api
description: Use when building, reviewing, debugging, or integrating against Azurance provider or insurer APIs, including clinical encounters, diagnoses, prior authorizations, claims, eligibility, and clinical context. Read the relevant references before changing integration code.
---

# Azurance API Integration

Use this skill for Azurance API work. Keep credentials server-side, use the sandbox before production, and follow the exact endpoint, scope, payload, and response contract in the references.

## Working rules

1. Read `references/context.md` first for authentication, environments, security, and shared conventions.
2. Read only the relevant API reference: `references/provider-api.md` for provider integrations or `references/insurer-api.md` for insurer integrations.
3. Consult the matching OpenAPI file under `references/openapi/` before inventing an endpoint, parameter, scope, DTO, or response shape.
4. For clinical work, preserve the diagnostic requirement on encounters and use the structured diagnoses endpoints when a diagnosis must be added or listed.
5. Before declaring an integration complete, verify authorization scopes, error handling, idempotency, and the relevant automated tests.

## Installed references

- `references/context.md` — shared Azurance context and current product rules.
- `references/provider-api.md` — provider-facing workflows and endpoints.
- `references/insurer-api.md` — insurer-facing workflows and endpoints.
- `references/openapi/provider-api.openapi.yml` — provider contract.
- `references/openapi/insurer-api.openapi.yml` — insurer contract.

Some references may be absent when the installer was run with `--target provider` or `--target insurer`; use the available reference set for the selected integration surface.
