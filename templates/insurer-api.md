# Azurance ERP Assurances

Utiliser ce fichier pour les intégrations depuis les assureurs, mutuelles et gestionnaires de portefeuilles santé.

## Environnement

```bash
AZURANCE_INSURER_BASE_URL=https://insurer-api-sandbox.elenami.com
AZURANCE_INSURER_API_KEY=azr_sandbox_insurer_...
```

La production utilise `https://insurer-api.elenami.com` avec une clé production.

## Workflow standard

1. Vérifier la clé avec `GET /api/v1/auth/verify`.
2. Créer ou synchroniser les plans avec `POST /api/v1/plans`.
3. Créer ou mettre à jour les membres avec `POST /api/v1/members` et `PUT /api/v1/members/{memberUuid}`.
4. Créer les souscriptions avec `POST /api/v1/subscriptions`.
5. Ajouter les bénéficiaires avec `POST /api/v1/subscriptions/{subscriptionUuid}/beneficiaries`.
6. Tester l'éligibilité avec `POST /api/v1/eligibility/check` ou `POST /api/v1/eligibility/check-batch`.
7. Suspendre, expirer ou renouveler les souscriptions avec `PATCH /api/v1/subscriptions/{subscriptionUuid}/status` et `POST /api/v1/subscriptions/{subscriptionUuid}/renew`.
8. Traiter les claims avec `GET /api/v1/claims`, `GET /api/v1/claims/{claimId}`, `GET /api/v1/claims/{claimId}/clinical-context` et `PATCH /api/v1/claims/{claimId}/status`.
9. Consulter le réseau prestataires, la facturation, les analytics et les notifications.

## Groupes d'endpoints

### Authentification

| Méthode | Chemin | Scope | Description |
| --- | --- | --- | --- |
| `GET` | `/api/v1/auth/verify` | — | Valider la clé API et récupérer le contexte assureur. |

### Plans

| Méthode | Chemin | Scope | Description |
| --- | --- | --- | --- |
| `GET` | `/api/v1/plans` | `insurer.policies.view` | Lister les plans. |
| `POST` | `/api/v1/plans` | `insurer.policies.manage` | Créer un plan. |
| `GET` | `/api/v1/plans/{planCode}` | `insurer.policies.view` | Détail d'un plan par code. |
| `PUT` | `/api/v1/plans/{planCode}` | `insurer.policies.manage` | Mettre à jour un plan. |
| `DELETE` | `/api/v1/plans/{planCode}` | `insurer.policies.manage` | Supprimer un plan. |

### Types de couvertures

| Méthode | Chemin | Scope | Description |
| --- | --- | --- | --- |
| `GET` | `/api/v1/coverage-types` | `insurer.policies.view` | Lister les types de couvertures. |
| `GET` | `/api/v1/coverage-types/{code}` | `insurer.policies.view` | Détail d'un type de couverture. |

### Calcul de remboursement

| Méthode | Chemin | Scope | Description |
| --- | --- | --- | --- |
| `POST` | `/api/v1/reimbursement/calculate` | `insurer.policies.view` | Simuler ou auditer un calcul de remboursement. |

### Membres

| Méthode | Chemin | Scope | Description |
| --- | --- | --- | --- |
| `GET` | `/api/v1/members` | `insurer.members.view` | Lister les membres. |
| `POST` | `/api/v1/members` | `insurer.members.manage` | Créer un membre. |
| `GET` | `/api/v1/members/{memberUuid}` | `insurer.members.view` | Détail d'un membre. |
| `PUT` | `/api/v1/members/{memberUuid}` | `insurer.members.manage` | Mettre à jour un membre. |
| `POST` | `/api/v1/members/{memberUuid}/portrait` | `insurer.members.manage` | Uploader un portrait (photo). |
| `GET` | `/api/v1/members/{memberUuid}/portrait/status` | `insurer.members.view` | Statut du portrait. |

### Souscriptions

| Méthode | Chemin | Scope | Description |
| --- | --- | --- | --- |
| `GET` | `/api/v1/subscriptions` | `insurer.members.view` | Lister les souscriptions. |
| `POST` | `/api/v1/subscriptions` | `insurer.members.manage` | Créer une souscription. |
| `GET` | `/api/v1/subscriptions/{subscriptionUuid}` | `insurer.members.view` | Détail d'une souscription. |
| `PATCH` | `/api/v1/subscriptions/{subscriptionUuid}/status` | `insurer.members.manage` | Changer le statut (ACTIVE, SUSPENDED, EXPIRED, CANCELLED). |
| `POST` | `/api/v1/subscriptions/{subscriptionUuid}/renew` | `insurer.members.manage` | Renouveler une souscription. |

### Bénéficiaires

| Méthode | Chemin | Scope | Description |
| --- | --- | --- | --- |
| `GET` | `/api/v1/subscriptions/{subscriptionUuid}/beneficiaries` | `insurer.members.view` | Lister les bénéficiaires. |
| `POST` | `/api/v1/subscriptions/{subscriptionUuid}/beneficiaries` | `insurer.members.manage` | Ajouter un bénéficiaire. |
| `PATCH` | `/api/v1/subscriptions/{subscriptionUuid}/beneficiaries/{beneficiaryUuid}/status` | `insurer.members.manage` | Changer le statut d'un bénéficiaire. |
| `POST` | `/api/v1/subscriptions/{subscriptionUuid}/beneficiaries/{beneficiaryUuid}/portrait` | `insurer.members.manage` | Uploader un portrait de bénéficiaire. |
| `GET` | `/api/v1/subscriptions/{subscriptionUuid}/beneficiaries/{beneficiaryUuid}/portrait/status` | `insurer.members.view` | Statut du portrait de bénéficiaire. |

### Éligibilité

| Méthode | Chemin | Scope | Description |
| --- | --- | --- | --- |
| `POST` | `/api/v1/eligibility/check` | `eligibility.check` | Check d'éligibilité unitaire. |
| `POST` | `/api/v1/eligibility/check-batch` | `eligibility.check` | Check d'éligibilité en lot. |

### Claims

| Méthode | Chemin | Scope | Description |
| --- | --- | --- | --- |
| `GET` | `/api/v1/claims/stats` | `insurer.claims.view` | Statistiques claims. |
| `GET` | `/api/v1/claims` | `insurer.claims.view` | Lister les claims. |
| `GET` | `/api/v1/claims/{claimId}` | `insurer.claims.view` | Détail d'un claim. |
| `GET` | `/api/v1/claims/{claimId}/clinical-context` | `insurer.claims.view` | Contexte clinique, diagnostics et prescriptions liés au claim. |
| `PATCH` | `/api/v1/claims/{claimId}/status` | `insurer.claims.manage` | Mettre à jour le statut d'un claim. |
| `GET` | `/api/v1/claims/{claimId}/documents` | `insurer.claims.view` | Documents d'un claim. |
| `GET` | `/api/v1/claims/{claimId}/clinical-context` | `insurer.claims.view` | Contexte clinique pour la revue d'un claim (encounters, diagnostics, prescriptions). |

### Fraud assessment

| Méthode | Chemin | Scope | Description |
| --- | --- | --- | --- |
| `POST` | `/api/v1/claims/{claimId}/fraud-assessment` | `insurer.claims.manage` | Créer une évaluation de fraude. |
| `GET` | `/api/v1/fraud-assessments/{uuid}` | `insurer.claims.view` | Détail d'une évaluation. |
| `POST` | `/api/v1/fraud-assessments/{uuid}/feedback` | `insurer.claims.manage` | Retour d'expérience sur une évaluation. |

### Autorisations préalables

| Méthode | Chemin | Scope | Description |
| --- | --- | --- | --- |
| `GET` | `/api/v1/prior-authorizations` | `insurer.claims.view` | Lister les autorisations préalables. |
| `GET` | `/api/v1/prior-authorizations/{uid}` | `insurer.claims.view` | Détail d'une autorisation. |
| `POST` | `/api/v1/prior-authorizations/{uid}/decision` | `insurer.prior_authorizations.manage` | Décision sur une autorisation préalable. |

### Réseau prestataires

| Méthode | Chemin | Scope | Description |
| --- | --- | --- | --- |
| `GET` | `/api/v1/providers` | `insurer.providers.view` | Lister les prestataires. |
| `GET` | `/api/v1/providers/network-relationships` | `insurer.providers.view` | Conventions réseau assureur-prestataire. |
| `GET` | `/api/v1/providers/network-requests` | `insurer.providers.view` | Demandes de relation réseau. |
| `POST` | `/api/v1/providers/network-requests/{uid}/approve` | `insurer.providers.manage` | Approuver une demande réseau. |
| `POST` | `/api/v1/providers/network-requests/{uid}/reject` | `insurer.providers.manage` | Rejeter une demande réseau. |
| `GET` | `/api/v1/providers/{providerUuid}` | `insurer.providers.view` | Détail d'un prestataire. |
| `GET` | `/api/v1/providers/{providerUuid}/specialties` | `insurer.providers.view` | Spécialités d'un prestataire. |
| `GET` | `/api/v1/providers/{providerUuid}/network-check` | `insurer.providers.view` | Vérifier le conventionnement. |

### Facturation et paiements

| Méthode | Chemin | Scope | Description |
| --- | --- | --- | --- |
| `GET` | `/api/v1/billing/payable-invoices` | `insurer.claims.view` | Lister les bordereaux payables. |
| `GET` | `/api/v1/billing/payable-invoices/{uuid}` | `insurer.claims.view` | Détail d'un bordereau. |
| `GET` | `/api/v1/billing/payable-invoices/{uuid}/items` | `insurer.claims.view` | Lignes d'un bordereau. |
| `GET` | `/api/v1/billing/payments` | `insurer.claims.view` | Lister les paiements. |
| `GET` | `/api/v1/billing/payments/{uuid}` | `insurer.claims.view` | Détail d'un paiement. |
| `POST` | `/api/v1/billing/payments/{uuid}/confirm` | `insurer.claims.manage` | Confirmer un paiement. |
| `GET` | `/api/v1/billing/payments/{uuid}/allocations` | `insurer.claims.view` | Allocations d'un paiement. |
| `GET` | `/api/v1/billing/sync` | `insurer.claims.view` | Flux incrémental des événements billing. |

### Référentiels

| Méthode | Chemin | Scope | Description |
| --- | --- | --- | --- |
| `GET` | `/api/v1/reference/medications` | — | Lister les médicaments. |
| `GET` | `/api/v1/reference/medications/search` | — | Rechercher un médicament. |
| `GET` | `/api/v1/reference/medications/export` | — | Exporter le référentiel. |
| `GET` | `/api/v1/reference/medications/{uid}` | — | Détail d'un médicament. |
| `GET` | `/api/v1/reference/medical-acts/categories` | — | Catégories d'actes médicaux. |
| `GET` | `/api/v1/reference/medical-acts/category/{category}` | — | Actes par catégorie. |
| `GET` | `/api/v1/reference/medical-acts/search` | — | Rechercher un acte. |
| `GET` | `/api/v1/reference/medical-acts/export` | — | Exporter les actes. |
| `GET` | `/api/v1/reference/medical-acts/chapters` | — | Chapitres d'actes. |
| `GET` | `/api/v1/reference/medical-acts/chapter/{chapterNo}` | — | Actes par chapitre. |
| `GET` | `/api/v1/reference/medical-acts/{identifier}` | — | Détail d'un acte. |
| `GET` | `/api/v1/reference/pathologies/chapters` | — | Chapitres de pathologies. |
| `GET` | `/api/v1/reference/pathologies/chapter/{chapterCode}` | — | Pathologies par chapitre. |
| `GET` | `/api/v1/reference/pathologies/search` | — | Rechercher une pathologie. |
| `GET` | `/api/v1/reference/pathologies/export` | — | Exporter les pathologies. |
| `GET` | `/api/v1/reference/pathologies/{identifier}` | — | Détail d'une pathologie. |

### Webhooks

| Méthode | Chemin | Scope | Description |
| --- | --- | --- | --- |
| `GET` | `/api/v1/webhooks` | — | Lister les souscriptions webhook. |
| `POST` | `/api/v1/webhooks` | — | Créer une souscription webhook. |
| `PATCH` | `/api/v1/webhooks/{uuid}` | — | Mettre à jour une souscription. |
| `DELETE` | `/api/v1/webhooks/{uuid}` | — | Supprimer une souscription. |

### Analytics

| Méthode | Chemin | Scope | Description |
| --- | --- | --- | --- |
| `GET` | `/api/v1/analytics/portfolio-summary` | `insurer.claims.view` | Synthèse du portefeuille. |
| `GET` | `/api/v1/analytics/claims-summary` | `insurer.claims.view` | Synthèse des claims. |
| `GET` | `/api/v1/analytics/loss-ratio` | `insurer.claims.view` | Ratio de sinistralité. |
| `GET` | `/api/v1/analytics/provider-performance` | `insurer.claims.view` | Performance des prestataires. |
| `GET` | `/api/v1/analytics/coverage-utilization` | `insurer.claims.view` | Utilisation des couvertures. |

### Notifications

| Méthode | Chemin | Scope | Description |
| --- | --- | --- | --- |
| `GET` | `/api/v1/notifications` | — | Lister les notifications. |
| `GET` | `/api/v1/notifications/{id}` | — | Détail d'une notification. |
| `POST` | `/api/v1/notifications/{id}/read` | — | Marquer une notification comme lue. |
| `GET` | `/api/v1/notifications/preferences` | — | Préférences de notification. |
| `PATCH` | `/api/v1/notifications/preferences` | — | Mettre à jour les préférences. |

## Création de plan

`POST /api/v1/plans`

```json
{
  "plan_code": "STANDARD-SBX",
  "plan_name": "Plan Standard Sandbox",
  "plan_type": "STANDARD",
  "description": "Couverture standard sandbox",
  "base_premium": 25000,
  "premium_frequency": "MONTHLY",
  "annual_coverage_limit": 1500000,
  "dependent_age_limit": 21,
  "waiting_period_days": 0,
  "grace_period_days": 30,
  "effective_date": "2026-01-01",
  "is_active": true
}
```

## Création de membre

`POST /api/v1/members`

```json
{
  "policy_number": "POL-SBX-000001",
  "national_id": "BJ-00000001",
  "first_name": "Awa",
  "last_name": "Kone",
  "date_of_birth": "1992-03-22",
  "gender": "FEMALE",
  "phone_primary": "+22997000000",
  "email": "awa.kone@example.com",
  "city": "Cotonou",
  "country": "BJ",
  "status": "ACTIVE",
  "kyc_status": "VERIFIED"
}
```

Réutiliser le `uuid` public retourné pour créer la souscription.

## Création de souscription

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

## Ajout de bénéficiaire

`POST /api/v1/subscriptions/{subscriptionUuid}/beneficiaries`

```json
{
  "beneficiary_number": "BEN-SBX-000001",
  "first_name": "Mariam",
  "last_name": "Kone",
  "date_of_birth": "2015-04-10",
  "gender": "FEMALE",
  "relationship": "CHILD",
  "coverage_start_date": "2026-01-01",
  "is_dependent": true
}
```

## Éligibilité

`POST /api/v1/eligibility/check`

```json
{
  "identifier": "POL-SBX-000001",
  "coverage_code": "CONSULTATION_GP",
  "amount": 15000,
  "service_date": "2026-05-15"
}
```

Pour les checks en lot, utiliser `POST /api/v1/eligibility/check-batch` avec un tableau `checks`.

## Claims

`PATCH /api/v1/claims/{claimId}/status`

```json
{
  "status": "APPROVED",
  "amount_approved": 12000,
  "reviewer_notes": "Dossier conforme",
  "decision_reason": "Garantie active et documents fournis"
}
```

Statuts claim : `SUBMITTED`, `UNDER_REVIEW`, `INFO_NEEDED`, `APPROVED`, `REJECTED`, `PAID`. Les décisions doivent rester cohérentes avec les snapshots d'éligibilité et de remboursement calculés à la soumission.

## Renouvellement

`POST /api/v1/subscriptions/{subscriptionUuid}/renew`

```json
{
  "subscription_number": "SUB-SBX-000002",
  "effective_date": "2027-01-01",
  "expiry_date": "2027-12-31",
  "premium_amount": 27000,
  "annual_coverage_limit": 1600000
}
```

Le renouvellement crée une nouvelle souscription active sans écraser l'ancien contrat historisé.
