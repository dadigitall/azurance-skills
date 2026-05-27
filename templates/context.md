# Azurance LLM Context

Azurance exposes public BFF APIs for ERP integrations in healthcare and insurance workflows. Internal microservices and old direct routes are not part of the public contract.

## Public API surfaces

| Surface | Production | Sandbox |
| --- | --- | --- |
| ERP Prestataires | `https://provider-api.elenami.com` | `https://provider-api-sandbox.elenami.com` |
| ERP Assurances | `https://insurer-api.elenami.com` | `https://insurer-api-sandbox.elenami.com` |

All public APIs are versioned under `/api/v1`, except documented health endpoints.

## Authentication

Use `X-Api-Key` for every partner API call. The key resolves the partner, tenant, environment, scopes, and subject context.

Common headers:

```http
Accept: application/json
Content-Type: application/json
X-Api-Key: ${AZURANCE_API_KEY}
X-Request-Id: erp-request-001
```

Never use `X-Service-Key` in partner ERP code. That header is internal to Azurance service-to-service traffic.

## Security rules for generated code

- Store API keys in server-side secrets or environment variables.
- Use different keys and base URLs for sandbox and production.
- Do not expose API keys in frontend JavaScript, mobile apps, logs, crash reports, or monitoring metadata.
- Do not call internal Azurance microservices directly.
- Do not send `tenant_id`, `tenant_uid`, `provider_uuid`, `provider_uid`, `insurer_uid`, or equivalent tenant context in public payloads.

## Identifiers

Use public UUIDs and business identifiers:

| Resource | Preferred identifiers |
| --- | --- |
| Insured member | `uuid`, `policy_number` |
| Subscription | `uuid`, `subscription_number` |
| Plan | `plan_code` |
| Claim | public `uuid` or `claim_id` |
| Payable invoice | `uuid` |
| Payment | `uuid` |
| Media | `media_uid` |

Internal SQL IDs are not part of the public API contract.

## Data conventions

- Calendar dates: `YYYY-MM-DD`.
- Timestamps: ISO 8601 UTC, for example `2026-05-15T09:30:00Z`.
- Default currency in examples: `XOF`.
- JSON endpoints use `application/json`.
- Media uploads use `multipart/form-data` with `file` and business fields such as `category`, `purpose`, or `metadata`.

## Error handling

| HTTP status | Meaning | Integration behavior |
| --- | --- | --- |
| `400` | Invalid request or forbidden public context field | Fix payload; do not retry unchanged. |
| `401` | API key missing, invalid, expired, or revoked | Fix or rotate the key. |
| `403` | Missing scope | Request scope during onboarding. |
| `404` | Public resource not found for this key tenant | Verify identifier and synchronization state. |
| `422` | Business validation rejected | Show business reason and stop that workflow. |
| `429` | Rate limit reached | Retry with progressive backoff. |
| `5xx` | Azurance or downstream availability issue | Retry with idempotence and backoff. |

Log HTTP status, endpoint, public resource IDs, error message, and `X-Request-Id`. Never log raw API keys.
