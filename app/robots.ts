import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://upcoin.click";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/payment/success/",
        "/payment/failed/",
        "/payment/failure/",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
