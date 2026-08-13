# Worker SebPay d'UpCoin

API Cloudflare Worker isolée qui garde les clés SebPay côté serveur, calcule les montants depuis le catalogue UpCoin, persiste l'idempotence et les statuts dans D1, et vérifie les webhooks HMAC-SHA256.

## Routes

- `GET /health`
- `GET /v1/sebpay/config`
- `POST /v1/payments/sebpay`
- `GET /v1/payments/sebpay/{orderId}`
- `POST /v1/webhooks/sebpay`

Le statut public est toujours `pending`, `approved` ou `rejected`. Les réponses de création et de statut incluent aussi le snapshot serveur `packId`, `coins`, `amount` et `currency`; le frontend doit utiliser ces valeurs autoritatives pour le reçu et le fulfillment. Tant qu'une transaction reste `pending`, la route de statut interroge SebPay au maximum une fois toutes les 15 secondes. Le Worker ne stocke pas le numéro de téléphone en clair : seulement son HMAC-SHA256, calculé avec la clé secrète SebPay pour résister à une simple attaque par dictionnaire sur une fuite D1. L'initiation est limitée par le binding Cloudflare `PAYMENT_RATE_LIMITER` à 60 appels par minute et par emplacement Cloudflare. La clé étant globale à la route (aucune identité fiable n'est fournie au Worker), ce plafond est partagé entre les utilisateurs d'un même emplacement.

## Installation locale

```powershell
cd worker
npm install
Copy-Item .dev.vars.example .dev.vars
```

Remplacer uniquement les valeurs de `.dev.vars` par les clés de test SebPay. Ce fichier est ignoré par Git. Les valeurs de `.dev.vars.example` sont volontairement factices.

Créer la base locale et lancer le Worker :

```powershell
npm run db:migrate:local
npm run dev
```

Le frontend local autorisé par défaut est `http://localhost:3000`. `ALLOWED_ORIGINS` est une liste séparée par des virgules d'origines exactes, sans chemin ni `/` final. Seuls HTTPS et localhost en HTTP sont acceptés.

## Préparation Cloudflare

Créer D1 sans déployer le Worker :

```powershell
npx wrangler d1 create upcoin-sebpay --config ./wrangler.jsonc
```

Copier le `database_id` retourné à la place du UUID nul dans `wrangler.jsonc`, puis renseigner l'origine HTTPS de la boutique dans `ALLOWED_ORIGINS`. Vérifier aussi :

- `SEBPAY_API_BASE_URL=https://newapi.sebpay.bj/api/v1`
- `SEBPAY_COUNTRY=CM`
- `SEBPAY_CURRENCY=XAF`
- `SEBPAY_OPERATOR_FIELD=code` (mettre `slug` seulement si le compte SebPay l'exige)

Le `namespace_id` du rate limiter doit rester un entier positif unique dans le compte Cloudflare. La valeur initiale est `1001`; changez-la si cet identifiant est déjà employé par un autre binding du compte.

Déclarer les clés en secrets chiffrés via les invites interactives, sans les écrire dans une commande :

```powershell
npx wrangler secret put SEBPAY_PUBLIC_KEY --config ./wrangler.jsonc
npx wrangler secret put SEBPAY_SECRET_KEY --config ./wrangler.jsonc
```

Appliquer ensuite la migration distante :

```powershell
npx wrangler d1 migrations apply upcoin-sebpay --config ./wrangler.jsonc --remote
```

## Webhook

Le Worker transmet à SebPay une URL de callback fixe dérivée de sa propre origine :

```text
https://<domaine-du-worker>/v1/webhooks/sebpay
```

SebPay doit envoyer le HMAC-SHA256 hexadécimal du corps JSON brut dans `X-SebPay-Signature`. La clé HMAC est `SEBPAY_SECRET_KEY`. Le handler vérifie la signature avant le JSON, rapproche référence, transaction, montant, devise et téléphone haché, puis n'autorise qu'une progression monotone du statut.

## Vérification sans déploiement

```powershell
npm run cf-typegen
npm run typecheck
npm test
npm run deploy:dry-run
```

Le dernier script compile le bundle localement et n'effectue aucun déploiement.

## Déploiement réel

Après validation des secrets, de D1 et de `ALLOWED_ORIGINS` :

```powershell
npx wrangler deploy --config ./wrangler.jsonc
```

Cette commande n'est pas exécutée automatiquement par ce dépôt.
