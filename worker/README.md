# Proxy SebPay

Ce Worker reproduit le modele PayOol : il transmet les appels du navigateur a
SebPay et ajoute les deux cles conservees dans les secrets Cloudflare.

## Configuration

Depuis le dossier `worker` :

```powershell
npx wrangler secret put SEBPAY_PUBLIC_KEY --config .\wrangler.jsonc
npx wrangler secret put SEBPAY_SECRET_KEY --config .\wrangler.jsonc
```

## Deploiement

```powershell
npx wrangler deploy --config .\wrangler.jsonc
```

## Endpoints utilises

```text
POST /api/sebpay/collections
GET  /api/sebpay/collections/:id
```
