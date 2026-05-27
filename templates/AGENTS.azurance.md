# Azurance API Integration

Use this section when adding, reviewing, or debugging integrations with the public Azurance APIs.

## Sources

- Start with `.azurance/llm/context.md` for global rules.
- Use `.azurance/llm/provider-api.md` for ERP provider workflows.
- Use `.azurance/llm/insurer-api.md` for ERP insurer workflows.
- Use `.azurance/llm/openapi/*.openapi.yml` for exact paths, methods, schemas, and security.

## Non-negotiable rules

- Call only the public BFF domains:
  - Provider production: `https://provider-api.elenami.com`
  - Provider sandbox: `https://provider-api-sandbox.elenami.com`
  - Insurer production: `https://insurer-api.elenami.com`
  - Insurer sandbox: `https://insurer-api-sandbox.elenami.com`
- Send partner authentication with `X-Api-Key`.
- Never send `X-Service-Key` from an ERP integration.
- Keep API keys server-side only. Never expose them in a browser, mobile binary, logs, or analytics payload.
- Do not send tenant, provider, or insurer IDs in public request bodies or query strings when those values are derived from the API key.
- Prefer public UUIDs and business codes over internal SQL IDs.
- Include `X-Request-Id` when a workflow spans multiple calls.
- Retry only `429` and `5xx` responses, using backoff. Do not blindly retry `400`, `401`, `403`, or `422`.
