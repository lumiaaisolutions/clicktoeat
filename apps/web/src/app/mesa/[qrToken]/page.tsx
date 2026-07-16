import { notFound } from 'next/navigation';
import { fetchMenu, MenuNotFoundError } from '@/lib/api';
import { MesaClient } from './MesaClient';

export const dynamic = 'force-dynamic';

interface MesaInfo {
  mesaId: number;
  etiqueta: string;
  localSlug: string;
  localNombre: string;
}

async function fetchMesa(qrToken: string): Promise<MesaInfo> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1';
  const res = await fetch(`${base}/public/mesa/${encodeURIComponent(qrToken)}`, { cache: 'no-store' });
  if (!res.ok) notFound();
  const body = await res.json();
  return body.data;
}

export default async function MesaPage({ params }: { params: { qrToken: string } }) {
  const mesa = await fetchMesa(params.qrToken);

  let menu;
  try {
    menu = await fetchMenu(mesa.localSlug);
  } catch (err) {
    if (err instanceof MenuNotFoundError) notFound();
    throw err;
  }

  return <MesaClient mesa={mesa} qrToken={params.qrToken} menu={menu.data} />;
}
