import type { MetadataRoute } from 'next';

// Regenera el sitemap cada hora (ISR) para recoger locales nuevos sin redeploy.
export const revalidate = 3600;

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'https://clicktoeat.lumiaaisolutions.com';

async function getSlugs(): Promise<string[]> {
  const apiURL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1';
  try {
    const res = await fetch(`${apiURL}/public/locales`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const json = await res.json();
    return ((json.data ?? []) as Array<{ slug?: string }>)
      .map((l) => l.slug)
      .filter((s): s is string => Boolean(s));
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE}/registro`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/terminos`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/privacidad`, changeFrequency: 'yearly', priority: 0.3 },
  ];

  const localeRoutes: MetadataRoute.Sitemap = (await getSlugs()).map((slug) => ({
    url: `${BASE}/${slug}`,
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  return [...staticRoutes, ...localeRoutes];
}
