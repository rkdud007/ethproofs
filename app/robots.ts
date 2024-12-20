import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules:
      process.env.CONTEXT === "production"
        ? {
            userAgent: "*",
            allow: "/",
          }
        : {
            userAgent: "*",
            disallow: "/",
          },
    host: process.env.SITE_URL,
    sitemap: new URL("/sitemap.xml", process.env.SITE_URL).toString(),
  }
}
