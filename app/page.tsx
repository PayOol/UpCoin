"use client";

import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  Headphones,
  History,
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

export default function Home() {
  const [selectedPack, setSelectedPack] = useState<Pack>(packs[2]);
  const [customCoins, setCustomCoins] = useState(0);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
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
    document.body.style.overflow = checkoutOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [checkoutOpen]);

  const deliveredCoins = selectedPack.coins + (selectedPack.bonus ?? 0);
  const canContinue = username.trim().length >= 2 && phone.replace(/\D/g, "").length >= 8;

  const selectPack = (pack: Pack) => {
    setSelectedPack(pack);
    setCustomCoins(0);
  };

  const updateCustomCoins = (value: number) => {
    const safeValue = Math.max(0, Math.min(100000, Math.floor(value || 0)));
    setCustomCoins(safeValue);

    if (safeValue >= 70) {
      setSelectedPack({
        id: "custom",
        coins: safeValue,
        price: Math.ceil((safeValue * 11.25) / 50) * 50,
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
    }, 200);
  };

  const submitOrder = (event: FormEvent) => {
    event.preventDefault();
    if (!accepted) return;

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
    setStep(3);
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
                <div><strong>Montant personnalisé</strong><span>Minimum 70 pièces</span></div>
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
              <LockKeyhole size={20} />
              <div>
                <strong>Votre mot de passe reste sur TikTok.</strong>
                <p>UpCoin utilise votre identifiant public pour la commande. Si une connexion est nécessaire, elle doit s’ouvrir sur TikTok ou chez un partenaire officiellement autorisé.</p>
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

            {step < 3 && (
              <div className="checkout-progress" aria-label={`Étape ${step} sur 2`}>
                <span className={step >= 1 ? "active" : ""} />
                <span className={step >= 2 ? "active" : ""} />
              </div>
            )}

            {step === 1 && (
              <div className="checkout-step">
                <span className="modal-kicker">Étape 1 sur 2</span>
                <h2 id="checkout-title">Informations de recharge</h2>
                <div className="modal-pack-summary"><span>{formatNumber(deliveredCoins)} pièces</span><strong>{formatPrice(selectedPack.price)}</strong></div>

                <label className="field-label">
                  Identifiant public TikTok
                  <div className="field"><span>@</span><input autoFocus value={username} onChange={(event) => setUsername(event.target.value.replace(/^@/, ""))} placeholder="votrepseudo" autoComplete="off" /></div>
                </label>

                <label className="field-label">
                  Numéro Mobile Money
                  <div className="field"><span>+237</span><input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="6 00 00 00 00" inputMode="tel" autoComplete="tel" /></div>
                </label>

                <div className="credential-warning"><LockKeyhole size={17} /><span><strong>Ne saisissez pas votre mot de passe ici.</strong> Toute authentification doit se faire directement sur TikTok.</span></div>
                <button type="button" className="modal-primary" disabled={!canContinue} onClick={() => setStep(2)}>Continuer <ArrowRight size={18} /></button>
                <span className="demo-note">Mode démonstration — aucune donnée n’est transmise.</span>
              </div>
            )}

            {step === 2 && (
              <form className="checkout-step" onSubmit={submitOrder}>
                <button type="button" className="back-button" onClick={() => setStep(1)}><ArrowLeft size={15} /> Retour</button>
                <span className="modal-kicker">Étape 2 sur 2</span>
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
                  Je confirme que l’identifiant et le numéro sont corrects.
                </label>

                <button className="modal-primary" type="submit" disabled={!accepted}>Simuler le paiement <ArrowRight size={18} /></button>
                <span className="demo-note">Aucun prélèvement ne sera effectué.</span>
              </form>
            )}

            {step === 3 && (
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
