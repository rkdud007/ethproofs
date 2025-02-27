import type { Metadata } from "next"

import {
  isNetlifyProduction,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
} from "./constants"

export type CustomMetadata = {
  title?: string
  description?: string
  images?: { url: string; alt: string }[]
}

export const getTitle = (title?: string) =>
  title ? `${title} | ${SITE_NAME}` : SITE_NAME

export const defaults = (custom: CustomMetadata): Metadata => {
  const title = getTitle(custom.title)
  const description = custom.description || SITE_DESCRIPTION
  const images = custom.images || [
    {
      url: "images/hero-background.png",
      alt: "Artistic hero image of blocks beings checked off",
    },
  ]

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    openGraph: {
      type: "website",
      locale: "en_US",
      url: SITE_URL,
      siteName: SITE_NAME,
      title,
      description,
      images,
    },
    twitter: {
      images,
      description,
      card: "summary_large_image",
      site: SITE_URL,
      title,
    },
    robots: {
      index: isNetlifyProduction,
      follow: isNetlifyProduction,
    },
  }
}

export const getMetadata = (
  custom: CustomMetadata = { title: SITE_NAME, description: SITE_DESCRIPTION },
  overrides?: Partial<Metadata>
): Metadata => ({
  ...defaults(custom),
  ...overrides,
})
