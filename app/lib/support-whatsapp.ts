export type SupportLanguage = "fr" | "en";

export type SupportWhatsAppContact = {
  id: string;
  label: Record<SupportLanguage, string>;
  whatsappNumber: string;
  phoneNumber: string;
  displayPhone: string;
};

export const SUPPORT_WHATSAPP_CONTACTS = [
  {
    id: "service-client-1",
    label: {
      fr: "Service client 1",
      en: "Customer service 1",
    },
    whatsappNumber: "237680287776",
    phoneNumber: "+237680287776",
    displayPhone: "+237 680 287 776",
  },
  {
    id: "service-client-2",
    label: {
      fr: "Service client 2",
      en: "Customer service 2",
    },
    whatsappNumber: "237690928237",
    phoneNumber: "+237690928237",
    displayPhone: "+237 690 928 237",
  },
] as const satisfies readonly SupportWhatsAppContact[];

export function buildSupportWhatsAppHref(
  whatsappNumber: string,
  message?: string,
): string {
  const normalizedNumber = whatsappNumber.replace(/\D/g, "");
  const baseHref = `https://wa.me/${normalizedNumber}`;
  const normalizedMessage = message?.trim();

  return normalizedMessage
    ? `${baseHref}?text=${encodeURIComponent(normalizedMessage)}`
    : baseHref;
}
