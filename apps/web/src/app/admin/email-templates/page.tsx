'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from '@/store/toast';
import { Button } from '@/components/ui/Button';
import { Field, Textarea, Switch } from '@/components/ui/FormField';
import { Skeleton } from '@/components/ui/Skeleton';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/Icon';

interface Tpl {
  id: number;
  slug: string;
  subject: string;
  body_html: string;
  active: boolean;
}

// Slugs reservados con descripción humana — el super_admin elige uno al crear
const SLUGS = [
  { slug: 'pedido_confirmado',   label: 'Pedido confirmado al cliente', desc: 'Cuando un pedido entra al local' },
  { slug: 'ticket_reply',        label: 'Respuesta de soporte',         desc: 'Cuando responde un ticket abierto' },
  { slug: 'trial_will_end',      label: 'Tu prueba está por terminar',  desc: '3 días antes de que expire el trial' },
  { slug: 'trial_nudge',         label: 'Recordatorio mid-trial',       desc: 'Día 7 del trial gratis' },
  { slug: 'payment_failed',      label: 'Pago fallido',                 desc: 'Cuando Stripe rechaza el cargo' },
  { slug: 'plan_canceled',       label: 'Plan cancelado',               desc: 'Tras cancelar suscripción' },
  { slug: 'welcome',             label: 'Bienvenida al sumarse',        desc: 'Tras registrar el local' },
  { slug: 'carrito_abandonado',  label: 'Carrito abandonado',           desc: 'Cliente abandonó el flow de pedido' },
  { slug: 'resumen_semanal',     label: 'Resumen semanal',              desc: 'Lunes 8am al owner' },
];

const PLACEHOLDERS = ['{{ nombre_local }}', '{{ nombre_cliente }}', '{{ pedido_id }}', '{{ total }}', '{{ link }}', '{{ fecha }}', '{{ codigo }}'];

export default function EmailTemplatesPage() {
  const [items, setItems] = useState<Tpl[] | null>(null);
  const [open,  setOpen]  = useState<Tpl | null | 'new'>(null);

  const refresh = () => {
    setItems(null);
    api.get<{ data: Tpl[] }>('/admin/email-templates').then(({ data }) => setItems(data.data));
  };
  useEffect(refresh, []);

  const slugsUsados = new Set((items ?? []).map((t) => t.slug));
  const sinPlantilla = SLUGS.filter((s) => !slugsUsados.has(s.slug));

  return (
    <div>
      <AdminPageHeader
        kicker="Email templates"
        kickerIcon="bell"
        title="Edita los correos"
        titleAccent="sin tocar código."
        description="Subject + HTML por slug. Cada Mailable consulta su template activo y cae al template Blade hardcoded si no hay registro."
        actions={<Button onClick={() => setOpen('new')}>Nueva plantilla</Button>}
      />

      <div className="rounded-3xl border border-line bg-amber-50 px-4 py-3 mb-4 text-sm">
        <p className="font-semibold text-amber-900 mb-1">Placeholders disponibles</p>
        <div className="flex flex-wrap gap-1.5">
          {PLACEHOLDERS.map((p) => (
            <code key={p} className="text-[11px] bg-white border border-amber-200 rounded px-1.5 py-0.5 font-mono">{p}</code>
          ))}
        </div>
      </div>

      {!items ? <Skeleton className="h-60" /> : items.length === 0 ? (
        <p className="text-sm text-muted text-center py-8">Sin plantillas. Crea una.</p>
      ) : (
        <ul className="space-y-2 mb-6">
          {items.map((t) => (
            <li key={t.id} className="rounded-2xl border border-line bg-white p-4 flex items-start gap-3 flex-wrap">
              <span className={cn(
                'text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-full shrink-0',
                t.active ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-600',
              )}>
                {t.active ? 'activo' : 'inactivo'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-mono text-xs text-muted">{t.slug}</p>
                <p className="font-bold truncate">{t.subject}</p>
                <p className="text-xs text-muted line-clamp-1 mt-0.5">{stripHtml(t.body_html).slice(0, 140)}</p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setOpen(t)}>Editar</Button>
            </li>
          ))}
        </ul>
      )}

      {sinPlantilla.length > 0 && (
        <>
          <h3 className="ce-display font-bold text-sm text-muted mb-2 uppercase tracking-wider">Slugs sin plantilla (usan Blade hardcoded)</h3>
          <ul className="space-y-1 text-xs text-muted">
            {sinPlantilla.map((s) => (
              <li key={s.slug}>
                <code className="font-mono bg-line/30 px-1.5 py-0.5 rounded">{s.slug}</code>
                <span className="ml-2">{s.label} — {s.desc}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {open && <EditorModal tpl={open === 'new' ? null : open} onClose={() => setOpen(null)} onSaved={() => { setOpen(null); refresh(); }} />}
    </div>
  );
}

function EditorModal({ tpl, onClose, onSaved }: { tpl: Tpl | null; onClose: () => void; onSaved: () => void }) {
  const [slug,    setSlug]    = useState(tpl?.slug ?? '');
  const [subject, setSubject] = useState(tpl?.subject ?? '');
  const [body,    setBody]    = useState(tpl?.body_html ?? '');
  const [active,  setActive]  = useState(tpl?.active ?? true);
  const [busy,    setBusy]    = useState(false);
  const [preview, setPreview] = useState<{ subject_rendered: string; body_html_rendered: string } | null>(null);

  const save = async () => {
    setBusy(true);
    try {
      if (tpl) {
        await api.patch(`/admin/email-templates/${tpl.id}`, { subject, body_html: body, active });
      } else {
        await api.post('/admin/email-templates', { slug, subject, body_html: body, active });
      }
      toast.success('Plantilla guardada');
      onSaved();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Error al guardar');
    } finally { setBusy(false); }
  };

  const doPreview = async () => {
    try {
      const { data } = await api.post('/admin/email-templates/preview', { subject, body_html: body });
      setPreview(data);
    } catch { toast.error('Error al renderizar'); }
  };

  const remove = async () => {
    if (!tpl) return;
    if (!confirm(`Borrar la plantilla "${tpl.slug}"? Los Mailables volverán a usar el Blade hardcoded.`)) return;
    await api.delete(`/admin/email-templates/${tpl.id}`);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur p-4 overflow-y-auto" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="max-w-4xl mx-auto bg-white rounded-3xl border border-line p-6 my-4">
        <div className="flex items-start gap-3 mb-4">
          <h3 className="ce-display font-bold text-xl flex-1">{tpl ? `Editar ${tpl.slug}` : 'Nueva plantilla'}</h3>
          <button onClick={onClose} className="text-muted hover:text-ink"><Icon name="x" size={20} /></button>
        </div>

        {!tpl && (
          <Field
            label="Slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
            hint="Usa uno de los slugs reservados (ej. pedido_confirmado, ticket_reply…)"
            required
          />
        )}

        <Field label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} required />
        <Textarea label="Body HTML" value={body} onChange={(e) => setBody(e.target.value)} rows={14} required />

        <Switch label="Activa" hint="Si está apagada, el Mailable cae al Blade hardcoded." checked={active} onChange={setActive} />

        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-line">
          <Button onClick={save} loading={busy}>Guardar</Button>
          <Button variant="secondary" onClick={doPreview}>Vista previa</Button>
          {tpl && <Button variant="ghost" onClick={remove}>Borrar</Button>}
        </div>

        {preview && (
          <div className="mt-4 rounded-2xl border border-line bg-zinc-50 p-4">
            <p className="text-[11px] uppercase tracking-wider font-bold text-muted mb-1">Vista previa</p>
            <p className="font-bold mb-2">{preview.subject_rendered}</p>
            <div className="bg-white rounded-xl border border-line p-4 text-sm" dangerouslySetInnerHTML={{ __html: preview.body_html_rendered }} />
          </div>
        )}
      </div>
    </div>
  );
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
