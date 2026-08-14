# Proxy SebPay

Ce Worker reproduit le modele PayOol : il transmet les appels du navigateur a
SebPay et ajoute les deux cles conservees dans les secrets Cloudflare.

## Configuration

Depuis le dossier `worker` :

```powershell
npx wrangler secret put SEBPAY_PUBLIC_KEY --config .\wrangler.jsonc
npx wrangler secret put SEBPAY_SECRET_KEY --config .\wrangler.jsonc
```

Les restrictions IP configurees sur les cles SebPay doivent autoriser les
requetes du Worker ; sinon SebPay repond `IP_NOT_ALLOWED` aux collectes.

## Deploiement

```powershell
npx wrangler deploy --config .\wrangler.jsonc
```

## Endpoints utilises

```text
GET  /api/sebpay/p/countries
POST /api/sebpay/collections
GET  /api/sebpay/collections/:id
```

Le catalogue pays contient les devises et operateurs actifs. Le frontend filtre
les operateurs autorisant les collectes (`payin_enabled`) et utilise
`otp_required`/`ussd_code` pour afficher l'OTP seulement lorsque necessaire.
