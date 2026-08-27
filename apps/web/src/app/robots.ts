import type { MetadataRoute } from 'next';

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'https://clicktoeat.lumiaaisolutions.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/onboarding', '/mesa', '/review', '/forgot-password', '/reset-password'],
    },
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
