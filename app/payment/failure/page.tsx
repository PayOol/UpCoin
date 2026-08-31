import type { Metadata } from "next";
import { PaymentCheckoutReturn } from "@/app/components/payments/PaymentCheckoutReturn";

export const metadata: Metadata = {
  title: "Paiement Non Abouti | UpCoin",
  description: "Statut d'échec de transaction UpCoin.",
  alternates: null,
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function PaymentFailurePage() {
  return <PaymentCheckoutReturn outcome="failure" />;
}
