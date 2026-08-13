"use client";

import Image from "next/image";
import {
  ArrowDown,
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronRight,
  Clock3,
  Headphones,
  LockKeyhole,
  Menu,
  Minus,
  Plus,
  ReceiptText,
  ShieldCheck,
  Smartphone,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Pack = {
  id: string;
  coins: number;
  bonus?: number;
  price: number;
  label?: string;
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
  { id: "spark", coins: 100, price: 1150 },
  { id: "pulse", coins: 350, price: 3950 },
  { id: "boost", coins: 700, bonus: 70, price: 7750, label: "Le plus choisi" },
  { id: "rise", coins: 1400, bonus: 140, price: 15400 },
  { id: "creator", coins: 3500, bonus: 350, price: 38250, label: "Créateur" },
  { id: "stage", coins: 7000, bonus: 700, price: 76500 },
];

const payments = ["MTN MoMo", "Orange Money", "Wave"];

const formatNumber = (value: number) =>
  new Intl.NumberFormat("fr-FR").format(value);

const formatPrice = (value: number) => `${formatNumber(value)} FCFA`;

export default function Home() {
  const [selectedPack, setSelectedPack] = useState<Pack>(packs[2]);
  const [customCoins, setCustomCoins] = useState(0);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [payment, setPayment] = useState(payments[0]);
  const [accepted, setAccepted] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const stored = window.localStorage.getItem("upcoin-demo-orders");
    if (stored) {
      try {
        setOrders(JSON.parse(stored));
      } catch {
        window.localStorage.removeItem("upcoin-demo-orders");
      }
    }
  }, []);

  useEffect(() => {
    document.body.style.overflow = checkoutOpen || menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [checkoutOpen, menuOpen]);

  const orderCoins = selectedPack.coins + (selectedPack.bonus ?? 0);
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
        label: "Sur mesure",
      });
    }
  };

  const openCheckout = () => {
    setStep(1);
    setCheckoutOpen(true);
  };

  const submitOrder = (event: FormEvent) => {
    event.preventDefault();
    if (!accepted) return;

    const order: Order = {
      id: `UP-${Date.now().toString().slice(-6)}`,
      username: username.trim().replace(/^@/, ""),
      coins: orderCoins,
      price: selectedPack.price,
      payment,
      createdAt: new Date().toISOString(),
    };

    const nextOrders = [order, ...orders].slice(0, 3);
    setOrders(nextOrders);
    window.localStorage.setItem("upcoin-demo-orders", JSON.stringify(nextOrders));
    setStep(3);
  };

  const closeCheckout = () => {
    setCheckoutOpen(false);
    setTimeout(() => {
      setStep(1);
      setAccepted(false);
    }, 250);
  };

  const recentOrder = orders[0];

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="UpCoin — Accueil">
          <Image src="/upcoin-logo.webp" alt="UpCoin" width={150} height={127} priority />
        </a>

        <nav className="desktop-nav" aria-label="Navigation principale">
          <a href="#packs">Acheter</a>
          <a href="#how">Comment ça marche</a>
          <a href="#faq">FAQ</a>
        </nav>

        <div className="header-actions">
          <span className="live-pill"><span />Service disponible</span>
          <a className="support-link" href="#support"><Headphones size={17} /> Assistance</a>
          <button className="menu-button" onClick={() => setMenuOpen(true)} aria-label="Ouvrir le menu">
            <Menu size={22} />
          </button>
        </div>
      </header>

      {menuOpen && (
        <div className="mobile-menu" role="dialog" aria-modal="true" aria-label="Menu">
          <button onClick={() => setMenuOpen(false)} aria-label="Fermer le menu"><X /></button>
          <a href="#packs" onClick={() => setMenuOpen(false)}>Acheter <ChevronRight /></a>
          <a href="#how" onClick={() => setMenuOpen(false)}>Comment ça marche <ChevronRight /></a>
          <a href="#faq" onClick={() => setMenuOpen(false)}>FAQ <ChevronRight /></a>
          <a href="#support" onClick={() => setMenuOpen(false)}>Assistance <ChevronRight /></a>
        </div>
      )}

      <section className="hero" id="top">
        <div className="hero-orbit hero-orbit-one" />
        <div className="hero-orbit hero-orbit-two" />

        <div className="hero-copy">
          <div className="eyebrow"><Sparkles size={15} /> Recharge TikTok, pensée pour l&apos;Afrique</div>
          <h1>Ton prochain live<br />mérite plus de <span>puissance.</span></h1>
          <p>Choisis tes coins, paie avec ton mobile et reprends ton élan. Simple, lisible, sans détour.</p>
          <div className="hero-actions">
            <a className="primary-button" href="#packs">Choisir mon pack <ArrowDown size={18} /></a>
            <a className="text-button" href="#how">Voir le parcours <ArrowRight size={18} /></a>
          </div>
          <div className="trust-row" aria-label="Avantages UpCoin">
            <span><ShieldCheck size={17} /> Paiement protégé</span>
            <span><Clock3 size={17} /> Traitement rapide</span>
            <span><Headphones size={17} /> Support humain</span>
          </div>
        </div>

        <div className="hero-visual" aria-label="Aperçu d'une recharge UpCoin">
          <div className="visual-glow" />
          <div className="coin-stage">
            <span className="stage-label">UPCOIN DROP</span>
            <div className="brand-core">
              <Image src="/upcoin-mark.webp" alt="Symbole UpCoin" width={280} height={262} priority />
            </div>
            <div className="stage-readout">
              <div><span>Pack actif</span><strong>770 coins</strong></div>
              <span className="readout-status"><Zap size={13} fill="currentColor" /> prêt</span>
            </div>
          </div>
          <div className="float-card delivery-card"><Clock3 size={18} /><div><span>Temps indicatif</span><strong>5–15 min</strong></div></div>
          <div className="float-card secure-card"><LockKeyhole size={18} /><div><span>Mot de passe</span><strong>Jamais demandé</strong></div></div>
        </div>
      </section>

      <section className="signal-bar" aria-label="Informations de service">
        <p><span className="signal-dot" /> Recharges traitées 7j/7</p>
        <div className="signal-separator" />
        <p><strong>Mobile Money</strong> au cœur du parcours</p>
        <div className="signal-separator" />
        <p><strong>0 mot de passe</strong> TikTok demandé</p>
      </section>

      <section className="packs-section" id="packs">
        <div className="section-heading">
          <div>
            <span className="section-kicker">Recharge instantanée</span>
            <h2>Trouve ton niveau.</h2>
          </div>
          <p>Des petits boosts aux grands shows, sélectionne le pack qui suit ton rythme.</p>
        </div>

        <div className="purchase-layout">
          <div>
            <div className="pack-grid" role="radiogroup" aria-label="Packs de coins TikTok">
              {packs.map((pack) => {
                const active = selectedPack.id === pack.id;
                const total = pack.coins + (pack.bonus ?? 0);
                return (
                  <button
                    className={`pack-card${active ? " active" : ""}`}
                    key={pack.id}
                    onClick={() => selectPack(pack)}
                    role="radio"
                    aria-checked={active}
                  >
                    <div className="pack-topline">
                      <span className="pack-symbol"><span className="mini-coin" /> TikTok Coins</span>
                      {pack.label && <span className="pack-label">{pack.label}</span>}
                    </div>
                    <div className="pack-amount"><strong>{formatNumber(total)}</strong><span>coins</span></div>
                    {pack.bonus ? <p className="bonus-line">{formatNumber(pack.coins)} + {formatNumber(pack.bonus)} offerts</p> : <p className="bonus-line muted">Pack essentiel</p>}
                    <div className="pack-price"><strong>{formatPrice(pack.price)}</strong><span className="select-mark">{active ? <Check size={16} /> : <Plus size={16} />}</span></div>
                  </button>
                );
              })}
            </div>

            <div className={`custom-pack${selectedPack.id === "custom" ? " active" : ""}`}>
              <div className="custom-copy">
                <span className="custom-icon"><Sparkles size={20} /></span>
                <div><strong>Ton montant, ton rythme</strong><span>À partir de 70 coins</span></div>
              </div>
              <div className="custom-control">
                <button onClick={() => updateCustomCoins(customCoins - 70)} aria-label="Retirer 70 coins"><Minus size={17} /></button>
                <label>
                  <span className="sr-only">Nombre personnalisé de coins</span>
                  <input
                    type="number"
                    min="70"
                    step="10"
                    value={customCoins || ""}
                    onChange={(event) => updateCustomCoins(Number(event.target.value))}
                    placeholder="Ex. 2 000"
                  />
                  <em>coins</em>
                </label>
                <button onClick={() => updateCustomCoins(customCoins + 70)} aria-label="Ajouter 70 coins"><Plus size={17} /></button>
              </div>
              <div className="custom-total">
                <span>Estimation</span>
                <strong>{customCoins >= 70 ? formatPrice(selectedPack.price) : "—"}</strong>
              </div>
            </div>
          </div>

          <aside className="order-card" aria-label="Récapitulatif de recharge">
            <div className="order-card-top">
              <span>Ta recharge</span>
              <span className="secure-badge"><LockKeyhole size={13} /> sécurisée</span>
            </div>
            <div className="order-coin-visual">
              <div className="order-coin"><Image src="/upcoin-mark.webp" alt="" width={92} height={86} /></div>
              <div><strong>{formatNumber(orderCoins)}</strong><span>TikTok coins</span></div>
            </div>
            <div className="order-lines">
              <div><span>Pack</span><strong>{formatNumber(selectedPack.coins)} coins</strong></div>
              {(selectedPack.bonus ?? 0) > 0 && <div className="bonus"><span>Bonus UpCoin</span><strong>+ {formatNumber(selectedPack.bonus ?? 0)}</strong></div>}
              <div><span>Frais de service</span><strong>Inclus</strong></div>
            </div>
            <div className="order-total"><span>Total</span><strong>{formatPrice(selectedPack.price)}</strong></div>
            <button className="checkout-button" onClick={openCheckout}>Continuer <ArrowRight size={19} /></button>
            <p className="microcopy"><ShieldCheck size={15} /> Aucun mot de passe TikTok ne te sera demandé.</p>
          </aside>
        </div>

        {recentOrder && (
          <div className="recent-order">
            <div><ReceiptText size={19} /><span>Dernière simulation</span></div>
            <strong>{recentOrder.id}</strong>
            <span>@{recentOrder.username}</span>
            <span>{formatNumber(recentOrder.coins)} coins</span>
            <span className="status-pill">Démo validée</span>
          </div>
        )}
      </section>

      <section className="how-section" id="how">
        <div className="how-intro">
          <span className="section-kicker">Du choix au boost</span>
          <h2>Trois gestes.<br /><span>Et ça repart.</span></h2>
          <p>Le parcours UpCoin garde uniquement l&apos;essentiel. Ton compte reste le tien, à chaque étape.</p>
        </div>
        <div className="steps-list">
          <article>
            <span className="step-number">01</span>
            <div className="step-icon"><Sparkles /></div>
            <h3>Choisis ton pack</h3>
            <p>Prends une formule ou compose ton propre montant.</p>
          </article>
          <article>
            <span className="step-number">02</span>
            <div className="step-icon"><Smartphone /></div>
            <h3>Renseigne ton ID</h3>
            <p>Ton nom d&apos;utilisateur suffit. Jamais ton mot de passe.</p>
          </article>
          <article>
            <span className="step-number">03</span>
            <div className="step-icon"><Zap /></div>
            <h3>Confirme sur mobile</h3>
            <p>Valide le paiement et suis l&apos;avancement de ta recharge.</p>
          </article>
        </div>
      </section>

      <section className="safety-section">
        <div className="safety-card">
          <span className="safety-label"><BadgeCheck size={16} /> Le réflexe UpCoin</span>
          <h2>Ton mot de passe<br />reste <span>hors-jeu.</span></h2>
          <p>Une recharge légitime ne devrait pas te demander les clés de ton compte. UpCoin est conçu autour de ton identifiant public et d&apos;un paiement mobile séparé.</p>
          <ul>
            <li><Check size={16} /> Aucun accès à ton compte</li>
            <li><Check size={16} /> Montant annoncé avant validation</li>
            <li><Check size={16} /> Historique local et lisible</li>
          </ul>
        </div>
        <div className="safety-art" aria-hidden="true">
          <div className="shield-ring ring-one" />
          <div className="shield-ring ring-two" />
          <div className="shield-core"><ShieldCheck /></div>
          <span className="safety-note note-one">ID public uniquement</span>
          <span className="safety-note note-two">Paiement séparé</span>
        </div>
      </section>

      <section className="faq-section" id="faq">
        <div className="faq-heading">
          <span className="section-kicker">Questions fréquentes</span>
          <h2>Avant de lancer<br />ta recharge.</h2>
        </div>
        <div className="faq-list">
          <details open>
            <summary>De quoi ai-je besoin pour commander ? <Plus /></summary>
            <p>De ton nom d&apos;utilisateur TikTok public, d&apos;un numéro Mobile Money et du pack souhaité. UpCoin ne demande jamais ton mot de passe.</p>
          </details>
          <details>
            <summary>Combien de temps prend une recharge ? <Plus /></summary>
            <p>Le délai indicatif affiché est de 5 à 15 minutes après confirmation du paiement. Il peut varier selon le réseau et la disponibilité du service.</p>
          </details>
          <details>
            <summary>Quels paiements sont prévus ? <Plus /></summary>
            <p>Le prototype prévoit MTN MoMo, Orange Money et Wave. Leur connexion réelle nécessite les accès marchands de chaque opérateur.</p>
          </details>
          <details>
            <summary>Cette version prélève-t-elle réellement ? <Plus /></summary>
            <p>Non. Cette première version simule le parcours de commande afin de valider l&apos;expérience avant de brancher un prestataire de paiement et un service de livraison.</p>
          </details>
        </div>
      </section>

      <section className="support-section" id="support">
        <div>
          <span className="section-kicker">Un doute ?</span>
          <h2>On ne te laisse pas<br />devant l&apos;écran.</h2>
        </div>
        <div className="support-copy">
          <p>L&apos;espace d&apos;assistance est prêt à être relié à ton canal WhatsApp professionnel.</p>
          <button onClick={openCheckout}>Tester le parcours <ArrowRight /></button>
        </div>
      </section>

      <footer>
        <a className="footer-brand" href="#top"><Image src="/upcoin-logo.webp" alt="UpCoin" width={128} height={108} /></a>
        <p>La recharge qui suit ton rythme.</p>
        <div className="footer-links"><a href="#packs">Packs</a><a href="#faq">FAQ</a><a href="#support">Assistance</a></div>
        <span>© 2026 UpCoin. Prototype de démonstration.</span>
      </footer>

      <button className="mobile-checkout" onClick={openCheckout}>
        <span><small>{formatNumber(orderCoins)} coins</small><strong>{formatPrice(selectedPack.price)}</strong></span>
        Continuer <ArrowRight size={18} />
      </button>

      {checkoutOpen && (
        <div className="checkout-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeCheckout()}>
          <div className="checkout-panel" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
            <button className="close-checkout" onClick={closeCheckout} aria-label="Fermer"><X /></button>
            {step < 3 && (
              <div className="checkout-progress" aria-label={`Étape ${step} sur 2`}>
                <span className={step >= 1 ? "active" : ""} />
                <span className={step >= 2 ? "active" : ""} />
              </div>
            )}

            {step === 1 && (
              <div className="checkout-step">
                <span className="modal-kicker">Étape 1 sur 2</span>
                <h2 id="checkout-title">Où envoyer<br />tes coins ?</h2>
                <p>Vérifie bien ton identifiant public. UpCoin ne te demandera jamais ton mot de passe.</p>
                <label className="field-label">
                  Nom d&apos;utilisateur TikTok
                  <div className="field"><span>@</span><input autoFocus value={username} onChange={(event) => setUsername(event.target.value.replace(/^@/, ""))} placeholder="tonpseudo" autoComplete="off" /></div>
                </label>
                <label className="field-label">
                  Numéro Mobile Money
                  <div className="field"><span>+237</span><input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="6 00 00 00 00" inputMode="tel" autoComplete="tel" /></div>
                </label>
                <button className="modal-primary" disabled={!canContinue} onClick={() => setStep(2)}>Continuer <ArrowRight /></button>
                <span className="demo-note">Mode démo — aucune donnée n&apos;est transmise.</span>
              </div>
            )}

            {step === 2 && (
              <form className="checkout-step" onSubmit={submitOrder}>
                <button type="button" className="back-button" onClick={() => setStep(1)}>← Retour</button>
                <span className="modal-kicker">Étape 2 sur 2</span>
                <h2 id="checkout-title">Dernier check.</h2>
                <div className="checkout-summary">
                  <div><span>Compte</span><strong>@{username.replace(/^@/, "")}</strong></div>
                  <div><span>Recharge</span><strong>{formatNumber(orderCoins)} coins</strong></div>
                  <div><span>Total</span><strong>{formatPrice(selectedPack.price)}</strong></div>
                </div>
                <fieldset className="payment-options">
                  <legend>Moyen de paiement</legend>
                  {payments.map((method) => (
                    <label key={method} className={payment === method ? "selected" : ""}>
                      <input type="radio" name="payment" value={method} checked={payment === method} onChange={() => setPayment(method)} />
                      <span className="payment-logo">{method === "MTN MoMo" ? "MoMo" : method === "Orange Money" ? "OM" : "W"}</span>
                      <strong>{method}</strong>
                      <span className="radio-dot" />
                    </label>
                  ))}
                </fieldset>
                <label className="terms-check">
                  <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />
                  <span><Check size={13} /></span>
                  Je confirme que l&apos;identifiant et le numéro sont corrects.
                </label>
                <button className="modal-primary" type="submit" disabled={!accepted}>Simuler la commande <ArrowRight /></button>
                <span className="demo-note">Aucun prélèvement ne sera effectué.</span>
              </form>
            )}

            {step === 3 && (
              <div className="checkout-success">
                <div className="success-icon"><Check /></div>
                <span className="modal-kicker">Simulation réussie</span>
                <h2 id="checkout-title">Le parcours<br />est validé.</h2>
                <p>La commande de <strong>{formatNumber(orderCoins)} coins</strong> pour <strong>@{username.replace(/^@/, "")}</strong> a été ajoutée à l&apos;historique local.</p>
                <div className="success-reference"><span>Référence</span><strong>{orders[0]?.id}</strong></div>
                <button className="modal-primary" onClick={closeCheckout}>Revenir à UpCoin <ArrowRight /></button>
                <span className="demo-note">Branche les services de paiement et de livraison avant la mise en production.</span>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
