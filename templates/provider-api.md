# Azurance ERP Prestataires

Use this file for integrations from hospitals, clinics, pharmacies, laboratories, and other care providers.

## Environment

```bash
AZURANCE_PROVIDER_BASE_URL=https://provider-api-sandbox.elenami.com
AZURANCE_PROVIDER_API_KEY=azr_sandbox_provider_...
```

Production uses `https://provider-api.elenami.com` with a production key.

## Standard workflow

1. Verify the API key with `GET /api/v1/auth/verify`.
2. Read the network profile with `GET /api/v1/network/profile`.
3. Run an eligibility precheck with `POST /api/v1/eligibility/check`.
4. Create clinical context when needed with `POST /api/v1/encounters`.
5. Upload clinical or claim documents with `POST /api/v1/media/uploads`.
6. Submit the claim with `POST /api/v1/claims`.
7. Sync reimbursements with `GET /api/v1/billing/sync` and webhooks.

## Eligibility precheck

`POST /api/v1/eligibility/check`

```json
{
  "identifier": "POL-SBX-000001",
  "coverage_code": "CONSULTATION_GP",
  "amount": 15000,
  "purpose": "PRECHECK"
}
```

The precheck is informational and does not create a claim. Azurance performs a final eligibility check during claim submission.

## Media upload

`POST /api/v1/media/uploads` uses `multipart/form-data`.

Important fields:

| Field | Meaning |
| --- | --- |
| `file` | Document sent by the ERP. |
| `category` | `CLINICAL_DOCUMENT`, `CLAIM_SUPPORTING_DOCUMENT`, `CLAIM_ATTACHMENT`, or `OTHER`. |
| `purpose` | Optional business purpose. |
| `metadata` | Optional stringified JSON. |

## Claim submission

`POST /api/v1/claims`

```json
{
  "subscription_id": "sub-sandbox-001",
  "policyholder_id": "insured-sandbox-001",
  "coverage_type_code": "CONSULTATION_GP",
  "service_date": "2026-05-15",
  "amount_claimed": 15000,
  "currency": "XOF",
  "precheck_eligibility_uuid": "01HY_PRECHECK_UUID",
  "items": [
    {
      "description": "Consultation medecin generaliste",
      "quantity": 1,
      "unit_price": 15000
    }
  ],
  "documents": [
    {
      "document_type": "CONSULTATION_REPORT",
      "media_uid": "med-sandbox-001",
      "file_name": "consultation.pdf"
    }
  ]
}
```

If the final check fails, Azurance returns `422` and no claim is created.

## Sync and webhooks

Use `GET /api/v1/billing/sync?updated_after=2026-05-15T00:00:00Z` for incremental sync. Use `POST /api/v1/webhook-subscriptions` for payment and payable invoice events.

Avoid high-volume polling claim by claim.
