"use client";

import { useEffect } from "react";
import { BASE_PATH, getAssetPath } from "@/app/lib/asset-path";

export function PwaServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !window.isSecureContext) return;

    const registerServiceWorker = () => {
      const swUrl = getAssetPath("/service-worker.js");
      const scope = BASE_PATH ? `${BASE_PATH}/` : "/";
      void navigator.serviceWorker.register(swUrl, { scope }).catch(() => undefined);
    };

    if (document.readyState === "complete") {
      registerServiceWorker();
      return;
    }

    window.addEventListener("load", registerServiceWorker, { once: true });
    return () => window.removeEventListener("load", registerServiceWorker);
  }, []);

  return null;
}
