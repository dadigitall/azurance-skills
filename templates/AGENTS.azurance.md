# Azurance API Integration

Use this section when adding, reviewing, or debugging integrations with the public Azurance APIs.

## Sources

- Start with `.azurance/llm/context.md` for global rules, conventions, and security.
- Use `.azurance/llm/provider-api.md` for ERP provider workflows and endpoint list.
- Use `.azurance/llm/insurer-api.md` for ERP insurer workflows and endpoint list.
- Use `.azurance/llm/openapi/provider-api.openapi.yml` and `.azurance/llm/openapi/insurer-api.openapi.yml` for exact paths, methods, schemas, parameters, and examples.
- The full interactive documentation is at https://dadigitall.mintlify.site.

## Non-negotiable rules

- Call only the public API domains:
  - Provider production: `https://provider-api.elenami.com`
  - Provider sandbox: `https://provider-api-sandbox.elenami.com`
  - Insurer production: `https://insurer-api.elenami.com`
  - Insurer sandbox: `https://insurer-api-sandbox.elenami.com`
- Send partner authentication with `X-Api-Key`. This is the only public auth header.
- Never send `X-Service-Key` from an ERP integration. It is not intended for partner use.
- Keep API keys server-side only. Never expose them in a browser, mobile binary, logs, crash reports, or analytics payload.
- Do not send `tenant_id`, `tenant_uid`, `provider_uuid`, `provider_uid`, `insurer_uid`, `insurer_uuid` or equivalent tenant context in public request bodies or query strings. These values are derived from the API key.
- Undocumented fields in public requests are rejected with `400`.
- Prefer public UUIDs and business codes over internal IDs.
- Include `X-Request-Id` when a workflow spans multiple calls.
- Send `Idempotency-Key` on resource-creating calls (`POST /claims/draft`, `POST /service-executions`, `POST /media/uploads`) when the endpoint contract requires it.
- Retry only `429` and `5xx` responses, using exponential backoff. Do not retry `400`, `401`, `403`, or `422` without correction.
- All calls must come from a backend ERP or server middleware, never from a frontend or mobile app.

## Scopes

Provider scopes include: `covered_persons.resolve`, `consent_requests.create`, `consent_requests.verify`, `eligibility.check`, `providers.network.view`, `providers.network.manage`, `service_executions.create`, `claims.create`, `claims.view`, `claims.documents.attach`, `clinical.encounters.manage`, `clinical.encounters.view`, `clinical.prescriptions.manage`, `clinical.prescriptions.view`, `clinical.records.manage`, `clinical.records.view`, `clinical.documents.attach`, `media.upload`, `billing.payable_invoices.view`, `billing.payments.view`, `billing.sync`, `billing.webhooks.manage`, `prior_authorizations.create`, `prior_authorizations.view`, `prior_authorizations.documents`, `prior_authorizations.cancel`, `reference.medications.view`, `reference.medical_acts.view`, `reference.pathologies.view`.

Insurer scopes include: `insurer.policies.view`, `insurer.policies.manage`, `insurer.members.view`, `insurer.members.manage`, `insurer.claims.view`, `insurer.claims.manage`, `insurer.prior_authorizations.view`, `insurer.prior_authorizations.manage`, `insurer.providers.view`, `insurer.providers.manage`, `eligibility.check`.

## Webhooks

When integrating webhooks, verify the HMAC signature on the raw body before parsing. Store `X-Azurance-Event-Id` for idempotent processing. Refuse deliveries with stale timestamps. Fetch heavy details via paginated API or `/api/v1/billing/sync`, not from the webhook payload.
