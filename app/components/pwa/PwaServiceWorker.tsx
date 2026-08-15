"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import { BASE_PATH, getAssetPath } from "@/app/lib/asset-path";
import { RefreshCw, X } from "lucide-react";

interface VersionPayload {
  version: string;
  commit?: string;
  buildTime?: string;
  timestamp?: number;
}

export function PwaServiceWorker() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const initialVersionRef = useRef<string | null>(null);
  const refreshingRef = useRef(false);

  const applyUpdate = useCallback(() => {
    setIsUpdating(true);

    if (registrationRef.current?.waiting) {
      registrationRef.current.waiting.postMessage({ action: "skipWaiting" });
    }

    // Give the service worker a split second to activate, then reload
    setTimeout(() => {
      window.location.reload();
    }, 250);
  }, []);

  const checkForRemoteUpdate = useCallback(async () => {
    try {
      const versionUrl = getAssetPath(`/version.json?t=${Date.now()}`);
      const res = await fetch(versionUrl, { cache: "no-store" });
      if (!res.ok) return;

      const data = (await res.json()) as VersionPayload;
      if (!data?.version) return;

      if (!initialVersionRef.current) {
        initialVersionRef.current = data.version;
        return;
      }

      if (initialVersionRef.current !== data.version) {
        console.log(`[PWA] New version detected online: ${data.version} (current: ${initialVersionRef.current})`);
        setUpdateAvailable(true);
        if (registrationRef.current) {
          void registrationRef.current.update();
        }
      }
    } catch {
      // Offline or network error - ignore silently
    }
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !window.isSecureContext) return;

    let updateInterval: NodeJS.Timeout | null = null;

    // Prevent reload loops on controllerchange
    const onControllerChange = () => {
      if (refreshingRef.current) return;
      console.log("[PWA] Service worker controller changed.");
      setUpdateAvailable(true);
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "SW_ACTIVATED" || event.data?.type === "SW_UPDATED") {
        console.log("[PWA] Service worker updated event received:", event.data);
        setUpdateAvailable(true);
      }
    };

    navigator.serviceWorker.addEventListener("message", onMessage);

    const handleServiceWorkerRegistration = (registration: ServiceWorkerRegistration) => {
      registrationRef.current = registration;

      // If a new worker is already waiting to activate
      if (registration.waiting) {
        setUpdateAvailable(true);
      }

      // Listen for new worker installs
      registration.addEventListener("updatefound", () => {
        const installingWorker = registration.installing;
        if (!installingWorker) return;

        installingWorker.addEventListener("statechange", () => {
          if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
            console.log("[PWA] New content is available; please refresh.");
            setUpdateAvailable(true);
          }
        });
      });

      // Proactively check for updates immediately
      void registration.update();
      void checkForRemoteUpdate();
    };

    const registerServiceWorker = () => {
      const swUrl = getAssetPath("/service-worker.js");
      const scope = BASE_PATH ? `${BASE_PATH}/` : "/";

      // updateViaCache: 'none' ensures browser always checks the network for service-worker.js
      navigator.serviceWorker
        .register(swUrl, { scope, updateViaCache: "none" })
        .then((registration) => {
          handleServiceWorkerRegistration(registration);
        })
        .catch((error) => {
          console.warn("[PWA] ServiceWorker registration failed:", error);
        });
    };

    if (document.readyState === "complete") {
      registerServiceWorker();
    } else {
      window.addEventListener("load", registerServiceWorker, { once: true });
    }

    // Trigger update checks when returning to the app or reconnecting
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible" && registrationRef.current) {
        void registrationRef.current.update();
        void checkForRemoteUpdate();
      }
    };

    const onFocus = () => {
      if (registrationRef.current) {
        void registrationRef.current.update();
        void checkForRemoteUpdate();
      }
    };

    const onOnline = () => {
      if (registrationRef.current) {
        void registrationRef.current.update();
        void checkForRemoteUpdate();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);

    // Periodic check every 15 minutes
    updateInterval = setInterval(() => {
      if (registrationRef.current) {
        void registrationRef.current.update();
        void checkForRemoteUpdate();
      }
    }, 15 * 60 * 1000);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      navigator.serviceWorker.removeEventListener("message", onMessage);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
      if (updateInterval) clearInterval(updateInterval);
    };
  }, [checkForRemoteUpdate]);

  if (!updateAvailable || dismissed) {
    return null;
  }

  return (
    <aside
      aria-label="Mise à jour disponible"
      className="pwa-update-toast"
      role="alert"
    >
      <div className="pwa-update-content">
        <div className="pwa-update-icon-wrap" aria-hidden="true">
          <Image
            src={getAssetPath("/pwa-192x192.png")}
            alt="UpCoin"
            width={38}
            height={38}
            className="pwa-update-app-icon"
            priority
          />
        </div>
        <div className="pwa-update-texts">
          <p className="pwa-update-title">Mise à jour disponible</p>
          <p className="pwa-update-desc">
            Une nouvelle version d&apos;UpCoin est en ligne.
          </p>
        </div>
      </div>

      <div className="pwa-update-actions">
        <button
          type="button"
          onClick={applyUpdate}
          disabled={isUpdating}
          className="pwa-update-btn-refresh"
        >
          <RefreshCw className={`pwa-update-refresh-icon ${isUpdating ? "animate-spin" : ""}`} />
          <span>{isUpdating ? "Chargement..." : "Actualiser"}</span>
        </button>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="pwa-update-btn-close"
          aria-label="Fermer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
