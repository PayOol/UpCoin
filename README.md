# UpCoin

UpCoin est une boutique web permettant de choisir un pack de pièces TikTok et
de payer en XAF avec la page hébergée **SoleasPay Checkout v3**.

## Développement local

Prérequis : Node.js `>=22.13.0`.

```powershell
npm install
npm run dev
```

La clé API Checkout v3 est définie dans
`app/components/payments/SoleasPayCheckoutV3.tsx` par la constante
`SOLEASPAY_API_KEY`. Elle est volontairement envoyée dans le formulaire HTML,
conformément au contrat Checkout v3 fourni par SoleasPay.

Le composant soumet les huit champs obligatoires avec un formulaire natif
`POST https://pay.soleaspay.com`. Aucun script SoleasPay, token OAuth ou backend
de session n'est utilisé. `customer.name` contient le nom d'utilisateur et le
numéro WhatsApp séparés par ` | `, et `customer.email` contient l'adresse e-mail
obligatoire saisie à l'étape 3. `feeBearer` vaut `CUSTOMER`. Le mot de passe
TikTok n'est jamais envoyé à SoleasPay. Les champs `line` et `area` restent omis.

Les URLs de retour canoniques sont `/payment/success` et `/payment/failed`
(`/payment/failure` reste disponible comme alias). Elles décodent les données de
retour une seule fois depuis la query string, puis conservent un récapitulatif
minimal de la transaction dans l’historique local. Chaque commande finalisée peut
ainsi être rouverte avec son identifiant, y compris après un rechargement, sans
stocker le mot de passe, l’adresse e-mail ou le numéro WhatsApp. Un retour sur
l'URL de succès ne suffit pas à livrer un service sensible : le statut doit encore
être confirmé auprès du prestataire de paiement.

## Validation

```powershell
npm run lint
npx tsc --noEmit --incremental false
npm run build
```

Documentation : [SoleasPay Checkout v3](https://documentation.mysoleas.com/api-docs/plugin).
