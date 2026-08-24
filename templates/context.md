# Azurance LLM Context

Azurance expose deux APIs publiques pour les intégrations ERP dans les domaines santé et assurance. Seuls les endpoints documentés dans ce kit et dans les contrats OpenAPI font partie du contrat public.

## Surfaces API publiques

| Surface | Production | Sandbox |
| --- | --- | --- |
| ERP Prestataires | `https://provider-api.elenami.com` | `https://provider-api-sandbox.elenami.com` |
| ERP Assurances | `https://insurer-api.elenami.com` | `https://insurer-api-sandbox.elenami.com` |

Toutes les APIs publiques sont versionnées sous `/api/v1`, hors endpoints de health documentés. Le contrat HTTP est identique entre sandbox et production. La clé API porte son environnement et ne peut pas être utilisée sur l'autre environnement.

## Authentification

`X-Api-Key` est le seul header public d'authentification. La clé résout l'organisation, l'environnement, le partenaire et les scopes autorisés.

Headers publics :

| Header | Requis | Description |
| --- | --- | --- |
| `X-Api-Key` | Oui | Clé API partenaire fournie pendant l'onboarding. |
| `X-Request-Id` | Non | Identifiant de corrélation fourni par l'ERP. Si absent, Azurance en génère un. |
| `Idempotency-Key` | Sur création de ressource métier | Clé stable pour éviter les doublons sur retry. |
| `Accept` | Recommandé | `application/json`. |
| `Content-Type` | Requis avec body JSON | `application/json`. |

```http
Accept: application/json
Content-Type: application/json
X-Api-Key: ${AZURANCE_API_KEY}
X-Request-Id: erp-request-001
```

Ne jamais utiliser `X-Service-Key` dans le code ERP partenaire. Ce header n'est pas destiné aux intégrations partenaires.

## Règles de sécurité pour le code généré

- Stocker les clés API dans des secrets serveur ou des variables d'environnement.
- Utiliser des clés et base URLs différentes pour sandbox et production.
- Ne pas exposer les clés API dans le frontend JavaScript, les apps mobiles, les logs, les crash reports ou les metadata de monitoring.
- Ne pas appeler d'autres URLs Azurance que les domaines API publics documentés.
- Ne pas envoyer `tenant_id`, `tenant_uid`, `provider_uuid`, `provider_uid`, `insurer_uid`, `insurer_uuid` ou équivalent dans les requêtes publiques : ces valeurs sont dérivées de `X-Api-Key`.
- Les champs non documentés dans les requêtes publiques sont rejetés en `400`.
- Tous les appels doivent être faits depuis un backend ERP ou un middleware serveur, jamais depuis un frontend ou une app mobile.

## Idempotence

Les appels qui créent une ressource métier doivent envoyer `Idempotency-Key` :

```http
Idempotency-Key: erp-operation-2026-0001
```

Endpoints concernés côté prestataire :

| Endpoint | Recommandation |
| --- | --- |
| `POST /api/v1/service-executions` | Une clé stable par prestation réellement effectuée. |
| `POST /api/v1/claims/draft` | Une clé stable par brouillon de claim ERP lorsque l'opération est rejouable. |
| `POST /api/v1/media/uploads` | Une clé stable par fichier si l'ERP supporte le retry d'upload. |

Si la même clé est rejouée avec le même corps de requête, Azurance retourne la réponse initiale et peut ajouter `X-Idempotent-Replay: true`. Si le corps change, l'API retourne `409 IDEMPOTENCY_CONFLICT`.

Utiliser aussi `provider_reference` comme référence métier unique par prestataire pour détecter les doublons indépendamment du transport HTTP.

## Identifiants publics

Utiliser des UUID et codes métier publics :

| Ressource | Identifiant public recommandé |
| --- | --- |
| Membre assuré | `uuid`, `policy_number` |
| Souscription | `uuid`, `subscription_number` |
| Plan | `plan_code` |
| Claim | `uuid` ou `claim_id` public |
| Bordereau payable | `uuid` |
| Paiement | `uuid` |
| Média | `media_uid` |

Les identifiants internes ne font pas partie du contrat public.

## Pagination et synchronisation

Les listes supportent `page` et `per_page` lorsque la pagination classique est suffisante. Les flux de synchronisation ERP, notamment billing, utilisent aussi `cursor` et `updated_after`.

```http
GET /api/v1/billing/sync?updated_after=2026-05-15T00:00:00Z&cursor=eyJpZCI6...
```

## Conventions de données

- Dates calendaires : `YYYY-MM-DD`.
- Timestamps : ISO 8601 UTC, par exemple `2026-05-15T09:30:00Z`.
- Montants : nombres décimaux dans la devise du contrat ou du bordereau.
- Devise par défaut des exemples : `XOF`.
- Endpoints JSON : `application/json`.
- Uploads médias : `multipart/form-data` avec un champ `file` et des champs métier comme `category`, `purpose` ou `metadata`.

## Gestion des erreurs

| HTTP | Sens | Action ERP |
| --- | --- | --- |
| `400` | Requête invalide ou contexte public forcé | Corriger le corps. Ne pas réessayer tel quel. |
| `401` | Clé API absente, invalide, expirée ou révoquée | Corriger ou rotater la clé. |
| `403` | Scope manquant | Demander l'ajout du scope pendant l'onboarding. |
| `404` | Ressource introuvable dans le périmètre de la clé | Vérifier l'UUID public ou la synchronisation ERP. |
| `422` | Validation métier refusée | Afficher le motif métier et arrêter le workflow. |
| `429` | Rate limit atteint | Réessayer avec backoff progressif. |
| `5xx` | Indisponibilité Azurance ou provider aval | Réessayer avec idempotence et backoff. |

Headers de rate limit possibles : `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After`.

Codes métier d'éligibilité courants : `MEMBER_NOT_FOUND`, `NO_ACTIVE_SUBSCRIPTION`, `SUBSCRIPTION_EXPIRED`, `SUBSCRIPTION_SUSPENDED`, `COVERAGE_NOT_INCLUDED`, `ANNUAL_LIMIT_REACHED`, `GLOBAL_LIMIT_EXCEEDED`, `COVERAGE_LIMIT_EXCEEDED`, `LIMIT_EXCEEDED`, `PROVIDER_NOT_IN_NETWORK`.

Codes métier ERP prestataire : `REQUIRED_DOCUMENT_MISSING`, `DUPLICATE_PROVIDER_REFERENCE`, `IDEMPOTENCY_CONFLICT`, `CONSENT_SCOPE_MISSING`, `CONSENT_EXPIRED`.

## Règles cliniques récentes

- `POST /api/v1/encounters` doit contenir au moins un élément de diagnostic : `icd10_codes` avec au moins un code, ou `chief_complaint` non vide. Les deux champs peuvent être envoyés ensemble.
- Les diagnostics structurés d'une consultation se gèrent avec `POST /api/v1/encounters/{encounterId}/diagnoses` (`clinical.encounters.manage`) et se lisent avec `GET /api/v1/encounters/{encounterId}/diagnoses` (`clinical.encounters.view`). Un diagnostic accepte `icd10_code`, `is_primary` et `diagnosis_type` (`definitive`, `provisional`, `differential`).
- Pour une revue côté assureur, `GET /api/v1/claims/{claimId}/clinical-context` (`insurer.claims.view`) retourne les consultations, diagnostics et prescriptions rattachés aux prescriptions des lignes du claim. Les éléments non retrouvés sont signalés dans `warnings`.
- Une décision de pré-autorisation côté assureur utilise `POST /api/v1/prior-authorizations/{uid}/decision` avec le scope `insurer.prior_authorizations.manage`.

Journaliser `status`, `message`, `error_code`, `X-Request-Id` et `event_id` webhook. Ne jamais journaliser les secrets.

## Webhooks

Les ERP prestataires peuvent souscrire aux événements billing pour éviter le polling massif. Azurance signe chaque livraison avec :

| Header | Description |
| --- | --- |
| `X-Azurance-Event-Id` | Identifiant idempotent de l'événement. |
| `X-Azurance-Delivery-Timestamp` | Timestamp utilisé dans la signature. |
| `X-Azurance-Signature` | Signature HMAC au format `sha256=<digest>`. |

Le message signé est `{timestamp}.{raw_json_payload}`, le digest est `hex(hmac_sha256(webhook_secret, message))`.

Anti-replay : refuser un timestamp trop ancien, stocker `X-Azurance-Event-Id` pour traiter chaque événement une seule fois, vérifier la signature sur le body brut avant parsing, retourner `2xx` rapidement après persistance locale, récupérer les détails lourds par API paginée ou via `/api/v1/billing/sync`.

## Documentation publique

La documentation complète et interactive est disponible sur https://dadigitall.mintlify.site. Les contrats OpenAPI dans `.azurance/llm/openapi/` sont la source de vérité pour les endpoints, schémas et exemples exacts.
