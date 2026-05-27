# Azurance ERP Assurances

Use this file for integrations from insurers, mutuals, and health portfolio managers.

## Environment

```bash
AZURANCE_INSURER_BASE_URL=https://insurer-api-sandbox.elenami.com
AZURANCE_INSURER_API_KEY=azr_sandbox_insurer_...
```

Production uses `https://insurer-api.elenami.com` with a production key.

## Standard workflow

1. Verify the API key with `GET /api/v1/auth/verify`.
2. Create or sync plans with `POST /api/v1/plans`.
3. Create or sync members with `POST /api/v1/members`.
4. Create subscriptions with `POST /api/v1/subscriptions`.
5. Add beneficiaries with `POST /api/v1/subscriptions/{subscriptionUuid}/beneficiaries`.
6. Test eligibility with `POST /api/v1/eligibility/check`.
7. Suspend, expire, or renew subscriptions.
8. Review and update claims.

## Plan creation

`POST /api/v1/plans`

```json
{
  "plan_code": "STANDARD-SBX",
  "plan_name": "Plan Standard Sandbox",
  "plan_type": "STANDARD",
  "base_premium": 25000,
  "premium_frequency": "MONTHLY",
  "annual_coverage_limit": 1500000,
  "effective_date": "2026-01-01",
  "is_active": true
}
```

## Member creation

`POST /api/v1/members`

```json
{
  "policy_number": "POL-SBX-000001",
  "first_name": "Awa",
  "last_name": "Kone",
  "date_of_birth": "1992-03-22",
  "gender": "FEMALE",
  "phone_primary": "+22997000000",
  "email": "awa.kone@example.com",
  "status": "ACTIVE",
  "kyc_status": "VERIFIED"
}
```

Reuse the public member `uuid` returned by the API when creating subscriptions.

## Subscription creation

`POST /api/v1/subscriptions`

```json
{
  "policyholder_uuid": "member-sandbox-001",
  "subscription_number": "SUB-SBX-000001",
  "plan_code": "STANDARD-SBX",
  "plan_name": "Plan Standard Sandbox",
  "status": "ACTIVE",
  "effective_date": "2026-01-01",
  "expiry_date": "2026-12-31",
  "premium_amount": 25000,
  "premium_frequency": "MONTHLY",
  "annual_coverage_limit": 1500000
}
```

Renewal creates a new active subscription without overwriting historical contracts.

## Claims

Common claim endpoints:

```http
GET /api/v1/claims
GET /api/v1/claims/{claimId}
PUT /api/v1/claims/{claimId}/status
```

Valid status updates are `UNDER_REVIEW`, `APPROVED`, `REJECTED`, and `PAID`. Claim decisions should remain consistent with eligibility and reimbursement snapshots calculated at submission time.
