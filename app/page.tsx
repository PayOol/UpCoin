"use client";

import Image from "next/image";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Coins,
  Eye,
  EyeOff,
  Globe,
  Headphones,
  History,
  Info,
  LockKeyhole,
  Menu,
  Moon,
  ReceiptText,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Sun,
  X,
  XCircle,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { SebPayCheckout } from "@/app/components/payments/SebPayCheckout";
import { SoleasPayCheckoutV3 } from "@/app/components/payments/SoleasPayCheckoutV3";
import { getAssetPath } from "@/app/lib/asset-path";
import { packs, type Pack } from "@/app/lib/catalog";
import type { PaymentProvider } from "@/app/lib/payments/payment-contract";
import {
  getPaymentHistoryServerSnapshot,
  getPaymentHistorySnapshot,
  parsePaymentHistory,
  paymentHistoryHref,
  subscribeToPaymentHistory,
} from "@/app/lib/payments/payment-history";
import {
  ALL_COUNTRIES,
  POPULAR_COUNTRIES,
  detectUserCountry,
  dialCodes,
} from "@/app/lib/countries";

type Language = "fr" | "en";
type Theme = "light" | "dark";

const PREFERENCE_CHANGE_EVENT = "upcoin-preference-change";

function subscribeToPreferences(onStoreChange: () => void): () => void {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(PREFERENCE_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(PREFERENCE_CHANGE_EVENT, onStoreChange);
  };
}

function getLanguagePreference(): Language {
  const savedLanguage = window.localStorage.getItem("upcoin-language");
  if (savedLanguage === "fr" || savedLanguage === "en") return savedLanguage;
  return window.navigator.language.toLowerCase().startsWith("fr") ? "fr" : "en";
}

function getThemePreference(): Theme {
  const savedTheme = window.localStorage.getItem("upcoin-theme");
  if (savedTheme === "light" || savedTheme === "dark") return savedTheme;
  return "light";
}

function savePreference(key: "upcoin-language" | "upcoin-theme", value: string): void {
  window.localStorage.setItem(key, value);
  window.dispatchEvent(new Event(PREFERENCE_CHANGE_EVENT));
}



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
    orderHistory: "Historique des commandes",
    payment: "Paiement",
    date: "Date",
    onlinePayment: "Paiement en ligne",
    successful: "Réussie",
    failed: "Échouée",
    pending: "En attente",
    openOrder: "Ouvrir la transaction",
    noOrders: "Aucune commande pour le moment",
    nextOrder: "Vos transactions apparaîtront ici après votre première tentative de paiement.",
    progress: "Étape {current} sur {total}",
    rechargeInfo: "Informations de recharge",
    tiktokUsername: "Identifiant TikTok",
    password: "Mot de passe",
    country: "Pays",
    optional: "optionnel",
    required: "obligatoire",
    usernamePlaceholder: "pseudo ou email",
    usernameRequiredWarning: "Veuillez renseigner votre identifiant TikTok.",
    passwordRequiredWarning: "Veuillez saisir votre mot de passe (au moins 4 caractères).",
    whatsapp: "Numéro WhatsApp",
    whatsappHint: "Pour vous contacter en cas de besoin",
    whatsappPlaceholder: "6 00 00 00 00",
    whatsappRequiredWarning: "Veuillez renseigner un numéro WhatsApp valide.",
    emailAddress: "Adresse e-mail",
    emailPlaceholder: "client@exemple.com",
    emailRequiredWarning: "Veuillez renseigner une adresse e-mail valide avant de continuer.",
    continue: "Continuer",
    back: "Retour",
    confirmOrder: "Confirmer la commande",
    orderAccount: "Compte",
    recharge: "Recharge",
    total: "Total",
    paymentMethod: "Paiement sécurisé",
    selectedProvider: "Prestataire sélectionné",
    chooseProvider: "Choisissez votre prestataire de paiement",
    recommended: "Recommandé",
    popularCountries: "Pays populaires",
    allCountries: "Tous les pays (A-Z)",
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
    orderHistory: "Order history",
    payment: "Payment",
    date: "Date",
    onlinePayment: "Online payment",
    successful: "Successful",
    failed: "Failed",
    pending: "Pending",
    openOrder: "Open transaction",
    noOrders: "No orders yet",
    nextOrder: "Your transactions will appear here after your first payment attempt.",
    progress: "Step {current} of {total}",
    rechargeInfo: "Recharge information",
    tiktokUsername: "TikTok username",
    password: "Password",
    country: "Country",
    optional: "optional",
    required: "required",
    usernamePlaceholder: "your TikTok username",
    usernameRequiredWarning: "Please enter your TikTok username.",
    passwordRequiredWarning: "Please enter your password (at least 4 characters).",
    whatsapp: "WhatsApp number",
    whatsappHint: "So we can contact you about the order",
    whatsappPlaceholder: "6 00 00 00 00",
    whatsappRequiredWarning: "Please enter a valid WhatsApp number.",
    emailAddress: "Email address",
    emailPlaceholder: "customer@example.com",
    emailRequiredWarning: "Please enter a valid email address before continuing.",
    continue: "Continue",
    back: "Back",
    confirmOrder: "Confirm order",
    orderAccount: "Account",
    recharge: "Recharge",
    total: "Total",
    paymentMethod: "Secure payment",
    selectedProvider: "Selected provider",
    chooseProvider: "Choose your payment provider",
    recommended: "Recommended",
    popularCountries: "Popular countries",
    allCountries: "All countries (A-Z)",
  },
} as const;

const localeFor = (language: Language) => language === "fr" ? "fr-FR" : "en-US";

const formatProgress = (template: string, current: number, total: number) =>
  template
    .replace("{current}", String(current))
    .replace("{total}", String(total));

const formatNumber = (value: number, language: Language) =>
  new Intl.NumberFormat(localeFor(language), { maximumFractionDigits: 2 }).format(value);

const formatPrice = (value: number, language: Language) =>
  formatNumber(value, language) + " FCFA";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const createPaymentOrderId = () =>
  `UPC-${crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;

export default function Home() {
  const language = useSyncExternalStore(
    subscribeToPreferences,
    getLanguagePreference,
    (): Language => "fr",
  );
  const theme = useSyncExternalStore(
    subscribeToPreferences,
    getThemePreference,
    (): Theme => "light",
  );
  const [selectedPack, setSelectedPack] = useState<Pack>(packs[2]);
  const [customCoins, setCustomCoins] = useState(0);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [instructionsAccepted, setInstructionsAccepted] = useState(false);
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState(false);
  const usernameInputRef = useRef<HTMLInputElement>(null);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [whatsapp, setWhatsapp] = useState("");
  const [whatsappError, setWhatsappError] = useState(false);
  const whatsappInputRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const [countryCode, setCountryCode] = useState("CM");
  const [dialCode, setDialCode] = useState("+237");
  const [paymentOrderId, setPaymentOrderId] = useState("");
  const [paymentProvider, setPaymentProvider] = useState<PaymentProvider>("soleaspay");
  const [sideNavOpen, setSideNavOpen] = useState(false);
  const paymentHistorySnapshot = useSyncExternalStore(
    subscribeToPaymentHistory,
    getPaymentHistorySnapshot,
    getPaymentHistoryServerSnapshot,
  );
  const orders = useMemo(
    () => parsePaymentHistory(paymentHistorySnapshot),
    [paymentHistorySnapshot],
  );
  const t = copy[language];
  const purchasedCoins = orders.reduce(
    (total, order) => order.status === "success" ? total + order.coins : total,
    0,
  );

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  useEffect(() => {
    let isMounted = true;
    void detectUserCountry().then((detected) => {
      if (!isMounted || !detected) return;
      setCountryCode(detected.countryCode);
      setDialCode(detected.dialCode);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = checkoutOpen || sideNavOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [checkoutOpen, sideNavOpen]);

  useEffect(() => {
    if (step === 2) {
      const timer = setTimeout(() => {
        usernameInputRef.current?.focus();
      }, 60);
      return () => clearTimeout(timer);
    }
    if (step === 3) {
      const timer = setTimeout(() => {
        emailInputRef.current?.focus();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const deliveredCoins = selectedPack.coins + (selectedPack.bonus ?? 0);
  const canContinue =
    username.trim().replace(/^@/, "").length >= 2 &&
    password.length >= 4 &&
    whatsapp.replace(/\D/g, "").length >= 6;

  const selectPack = (pack: Pack) => {
    setSelectedPack(pack);
    setCustomCoins(0);
    setStep(1);
    setInstructionsAccepted(false);
    setPaymentOrderId("");
    setEmail("");
    setEmailError(false);
    setUsernameError(false);
    setPasswordError(false);
    setWhatsappError(false);
    setCheckoutOpen(true);
  };

  const updateCustomCoins = (value: number | string) => {
    const rawDigits = typeof value === "string" ? value.replace(/\D/g, "") : String(value).replace(/\D/g, "");
    const safeValue = rawDigits ? Math.min(1000000, parseInt(rawDigits, 10)) : 0;
    setCustomCoins(safeValue);

    if (safeValue >= 70) {
      setSelectedPack({
        id: "custom",
        coins: safeValue,
        price: Math.round(safeValue * 11.24),
      });
    } else if (selectedPack.id === "custom") {
      setSelectedPack({
        id: "custom",
        coins: safeValue,
        price: Math.round(safeValue * 11.24),
      });
    }
  };

  const openCheckout = () => {
    setStep(1);
    setInstructionsAccepted(false);
    setPaymentOrderId("");
    setEmail("");
    setEmailError(false);
    setUsernameError(false);
    setPasswordError(false);
    setWhatsappError(false);
    setCheckoutOpen(true);
  };

  const closeCheckout = () => {
    setCheckoutOpen(false);
    setStep(1);
    setPaymentOrderId("");
    setEmail("");
    setEmailError(false);
    setUsernameError(false);
    setPasswordError(false);
    setWhatsappError(false);
    setPassword("");
    setShowPassword(false);
  };

  const openPaymentStep = () => {
    setPaymentOrderId(createPaymentOrderId());
    setEmailError(false);
    setStep(3);
    setTimeout(() => {
      emailInputRef.current?.focus();
    }, 60);
  };

  const handleStep2Continue = () => {
    const isUsernameValid = username.trim().replace(/^@/, "").length >= 2;
    const isPasswordValid = password.length >= 4;
    const isWhatsappValid = whatsapp.replace(/\D/g, "").length >= 6;

    if (!isUsernameValid || !isPasswordValid || !isWhatsappValid) {
      if (!isUsernameValid) setUsernameError(true);
      if (!isPasswordValid) setPasswordError(true);
      if (!isWhatsappValid) setWhatsappError(true);

      if (!isUsernameValid) {
        usernameInputRef.current?.focus();
      } else if (!isPasswordValid) {
        passwordInputRef.current?.focus();
      } else if (!isWhatsappValid) {
        whatsappInputRef.current?.focus();
      }
      return;
    }

    openPaymentStep();
  };

  const checkoutTotalSteps = paymentProvider === "sebpay" ? 4 : 3;
  const progressLabel = formatProgress(t.progress, step, checkoutTotalSteps);

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
            <Image src={getAssetPath("/logo.png")} alt="UpCoin" width={34} height={34} priority />
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
            onClick={() => savePreference("upcoin-language", language === "fr" ? "en" : "fr")}
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
            onClick={() => savePreference("upcoin-theme", theme === "light" ? "dark" : "light")}
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
        <div className="sidenav-overlay">
          <button
            type="button"
            className="sidenav-backdrop"
            onClick={() => setSideNavOpen(false)}
            aria-label={t.close}
          />
          <nav className="sidenav-drawer" aria-label={t.mainMenu}>
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
                <div className="coin-emblem"><Coins size={19} /></div>
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
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={customCoins || ""}
                    onKeyDown={(event) => {
                      if (
                        [
                          "Backspace",
                          "Delete",
                          "Tab",
                          "Escape",
                          "Enter",
                          "ArrowLeft",
                          "ArrowRight",
                          "Home",
                          "End",
                        ].includes(event.key) ||
                        event.ctrlKey ||
                        event.metaKey
                      ) {
                        return;
                      }
                      if (!/^[0-9]$/.test(event.key)) {
                        event.preventDefault();
                      }
                    }}
                    onChange={(event) => {
                      const cleaned = event.target.value.replace(/\D/g, "");
                      updateCustomCoins(cleaned);
                    }}
                    onPaste={(event) => {
                      const pastedText = event.clipboardData.getData("text");
                      const cleaned = pastedText.replace(/\D/g, "");
                      if (!/^\d+$/.test(pastedText)) {
                        event.preventDefault();
                        if (cleaned) {
                          updateCustomCoins(cleaned);
                        }
                      }
                    }}
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
        </div>

        {orders.length > 0 ? (
          <div className="orders-table">
            {orders.map((order) => {
              const href = paymentHistoryHref(order);
              const statusLabel = order.status === "success"
                ? t.successful
                : order.status === "failure" ? t.failed : t.pending;
              const rowContent = (
                <>
                  <div className="order-icon" aria-hidden="true"><ReceiptText size={18} /></div>
                  <div className="order-main">
                    <strong>{formatNumber(order.coins, language)} {t.pieces}</strong>
                    <span>@{order.username} · {order.transactionReference ?? order.orderId}</span>
                  </div>
                  <div className="order-method">
                    <span>{t.payment}</span>
                    <strong>{order.provider === "sebpay" ? "SebPay" : "SoleasPay"}</strong>
                  </div>
                  <div className="order-date">
                    <span>{t.date}</span>
                    <strong>{new Intl.DateTimeFormat(localeFor(language), { dateStyle: "medium", timeStyle: "short" }).format(new Date(order.submittedAt))}</strong>
                  </div>
                  <strong className="order-price">{formatPrice(order.amount, language)}</strong>
                  <span className={`order-status ${order.status}`}>
                    {order.status === "success"
                      ? <CheckCircle2 size={14} aria-hidden="true" />
                      : order.status === "failure"
                        ? <XCircle size={14} aria-hidden="true" />
                        : <Clock3 size={14} aria-hidden="true" />}
                    {statusLabel}
                  </span>
                  {href && <ChevronRight className="order-link-arrow" size={17} aria-hidden="true" />}
                </>
              );

              if (!href) {
                return <article className="order-row is-pending" key={order.orderId}>{rowContent}</article>;
              }

              return (
                <Link
                  className="order-row"
                  href={href}
                  key={order.orderId}
                  aria-label={`${t.openOrder} ${order.orderId} — ${statusLabel}`}
                >
                  {rowContent}
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="empty-history">
            <ReceiptText size={28} />
            <strong>{t.noOrders}</strong>
            <span>{t.nextOrder}</span>
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

            <div className="checkout-progress" aria-label={progressLabel}>
              {Array.from({ length: checkoutTotalSteps }, (_, index) => (
                <span className={step >= index + 1 ? "active" : ""} key={index} />
              ))}
            </div>

            {step === 1 && (
              <div className="checkout-step step-instructions">
                <div className="instructions-header">
                  <span className="modal-kicker">{formatProgress(t.progress, 1, checkoutTotalSteps)}</span>
                  <h2 id="checkout-title">Instructions importantes</h2>
                  <p className="instructions-intro">Veuillez lire attentivement avant de continuer</p>
                </div>

                <div className="instruction-cards">
                  <div className="instruction-card">
                    <div className="instruction-card-icon"><ShieldCheck size={20} /></div>
                    <div>
                      <strong>Identifiants TikTok requis</strong>
                      <p>Veuillez vous assurer que vous disposez de vos identifiants TikTok corrects (nom d&apos;utilisateur et mot de passe) pour recevoir vos pièces.</p>
                    </div>
                  </div>

                  <div className="instruction-card warning">
                    <div className="instruction-card-icon"><Info size={20} /></div>
                    <div>
                      <strong>Authentification à deux facteurs (2FA)</strong>
                      <p>Si vous avez activé l&apos;authentification à deux facteurs sur votre compte TikTok, veuillez la désactiver temporairement le temps de recevoir vos pièces.</p>
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
                    <span className="modal-kicker">{formatProgress(t.progress, 2, checkoutTotalSteps)}</span>
                    <h2 id="checkout-title">{t.rechargeInfo}</h2>
                  </div>
                  <div className="form-header-pack">
                    <span>{formatNumber(deliveredCoins, language)}</span> {t.pieces} · <strong>{formatPrice(selectedPack.price, language)}</strong>
                  </div>
                </div>

                <div className="fields-row">
                  <label className="field-label">
                    <span>{t.tiktokUsername} <span className="required">*</span></span>
                    <div className={`field${usernameError ? " field-error" : ""}`}>
                      <span>@</span>
                      <input
                        ref={usernameInputRef}
                        value={username}
                        onChange={(event) => {
                          const val = event.target.value.replace(/^@/, "");
                          setUsername(val);
                          if (usernameError && val.trim().length >= 2) {
                            setUsernameError(false);
                          }
                        }}
                        onBlur={() => {
                          if (username.trim().replace(/^@/, "").length < 2) {
                            setUsernameError(true);
                          }
                        }}
                        placeholder={t.usernamePlaceholder}
                        autoComplete="off"
                      />
                    </div>
                    {usernameError && (
                      <div className="field-error-notice" role="alert">
                        <AlertCircle size={13} />
                        <span>{t.usernameRequiredWarning}</span>
                      </div>
                    )}
                  </label>
                  <label className="field-label">
                    <span>{t.password} <span className="required">*</span></span>
                    <div className={`field field-password${passwordError ? " field-error" : ""}`}>
                      <span><LockKeyhole size={16} /></span>
                      <input
                        ref={passwordInputRef}
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(event) => {
                          const val = event.target.value;
                          setPassword(val);
                          if (passwordError && val.length >= 4) {
                            setPasswordError(false);
                          }
                        }}
                        onBlur={() => {
                          if (password.length < 4) {
                            setPasswordError(true);
                          }
                        }}
                        placeholder="••••••••"
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        className="toggle-password"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? (language === "fr" ? "Masquer le mot de passe" : "Hide password") : (language === "fr" ? "Afficher le mot de passe" : "Show password")}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {passwordError && (
                      <div className="field-error-notice" role="alert">
                        <AlertCircle size={13} />
                        <span>{t.passwordRequiredWarning}</span>
                      </div>
                    )}
                  </label>
                </div>

                <label className="field-label">
                  <span>
                    {t.whatsapp} <span className="required">*</span>{" "}
                    <span className="field-hint">— {t.whatsappHint}</span>
                  </span>
                  <div className={`field country-phone-field${whatsappError ? " field-error" : ""}`}>
                    <select
                      className="country-select"
                      value={countryCode}
                      onChange={(event) => {
                        const nextCode = event.target.value;
                        setCountryCode(nextCode);
                        if (dialCodes[nextCode]) {
                          setDialCode(dialCodes[nextCode]);
                        }
                      }}
                      aria-label={t.country}
                    >
                      <optgroup label={t.popularCountries}>
                        {POPULAR_COUNTRIES.map((country) => (
                          <option key={`pop-${country.code}`} value={country.code}>
                            {country.flag} {country.dialCode} ({country.name})
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label={t.allCountries}>
                        {ALL_COUNTRIES.map((country) => (
                          <option key={`all-${country.code}`} value={country.code}>
                            {country.flag} {country.dialCode} ({country.name})
                          </option>
                        ))}
                      </optgroup>
                    </select>
                    <input
                      ref={whatsappInputRef}
                      type="tel"
                      value={whatsapp}
                      onChange={(event) => {
                        const val = event.target.value.replace(/\D/g, "");
                        setWhatsapp(val);
                        if (whatsappError && val.length >= 6) {
                          setWhatsappError(false);
                        }
                      }}
                      onBlur={() => {
                        if (whatsapp.replace(/\D/g, "").length < 6) {
                          setWhatsappError(true);
                        }
                      }}
                      placeholder={t.whatsappPlaceholder}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="tel"
                      required
                    />
                  </div>
                  {whatsappError && (
                    <div className="field-error-notice" role="alert">
                      <AlertCircle size={13} />
                      <span>{t.whatsappRequiredWarning}</span>
                    </div>
                  )}
                </label>

                <button
                  type="button"
                  className="modal-primary"
                  onClick={handleStep2Continue}
                >
                  {t.continue} <ArrowRight size={18} />
                </button>
              </div>
            )}

            {step === 3 && (
              <div className="checkout-step">
                <button type="button" className="back-button" onClick={() => setStep(2)}>
                  <ArrowLeft size={15} /> {t.back}
                </button>
                <span className="modal-kicker">{formatProgress(t.progress, 3, checkoutTotalSteps)}</span>
                <h2 id="checkout-title">{t.confirmOrder}</h2>

                <div className="checkout-summary">
                  <div><span>{t.orderAccount}</span><strong>@{username.replace(/^@/, "")}</strong></div>
                  <div><span>{t.recharge}</span><strong>{formatNumber(deliveredCoins, language)} {t.pieces}</strong></div>
                  <div><span>{t.total}</span><strong>{formatPrice(selectedPack.price, language)}</strong></div>
                </div>

                <label className="field-label checkout-email-field">
                  <span>{t.emailAddress} <span className="required">*</span></span>
                  <div className={`field${emailError ? " field-error" : ""}`}>
                    <span aria-hidden="true">@</span>
                    <input
                      ref={emailInputRef}
                      form={paymentProvider === "soleaspay" ? "soleaspay-checkout-v3" : undefined}
                      type="email"
                      value={email}
                      onChange={(event) => {
                        const nextVal = event.target.value.replace(/\s/g, "");
                        setEmail(nextVal);
                        if (emailError && EMAIL_PATTERN.test(nextVal)) {
                          setEmailError(false);
                        }
                      }}
                      onBlur={() => {
                        if (!email.trim() || !EMAIL_PATTERN.test(email)) {
                          setEmailError(true);
                        }
                      }}
                      placeholder={t.emailPlaceholder}
                      inputMode="email"
                      pattern={EMAIL_PATTERN.source}
                      autoComplete="email"
                      required
                    />
                  </div>
                  {emailError && (
                    <div className="field-error-notice" role="alert">
                      <AlertCircle size={14} />
                      <span>{t.emailRequiredWarning}</span>
                    </div>
                  )}
                </label>

                <div className="payment-provider-selector">
                  <span className="payment-provider-selector-label">{t.chooseProvider}</span>
                  <div
                    className="payment-provider-options"
                    role="radiogroup"
                    aria-label={t.chooseProvider}
                  >
                    <button
                      type="button"
                      className={`payment-provider-option${paymentProvider === "soleaspay" ? " selected" : ""}`}
                      role="radio"
                      aria-checked={paymentProvider === "soleaspay"}
                      onClick={() => {
                        if (!email.trim() || !EMAIL_PATTERN.test(email)) {
                          setEmailError(true);
                          emailInputRef.current?.focus();
                        }
                        setPaymentProvider("soleaspay");
                      }}
                    >
                      <span className="payment-provider-badge">{t.recommended}</span>
                      <span className="payment-logo-wrap" aria-hidden="true">
                        <Image
                          src={getAssetPath("/soleaspay-logo.png")}
                          alt="SoleasPay"
                          width={44}
                          height={28}
                          className="payment-logo-img"
                        />
                      </span>
                      <strong className="payment-provider-name">SoleasPay</strong>
                      <span className="payment-provider-radio" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      style={{ display: "none" }}
                      className={`payment-provider-option${paymentProvider === "sebpay" ? " selected" : ""}`}
                      role="radio"
                      aria-checked={paymentProvider === "sebpay"}
                      onClick={() => {
                        if (!email.trim() || !EMAIL_PATTERN.test(email)) {
                          setEmailError(true);
                          emailInputRef.current?.focus();
                        }
                        setPaymentProvider("sebpay");
                      }}
                    >
                      <span className="payment-logo-wrap" aria-hidden="true">
                        <Image
                          src={getAssetPath("/sebpay-logo.png")}
                          alt="SebPay"
                          width={44}
                          height={28}
                          className="payment-logo-img"
                        />
                      </span>
                      <strong className="payment-provider-name">SebPay</strong>
                      <span className="payment-provider-radio" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {paymentProvider === "soleaspay" && paymentOrderId && (
                  <SoleasPayCheckoutV3
                    language={language}
                    amount={selectedPack.price}
                    orderId={paymentOrderId}
                    description={
                      language === "fr"
                        ? `Achat de ${deliveredCoins} pièces TikTok pour ${username}`
                        : `Purchase of ${deliveredCoins} TikTok coins for ${username}`
                    }
                    username={username}
                    password={password}
                    whatsapp={whatsapp}
                    dialCode={dialCode}
                    email={email}
                    coins={deliveredCoins}
                    isEmailValid={Boolean(email.trim() && EMAIL_PATTERN.test(email))}
                    onRequireEmail={() => {
                      setEmailError(true);
                      emailInputRef.current?.focus();
                    }}
                  />
                )}

                {paymentProvider === "sebpay" && (
                  <button
                    type="button"
                    className="modal-primary"
                    disabled={!paymentOrderId}
                    onClick={() => {
                      if (!email.trim() || !EMAIL_PATTERN.test(email)) {
                        setEmailError(true);
                        emailInputRef.current?.focus();
                        return;
                      }
                      setStep(4);
                    }}
                  >
                    {t.continue} <ArrowRight size={18} />
                  </button>
                )}
              </div>
            )}

            {step === 4 && paymentProvider === "sebpay" && (
              <div className="checkout-step step-form">
                <button type="button" className="back-button" onClick={() => setStep(3)}>
                  <ArrowLeft size={15} /> {t.back}
                </button>
                <span className="modal-kicker">{formatProgress(t.progress, 4, 4)}</span>
                <h2 id="checkout-title">
                  {language === "fr" ? "Paiement SebPay" : "SebPay payment"}
                </h2>

                <SebPayCheckout
                  language={language}
                  orderId={paymentOrderId}
                  amount={selectedPack.price}
                  coins={deliveredCoins}
                  username={username}
                  password={password}
                  whatsapp={whatsapp}
                  dialCode={dialCode}
                  countryCode={countryCode}
                  email={email}
                />
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
