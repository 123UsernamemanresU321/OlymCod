import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://olympiad-codex.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/notes", "/contribute"],
      disallow: ["/app", "/login", "/contribution-status"]
    },
    sitemap: `${siteUrl}/sitemap.xml`
  };
}
