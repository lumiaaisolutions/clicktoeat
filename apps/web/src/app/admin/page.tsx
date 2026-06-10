'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { LocalAdmin, Resource } from '@/lib/types';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/store/auth';

export default function AdminHome() {
  const user = useAuth((s) => s.user);

  if (user?.rol === 'super_admin') return <SuperAdminHome />;
  return <OwnerHome />;
}

function OwnerHome() {
  const [local, setLocal] = useState<LocalAdmin | null>(null);
  const [stats, setStats] = useState<{ productos: number; categorias: number; pedidos: number } | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [{ data: l }, prodResp, catResp, pedResp] = await Promise.all([
          api.get<Resource<LocalAdmin>>('/local'),
          api.get('/productos', { params: { per_page: 1 } }),
          api.get('/categorias'),
          api.get('/pedidos', { params: { per_page: 1 } }),
        ]);
        if (!alive) return;
        setLocal(l.data);
        setStats({
          productos:  prodResp.data?.meta?.total ?? 0,
          categorias: (catResp.data?.data ?? []).length,
          pedidos:    pedResp.data?.meta?.total ?? 0,
        });
      } catch { /* owner sin local — no rompemos */ }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <div>
      <h1 className="ce-display text-2xl md:text-4xl font-bold">Inicio</h1>
      <p className="text-muted text-sm mt-1">Resumen de tu local en ClickToEat.</p>

      {local ? (
        <section className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card title="Local"      value={local.nombre} hint={local.slug} />
          <Card title="Pedidos"    value={stats?.pedidos.toString() ?? '–'}    hint="totales" />
          <Card title="Productos"  value={stats?.productos.toString() ?? '–'}  hint="totales" />
          <Card title="Categorías" value={stats?.categorias.toString() ?? '–'} hint="totales" />
        </section>
      ) : (
        <section className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </section>
      )}

      {local && (
        <section className="mt-8 rounded-2xl border border-line bg-white p-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-sm text-muted">Tu landing pública</p>
            <a
              href={local.public_url}
              target="_blank"
              rel="noopener noreferrer"
              className="ce-display font-bold text-xl hover:underline break-all"
            >
              {local.public_url}
            </a>
          </div>
          <Link href="/admin/branding" className="px-4 py-2 rounded-xl bg-ink text-white text-sm font-medium">
            Personalizar
          </Link>
        </section>
      )}
    </div>
  );
}

function SuperAdminHome() {
  const [locales, setLocales] = useState<LocalAdmin[] | null>(null);

  useEffect(() => {
    api.get<{ data: LocalAdmin[] }>('/admin/locales')
      .then(({ data }) => setLocales(data.data))
      .catch(() => setLocales([]));
  }, []);

  const total       = locales?.length ?? 0;
  const activos     = locales?.filter((l) => l.activo && !l.suspendido).length ?? 0;
  const suspendidos = locales?.filter((l) => l.suspendido).length ?? 0;

  return (
    <div>
      <h1 className="ce-display text-2xl md:text-4xl font-bold">Panel global</h1>
      <p className="text-muted text-sm mt-1">Administra todos los locales de la plataforma.</p>

      <section className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {locales === null ? (
          <><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></>
        ) : (
          <>
            <Card title="Locales"     value={total.toString()}       hint="totales en la plataforma" />
            <Card title="Activos"     value={activos.toString()}     hint="aceptando pedidos" />
            <Card title="Suspendidos" value={suspendidos.toString()} hint="pausados" />
          </>
        )}
      </section>

      <section className="mt-8 rounded-2xl border border-line bg-white p-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm text-muted">Operación</p>
          <p className="ce-display font-bold text-xl">Gestiona los locales de la plataforma</p>
          <p className="text-sm text-muted mt-1">Da de alta nuevos clientes, edita su branding, suspende cuentas.</p>
        </div>
        <Link href="/admin/locales" className="px-4 py-2 rounded-xl bg-ink text-white text-sm font-medium">
          Ir a Locales →
        </Link>
      </section>
    </div>
  );
}

function Card({ title, value, hint }: { title: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <p className="text-xs uppercase tracking-wider text-muted">{title}</p>
      <p className="ce-display text-2xl font-bold mt-1 truncate">{value}</p>
      {hint && <p className="text-xs text-muted mt-1">{hint}</p>}
    </div>
  );
}
