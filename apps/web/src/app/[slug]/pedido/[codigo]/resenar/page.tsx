import { ResenarClient } from './ResenarClient';

export const dynamic = 'force-dynamic';

export default async function ResenarPage(
  { params }: { params: { slug: string; codigo: string } },
) {
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8080/api/v1';

  // Carga el menú del local para resolver nombres+fotos de los productos
  // que el visitante va a reseñar. NO necesita auth.
  let menu: any = null;
  try {
    const res = await fetch(`${apiBase}/public/menu/${params.slug}`, { cache: 'no-store' });
    if (res.ok) menu = await res.json();
  } catch { /* ignore */ }

  return (
    <ResenarClient
      slug={params.slug}
      codigo={params.codigo}
      productos={menu?.data?.productos ?? []}
      local={menu?.data?.local ?? null}
    />
  );
}
