# UpCoin

Boutique web de pieces TikTok avec SoleasPay et SebPay.

## Developpement

```powershell
npm install
npm run dev
```

Le frontend local utilise directement le Worker SebPay public, comme le projet
PayOol. Aucune cle SebPay n'est incluse dans le frontend.

## SebPay

SebPay passe par le proxy minimal situe dans `worker/sebpay-proxy.js`. Le
navigateur affiche une etape 4 pour le pays, l'operateur, le numero Mobile Money
et, uniquement si l'operateur l'exige, le code USSD et l'OTP. Les pays, devises,
services PayIn et operateurs sont charges depuis le catalogue SebPay en temps
reel. Le navigateur envoie ensuite la collection au proxy, puis verifie son
statut toutes les 5 secondes avec `GET /collections/:id`.

Configurer les deux secrets une seule fois :

```powershell
Set-Location -LiteralPath "D:\Upcoin\Code source\UpCoin\worker"
npx wrangler secret put SEBPAY_PUBLIC_KEY --config .\wrangler.jsonc
npx wrangler secret put SEBPAY_SECRET_KEY --config .\wrangler.jsonc
```

Si SebPay limite ces cles a une adresse IP, cette restriction doit aussi
autoriser les requetes sortantes du Worker. Une reponse `IP_NOT_ALLOWED` bloque
les collectes meme lorsque les deux secrets sont correctement configures.

Depuis la racine du depot, deployer ensuite le proxy :

```powershell
npm run deploy:payments
```

Les details sont dans [`worker/README.md`](worker/README.md).

## Validation

```powershell
npm run lint
npx tsc --noEmit --incremental false
npm run build
npx wrangler deploy --config .\worker\wrangler.jsonc --dry-run
```
