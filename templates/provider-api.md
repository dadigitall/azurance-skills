# Azurance ERP Prestataires

Utiliser ce fichier pour les intégrations depuis les hôpitaux, cliniques, pharmacies, laboratoires et autres prestataires de soins.

## Environnement

```bash
AZURANCE_PROVIDER_BASE_URL=https://provider-api-sandbox.elenami.com
AZURANCE_PROVIDER_API_KEY=azr_sandbox_provider_...
```

La production utilise `https://provider-api.elenami.com` avec une clé production.

## Workflow standard

1. Vérifier la clé avec `GET /api/v1/auth/verify`.
2. Lire le profil réseau avec `GET /api/v1/network/profile` et le statut avec `GET /api/v1/network/status`.
3. Retrouver la personne couverte avec `POST /api/v1/covered-persons/resolve`.
4. Obtenir un consentement fort avec `POST /api/v1/consent-requests`, puis vérifier avec `POST /api/v1/consent-requests/{uid}/verify`.
5. Pré-vérifier l'éligibilité avec `POST /api/v1/eligibility/check` (`purpose=PRECHECK`).
6. Créer le contexte clinique avec `POST /api/v1/encounters` si pertinent.
7. Enregistrer la prestation effectuée avec `POST /api/v1/service-executions` (`Idempotency-Key`).
8. Uploader les documents avec `POST /api/v1/media/uploads` (`multipart/form-data`).
9. Créer puis soumettre le claim avec `POST /api/v1/claims/draft` et `POST /api/v1/claims/{claimId}/submit`.
10. Suivre les remboursements avec `GET /api/v1/billing/sync` et les webhooks.

## Groupes d'endpoints

### Authentification

| Méthode | Chemin | Scope | Description |
| --- | --- | --- | --- |
| `GET` | `/api/v1/auth/encryption-key` | — | Clé publique de chiffrement pour données sensibles. |
| `GET` | `/api/v1/auth/verify` | — | Valider la clé API et récupérer le contexte partenaire. |

### Réseau

| Méthode | Chemin | Scope | Description |
| --- | --- | --- | --- |
| `GET` | `/api/v1/network/status` | `providers.network.view` | Statut du prestataire dans le réseau. |
| `GET` | `/api/v1/network/profile` | `providers.network.view` | Profil réseau du prestataire. |
| `GET` | `/api/v1/network/relationships` | `providers.network.view` | Relations réseau du prestataire. |
| `GET` | `/api/v1/provider/insurer-relationships` | `providers.network.view` | Relations prestataire-assureur. |
| `GET` | `/api/v1/network/insurers` | `providers.network.view` | Assureurs du réseau. |
| `POST` | `/api/v1/network/request` | `providers.network.manage` | Demander une relation réseau. |

### Personnes couvertes et consentement

| Méthode | Chemin | Scope | Description |
| --- | --- | --- | --- |
| `POST` | `/api/v1/covered-persons/resolve` | `covered_persons.resolve` | Résoudre une personne couverte par identifiant. |
| `POST` | `/api/v1/covered-persons/support-search` | `covered_persons.resolve` | Recherche support pour assistance. |
| `GET` | `/api/v1/covered-persons/{coveredPersonUid}/portrait` | `covered_persons.resolve` | Portrait (photo) de la personne couverte. |
| `POST` | `/api/v1/consent-requests` | `consent_requests.create` | Créer une demande de consentement fort (N2/N3). |
| `GET` | `/api/v1/consent-requests/{uid}` | `consent_requests.create` | Statut d'une demande de consentement. |
| `POST` | `/api/v1/consent-requests/{uid}/verify` | `consent_requests.verify` | Vérifier un OTP/TOTP/challenge de consentement. |

### Éligibilité

| Méthode | Chemin | Scope | Description |
| --- | --- | --- | --- |
| `POST` | `/api/v1/eligibility/check` | `eligibility.check` | Pré-vérification (`PRECHECK`) ou vérification finale (`CLAIM_SUBMISSION`). |
| `POST` | `/api/v1/eligibility/member-card` | `eligibility.check` | Fiche synthétique de la carte membre. |

### Autorisations préalables

| Méthode | Chemin | Scope | Description |
| --- | --- | --- | --- |
| `POST` | `/api/v1/prior-authorizations` | `prior_authorizations.create` | Créer une demande d'autorisation préalable. |
| `GET` | `/api/v1/prior-authorizations` | `prior_authorizations.view` | Lister les autorisations préalables. |
| `GET` | `/api/v1/prior-authorizations/{uid}` | `prior_authorizations.view` | Détail d'une autorisation. |
| `POST` | `/api/v1/prior-authorizations/{uid}/documents` | `prior_authorizations.documents` | Joindre un document à une autorisation. |
| `POST` | `/api/v1/prior-authorizations/{uid}/cancel` | `prior_authorizations.cancel` | Annuler une autorisation. |

### Contexte clinique

| Méthode | Chemin | Scope | Description |
| --- | --- | --- | --- |
| `POST` | `/api/v1/encounters` | `clinical.encounters.manage` | Créer un encounter (consultation, hospitalisation…). |
| `GET` | `/api/v1/encounters` | `clinical.encounters.view` | Lister les encounters. |
| `GET` | `/api/v1/encounters/{encounterId}` | `clinical.encounters.view` | Détail d'un encounter. |
| `PATCH` | `/api/v1/encounters/{encounterId}` | `clinical.encounters.manage` | Mettre à jour un encounter (discharge_date, clinical_summary, icd10_codes, statut). |
| `POST` | `/api/v1/encounters/{encounterId}/diagnoses` | `clinical.encounters.manage` | Ajouter un diagnostic CIM-10 structuré. |
| `GET` | `/api/v1/encounters/{encounterId}/diagnoses` | `clinical.encounters.view` | Lister les diagnostics structurés. |
| `GET` | `/api/v1/encounters/{encounterId}/medical-acts` | `clinical.encounters.view` | Actes médicaux d'un encounter. |
| `POST` | `/api/v1/encounters/{encounterId}/medical-acts` | `clinical.encounters.manage` | Ajouter un acte médical à un encounter. |
| `GET` | `/api/v1/encounters/{encounterId}/diagnoses` | `clinical.encounters.view` | Lister les diagnostics CIM-10 d'un encounter. |
| `POST` | `/api/v1/encounters/{encounterId}/diagnoses` | `clinical.encounters.manage` | Ajouter un diagnostic CIM-10 à un encounter. |
| `POST` | `/api/v1/encounters/{encounterId}/documents` | `clinical.documents.attach` | Joindre un document à un encounter. |
| `GET` | `/api/v1/encounters/{encounterId}/prescriptions` | `clinical.prescriptions.view` | Prescriptions d'un encounter. |

### Prescriptions

| Méthode | Chemin | Scope | Description |
| --- | --- | --- | --- |
| `POST` | `/api/v1/prescriptions` | `clinical.prescriptions.manage` | Créer une prescription. |
| `GET` | `/api/v1/prescriptions` | `clinical.prescriptions.view` | Lister les prescriptions. |
| `GET` | `/api/v1/prescriptions/{prescriptionId}` | `clinical.prescriptions.view` | Détail d'une prescription. |
| `GET` | `/api/v1/covered-persons/{coveredPersonType}/{coveredPersonUid}/prescriptions` | `clinical.prescriptions.view` | Prescriptions d'une personne couverte. |
| `GET` | `/api/v1/insured/{insuredUid}/prescriptions` | `clinical.prescriptions.view` | Prescriptions d'un assuré. |

### Dossier médical

| Méthode | Chemin | Scope | Description |
| --- | --- | --- | --- |
| `GET` | `/api/v1/insured/{insuredUid}/medical-record` | `clinical.records.view` | Dossier médical d'un assuré. |
| `PUT` | `/api/v1/insured/{insuredUid}/medical-record` | `clinical.records.manage` | Mettre à jour le dossier médical. |
| `GET` | `/api/v1/insured/{insuredUid}/medical-record/summary` | `clinical.records.view` | Synthèse du dossier médical. |
| `GET` | `/api/v1/insured/{insuredUid}/medical-record/timeline` | `clinical.records.view` | Timeline du dossier médical. |

### Médias

| Méthode | Chemin | Scope | Description |
| --- | --- | --- | --- |
| `POST` | `/api/v1/media/uploads` | `media.upload` | Upload de document clinique ou justificatif. |

`POST /api/v1/media/uploads` utilise `multipart/form-data`. Champs principaux :

| Champ | Description |
| --- | --- |
| `file` | Fichier envoyé par l'ERP. |
| `category` | `CLINICAL_DOCUMENT`, `CLAIM_SUPPORTING_DOCUMENT`, `CLAIM_ATTACHMENT` ou `OTHER`. |
| `purpose` | Usage métier optionnel. |
| `metadata` | Métadonnées JSON optionnelles. |

### Prestations effectuées

| Méthode | Chemin | Scope | Description |
| --- | --- | --- | --- |
| `POST` | `/api/v1/service-executions` | `service_executions.create` | Enregistrer la prestation réellement effectuée (`Idempotency-Key`). |
| `GET` | `/api/v1/service-executions` | `service_executions.view` | Lister les prestations. |

### Claims

| Méthode | Chemin | Scope | Description |
| --- | --- | --- | --- |
| `GET` | `/api/v1/claims` | `claims.view` | Lister les claims. |
| `GET` | `/api/v1/claims/{claimId}` | `claims.view` | Détail d'un claim. |
| `POST` | `/api/v1/claims/{claimId}/documents` | `claims.documents.attach` | Joindre un document à un claim. |
| `POST` | `/api/v1/claims/draft` | `claims.create` | Créer un brouillon de claim. |
| `GET` | `/api/v1/claims/{claimId}/draft` | `claims.view` | Consulter un brouillon. |
| `POST` | `/api/v1/claims/{claimId}/submit` | `claims.create` | Soumettre un brouillon. |
| `POST` | `/api/v1/claims/{claimId}/draft/cancel` | `claims.create` | Annuler un brouillon. |

### Facturation et paiements

| Méthode | Chemin | Scope | Description |
| --- | --- | --- | --- |
| `GET` | `/api/v1/payable-invoices` | `billing.payable_invoices.view` | Lister les bordereaux payables. |
| `GET` | `/api/v1/payable-invoices/{uuid}` | `billing.payable_invoices.view` | Détail d'un bordereau. |
| `GET` | `/api/v1/payable-invoices/{uuid}/items` | `billing.payable_invoices.view` | Lignes d'un bordereau. |
| `GET` | `/api/v1/payments/{uuid}` | `billing.payments.view` | Consulter un paiement. |
| `GET` | `/api/v1/payments/{uuid}/allocations` | `billing.payments.view` | Allocations d'un paiement. |
| `GET` | `/api/v1/billing/sync` | `billing.sync` | Flux incrémental des événements billing. |

### Webhooks

| Méthode | Chemin | Scope | Description |
| --- | --- | --- | --- |
| `GET` | `/api/v1/webhooks` | `provider.webhooks.view` | Lister les souscriptions webhook. |
| `POST` | `/api/v1/webhooks` | `provider.webhooks.manage` | Créer une souscription webhook. |
| `PATCH` | `/api/v1/webhooks/{uuid}` | `provider.webhooks.manage` | Mettre à jour une souscription. |
| `DELETE` | `/api/v1/webhooks/{uuid}` | `provider.webhooks.manage` | Supprimer une souscription. |
| `GET` | `/api/v1/webhooks/{uuid}/deliveries` | `provider.webhooks.view` | Lister les livraisons d'un abonnement. |
| `POST` | `/api/v1/webhooks/deliveries/{uuid}/retry` | `provider.webhooks.manage` | Relancer une livraison échouée. |

### Référentiels

| Méthode | Chemin | Scope | Description |
| --- | --- | --- | --- |
| `GET` | `/api/v1/reference/medications` | `reference.medications.view` | Lister les médicaments. |
| `GET` | `/api/v1/reference/medications/search` | `reference.medications.view` | Rechercher un médicament. |
| `GET` | `/api/v1/reference/medications/export` | `reference.medications.view` | Exporter le référentiel médicaments. |
| `POST` | `/api/v1/reference/medications/resolve` | `reference.medications.view` | Résoudre un médicament par code. |
| `GET` | `/api/v1/reference/medications/{uid}` | `reference.medications.view` | Détail d'un médicament. |
| `GET` | `/api/v1/reference/medical-acts/categories` | `reference.medical_acts.view` | Catégories d'actes médicaux. |
| `GET` | `/api/v1/reference/medical-acts/category/{category}` | `reference.medical_acts.view` | Actes par catégorie. |
| `GET` | `/api/v1/reference/medical-acts/search` | `reference.medical_acts.view` | Rechercher un acte médical. |
| `GET` | `/api/v1/reference/medical-acts/export` | `reference.medical_acts.view` | Exporter le référentiel actes. |
| `GET` | `/api/v1/reference/medical-acts/chapters` | `reference.medical_acts.view` | Chapitres d'actes médicaux. |
| `GET` | `/api/v1/reference/medical-acts/chapter/{chapterNo}` | `reference.medical_acts.view` | Actes par chapitre. |
| `GET` | `/api/v1/reference/medical-acts/{identifier}` | `reference.medical_acts.view` | Détail d'un acte médical. |
| `GET` | `/api/v1/reference/pathologies/chapters` | `reference.pathologies.view` | Chapitres de pathologies. |
| `GET` | `/api/v1/reference/pathologies/chapter/{chapterCode}` | `reference.pathologies.view` | Pathologies par chapitre. |
| `GET` | `/api/v1/reference/pathologies/search` | `reference.pathologies.view` | Rechercher une pathologie. |
| `GET` | `/api/v1/reference/pathologies/export` | `reference.pathologies.view` | Exporter le référentiel pathologies. |
| `GET` | `/api/v1/reference/pathologies/{identifier}` | `reference.pathologies.view` | Détail d'une pathologie. |
| `GET` | `/api/v1/reference/coverage-types` | `reference.coverage_types.view` | Référentiel global des codes de garantie (nomenclature des plans). |
| `GET` | `/api/v1/reference/coverage-types/{code}` | `reference.coverage_types.view` | Détail d'un code de garantie. |

## Pré-vérification d'éligibilité

`POST /api/v1/eligibility/check`

```json
{
  "identifier": "POL-SBX-000001",
  "coverage_code": "CONSULTATION_GP",
  "amount": 15000,
  "purpose": "PRECHECK"
}
```

La pré-vérification est informative, `read_only=true`, ne réserve aucun plafond et ne crée pas de claim. À la soumission du claim, Azurance refait toujours une vérification finale.

## Soumission de claim

Créez d'abord un brouillon avec `POST /api/v1/claims/draft`, puis soumettez-le avec `POST /api/v1/claims/{claimId}/submit` après les contrôles finaux.

```json
{
  "contract_uid": "11000000-0000-4000-8000-000000000001",
  "policyholder_id": "21000000-0000-4000-8000-000000000001",
  "service_execution_uid": "svc-exec-sandbox-001",
  "covered_person_type": "beneficiary",
  "covered_person_uid": "12000000-0000-4000-8000-000000000001",
  "consent_ref": "40000000-0000-4000-8000-000000000001",
  "coverage_type_code": "PHARMACY_DRUG",
  "service_date": "2026-05-26",
  "amount_claimed": 29200,
  "currency": "XOF",
  "provider_reference": "ERP-CLAIM-2026-0001",
  "precheck_eligibility_uuid": "01HY6Q5V9QZ4J7B0J6C2P8T9RK",
  "items": [
    {
      "description": "Dispensation Amoxicilline 500mg x10",
      "quantity": 10,
      "unit_price": 2920,
      "prescription_uid": "50000000-0000-4000-8000-000000000001",
      "prescription_line_uid": "50000000-0000-4000-8000-000000000002",
      "medication_product_uid": "60000000-0000-4000-8000-000000000001",
      "prescribed_quantity": 12,
      "dispensed_quantity": 10
    }
  ],
  "documents": [
    {
      "document_type": "PRESCRIPTION",
      "media_uid": "med-prescription-001"
    }
  ]
}
```

Si la vérification finale refuse, aucun claim n'est créé et l'API retourne `422`. Si le claim est accepté, Azurance réserve la part assureur sur les plafonds.

### Identifiants référentiels (`reference_status`)

Chaque ligne est contrôlée contre les référentiels cliniques : les uid inexistants (`medical_act_uid`, `medication_product_uid`, `prescription_line_uid`) rejettent le brouillon en `422`, tandis que les codes inconnus (`medical_act_code`, `medication_code`…) produisent des `warnings` `UNKNOWN_REFERENCE_CODE` — non bloquants, sauf pour les actes sous un plan à règles par acte (rejet, revérifié à la soumission). Chaque ligne expose `item_type` (dérivé de la prescription) et `reference_status` (`VERIFIED`/`UNKNOWN`/`NONE`).

### Couverture par ligne de facture

Chaque `items[]` peut porter son propre `coverage_type_code` (voir `GET /api/v1/reference/coverage-types` pour le référentiel). Le code au niveau de la requête sert de défaut pour les lignes sans code — pour une facture multi-couvertures, il peut être omis. Champs utiles par ligne : `coverage_type_code`, `prior_authorization_uid`, `prescription_uid` + `prescription_line_uid`, `internal_order`, `medical_act_uid`/`medical_act_code`/`category`/`chapter`, `medication_product_uid`, `medication_code`, `presentation_uid`, `prescribed_quantity`/`dispensed_quantity`, `sessions_performed`, `substitution_reason`, `batch_number`.

Règles :

- Une ligne non couverte par le plan de l'assuré rejette toute la facture (`422 ITEMS_NOT_ELIGIBLE`, lignes fautives nommées).

### Ordres internes (`internal_order`) — prestations effectuées

Les couvertures à ledger (`PHARMACY_DRUG`, `LAB_ANALYSIS`, `KINE_SESSION`, `OPTICS_GLASSES`, `DENTAL_BASIC`) exigent une ligne d'ordonnance par item : externe via `prescription_uid` + `prescription_line_uid`, ou **interne** via `internal_order` quand le prestataire se prescrit à lui-même (hôpital/clinique avec labo ou pharmacie intégré). La plateforme matérialise une vraie ordonnance (encounter + ordonnance + lignes, atomique et idempotente par référence externe) puis poursuit le flux normal.

```json
{ "coverage_type_code": "LAB_ANALYSIS", "description": "NFS", "quantity": 1, "unit_price": 8500,
  "internal_order": { "code": "NABM-1010", "prescriber_name": "Dr A. Sall",
    "prescriber_registration_number": "ORD-1234", "encounter_uid": "optionnel — séjour existant" } }
```

Règles : `code` + `prescriber_name` obligatoires ; `line_type`/`quantity` dérivés de la couverture ; items groupés par prescripteur dans une même ordonnance ; `encounter_uid` optionnel (sinon encounter créé) ; mutuellement exclusif avec les refs prescription ; **réservé aux types prescripteurs** `HOSPITAL`/`CLINIC`/`SPECIALIST` — `PHARMACY`/`LABORATORY` rejetés `403 INTERNAL_ORDER_NOT_ALLOWED` (le contrôle couvre aussi toute auto-prescription détectée, quel que soit le chemin de création). La ligne est flaguée `metadata.internal_order: true` (dérivé, visible par l'assureur).

- Avec `service_execution_uid`, chaque ligne facturée doit correspondre à un item de l'exécution (couverture + montant — `422 EXECUTION_MISMATCH`).
- Une ligne à PA obligatoire sans `prior_authorization_uid` passe `PENDING_AUTHORIZATION` : le claim est créé en `UNDER_REVIEW` et l'approbation assureur est bloquée jusqu'à couverture par une PA approuvée. Le prestataire peut créer la PA après coup via `POST /api/v1/prior-authorizations` avec `claim_item_uids` (les `uid` des lignes en attente).

Statuts claim : `SUBMITTED`, `UNDER_REVIEW`, `INFO_NEEDED`, `APPROVED`, `REJECTED`, `PAID`.

## Synchronisation et webhooks

Utiliser `GET /api/v1/billing/sync?updated_after=2026-05-15T00:00:00Z` pour la synchronisation incrémentale. Éviter le polling claim par claim.

Souscrire aux webhooks avec `POST /api/v1/webhooks`. Événements disponibles : `payable_invoice.issued`, `payable_invoice.partially_paid`, `payable_invoice.paid`, `payment.created`, `payment.processing`, `payment.succeeded`, `payment.failed`, `claim.submitted`, `claim.status_changed`, `claim.info_needed`, `claim.approved`, `claim.rejected`, `claim.paid`, `prior_authorization.requested`, `prior_authorization.decided`.

Vérifier la signature HMAC sur chaque livraison (voir `context.md`). Dédupliquer via l'en-tête `X-Azurance-Event-Id`.
