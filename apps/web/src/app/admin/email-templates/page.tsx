'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { toast } from '@/store/toast';
import { Button } from '@/components/ui/Button';
import { Field, Textarea, Switch, Select } from '@/components/ui/FormField';
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

// Catálogo de correos editables — el super_admin elige uno y le cambia el contenido
const SLUGS = [
  { slug: 'pedido_confirmado',   label: 'Pedido confirmado al cliente',         desc: 'Cuando alguien hace un pedido y se confirma' },
  { slug: 'ticket_reply',        label: 'Respuesta de soporte',                 desc: 'Cuando contestas un mensaje de ayuda' },
  { slug: 'trial_will_end',      label: 'Tu prueba está por terminar',          desc: '3 días antes de que se acabe la prueba gratis' },
  { slug: 'trial_nudge',         label: 'Recordatorio a la mitad de la prueba', desc: 'Día 7 del periodo gratuito' },
  { slug: 'payment_failed',      label: 'Pago fallido',                         desc: 'Cuando no se pudo cobrar la tarjeta' },
  { slug: 'plan_canceled',       label: 'Plan cancelado',                       desc: 'Cuando el local cancela su suscripción' },
  { slug: 'welcome',             label: 'Bienvenida al registrar',              desc: 'Justo después de crear el local' },
  { slug: 'carrito_abandonado',  label: 'Carrito abandonado',                   desc: 'Cuando un cliente deja un pedido a la mitad' },
  { slug: 'resumen_semanal',     label: 'Resumen semanal',                      desc: 'Lunes 8 a.m. al dueño del local' },
];

const SLUG_TO_LABEL: Record<string, { label: string; desc: string }> = Object.fromEntries(
  SLUGS.map((s) => [s.slug, { label: s.label, desc: s.desc }]),
);

const PLACEHOLDERS = [
  { token: '{{ nombre_local }}',   label: 'Nombre del local' },
  { token: '{{ nombre_cliente }}', label: 'Nombre del cliente' },
  { token: '{{ pedido_id }}',      label: 'Número de pedido' },
  { token: '{{ total }}',          label: 'Total del pedido' },
  { token: '{{ link }}',           label: 'Enlace al panel o landing' },
  { token: '{{ fecha }}',          label: 'Fecha y hora' },
  { token: '{{ codigo }}',         label: 'Código de cupón' },
];

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
        kicker="Correos"
        kickerIcon="bell"
        title="Edita los correos"
        titleAccent="que envías."
        description="Personaliza el asunto y el mensaje de cada correo automático. Los que no edites se envían con el texto por defecto."
        actions={<Button onClick={() => setOpen('new')}>Personalizar un correo</Button>}
      />

      {/* F100f — Sin bloque de variables técnicas. Los botones para insertar
          variables ahora viven DENTRO del editor del correo (cuando el owner
          está realmente editando). Aquí solo damos una pista corta. */}
      <div className="rounded-2xl border border-line bg-white px-4 py-3 mb-4 text-sm flex items-start gap-3">
        <Icon name="sparkles" size={16} className="shrink-0 mt-0.5 text-emerald-600" />
        <p className="text-muted leading-relaxed">
          Al editar un correo, podrás insertar datos del cliente, del pedido o del local con un toque desde la barra de "Insertar dato".
        </p>
      </div>

      {!items ? <Skeleton className="h-60" /> : items.length === 0 ? (
        <p className="text-sm text-muted text-center py-8">Aún no has personalizado ningún correo. Toca "Personalizar un correo" arriba.</p>
      ) : (
        <ul className="space-y-2 mb-6">
          {items.map((t) => {
            const info = SLUG_TO_LABEL[t.slug];
            return (
              <li key={t.id} className="rounded-2xl border border-line bg-white p-4 flex items-start gap-3 flex-wrap">
                <span className={cn(
                  'text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-full shrink-0',
                  t.active ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-600',
                )}>
                  {t.active ? 'activo' : 'inactivo'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted">{info?.desc ?? '—'}</p>
                  <p className="font-bold truncate">{info?.label ?? t.slug}</p>
                  <p className="text-sm text-ink/80 mt-1 truncate"><span className="text-muted">Asunto:</span> {t.subject}</p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => setOpen(t)}>Editar</Button>
              </li>
            );
          })}
        </ul>
      )}

      {sinPlantilla.length > 0 && (
        <div className="rounded-2xl border border-line bg-white p-4">
          <h3 className="ce-display font-bold text-sm mb-1">Correos que aún usan el texto por defecto</h3>
          <p className="text-xs text-muted mb-3">Estos correos se envían con un texto que ya escribimos. Edita el que quieras personalizar.</p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {sinPlantilla.map((s) => (
              <li key={s.slug} className="border border-line rounded-xl p-3 flex items-start gap-2">
                <Icon name="bell" size={14} className="text-muted shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-tight">{s.label}</p>
                  <p className="text-xs text-muted leading-tight mt-0.5">{s.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {open && <EditorModal tpl={open === 'new' ? null : open} slugsUsados={slugsUsados} onClose={() => setOpen(null)} onSaved={() => { setOpen(null); refresh(); }} />}
    </div>
  );
}

function EditorModal({ tpl, slugsUsados, onClose, onSaved }: { tpl: Tpl | null; slugsUsados: Set<string>; onClose: () => void; onSaved: () => void }) {
  const [slug,    setSlug]    = useState(tpl?.slug ?? '');
  const [subject, setSubject] = useState(tpl?.subject ?? '');
  const [body,    setBody]    = useState(tpl?.body_html ?? '');
  const [active,  setActive]  = useState(tpl?.active ?? true);
  const [busy,    setBusy]    = useState(false);
  const [preview, setPreview] = useState<{ subject_rendered: string; body_html_rendered: string } | null>(null);

  // F100f — Refs para insertar variables EN EL CURSOR del campo activo (asunto
  // o cuerpo). Sin esto, el owner tenía que copiar/pegar manualmente strings
  // técnicos tipo `{{ nombre_local }}`.
  const subjectRef = useRef<HTMLInputElement | null>(null);
  const bodyRef    = useRef<HTMLTextAreaElement | null>(null);
  const [focused, setFocused] = useState<'subject' | 'body'>('body');

  const insertarVar = (token: string) => {
    if (focused === 'subject') {
      const el = subjectRef.current;
      if (!el) { setSubject((s) => s + token); return; }
      const start = el.selectionStart ?? subject.length;
      const end   = el.selectionEnd ?? subject.length;
      const next = subject.slice(0, start) + token + subject.slice(end);
      setSubject(next);
      // Reposiciona el cursor tras el insert
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start + token.length, start + token.length);
      });
    } else {
      const el = bodyRef.current;
      if (!el) { setBody((s) => s + token); return; }
      const start = el.selectionStart ?? body.length;
      const end   = el.selectionEnd ?? body.length;
      const next = body.slice(0, start) + token + body.slice(end);
      setBody(next);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start + token.length, start + token.length);
      });
    }
  };

  const disponibles = SLUGS.filter((s) => !slugsUsados.has(s.slug));
  const info = tpl ? SLUG_TO_LABEL[tpl.slug] : (slug ? SLUG_TO_LABEL[slug] : null);

  const save = async () => {
    setBusy(true);
    try {
      if (tpl) {
        await api.patch(`/admin/email-templates/${tpl.id}`, { subject, body_html: body, active });
      } else {
        await api.post('/admin/email-templates', { slug, subject, body_html: body, active });
      }
      toast.success('Correo guardado');
      onSaved();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Error al guardar');
    } finally { setBusy(false); }
  };

  const doPreview = async () => {
    try {
      const { data } = await api.post('/admin/email-templates/preview', { subject, body_html: body });
      setPreview(data);
    } catch { toast.error('Error al generar la vista previa'); }
  };

  const remove = async () => {
    if (!tpl) return;
    if (!confirm(`Eliminar este correo personalizado? Volverá a enviarse con el texto por defecto.`)) return;
    await api.delete(`/admin/email-templates/${tpl.id}`);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur p-4 overflow-y-auto" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="max-w-4xl mx-auto bg-white rounded-3xl border border-line p-6 my-4">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-1">
            <h3 className="ce-display font-bold text-xl">{info?.label ?? 'Personalizar correo'}</h3>
            {info && <p className="text-sm text-muted mt-0.5">{info.desc}</p>}
          </div>
          <button onClick={onClose} className="text-muted hover:text-ink"><Icon name="x" size={20} /></button>
        </div>

        {!tpl && (
          <Select
            label="¿Cuál correo quieres personalizar?"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
          >
            <option value="">— Elige uno —</option>
            {disponibles.map((s) => (
              <option key={s.slug} value={s.slug}>{s.label}</option>
            ))}
          </Select>
        )}

        <Field
          ref={subjectRef}
          label="Asunto del correo"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          onFocus={() => setFocused('subject')}
          hint="Lo que el destinatario verá como título"
          required
        />

        {/* F100f — Barra de "Insertar dato". Botones que insertan en el cursor
            del campo activo. Cero exposición de sintaxis técnica al usuario. */}
        <div className="rounded-xl border border-line bg-zinc-50 p-2.5 my-2">
          <p className="text-[10px] uppercase tracking-wider font-bold text-muted mb-1.5 px-1">
            Insertar dato {focused === 'subject' ? 'en el asunto' : 'en el mensaje'}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {PLACEHOLDERS.map((p) => (
              <button
                key={p.token}
                type="button"
                onClick={() => insertarVar(p.token)}
                className="text-xs px-2.5 py-1 rounded-full bg-white border border-line hover:border-ink/40 hover:bg-line/30 transition inline-flex items-center gap-1"
                title={`Inserta ${p.label} en el cursor`}
              >
                <Icon name="plus" size={10} />
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <Textarea
          ref={bodyRef}
          label="Mensaje"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onFocus={() => setFocused('body')}
          rows={14}
          hint="Usa los botones de arriba para insertar el nombre del cliente, el total, etc."
          required
        />

        <Switch
          label="Activar este correo personalizado"
          hint="Si lo apagas, volvemos al texto por defecto."
          checked={active}
          onChange={setActive}
        />

        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-line">
          <Button onClick={save} loading={busy} disabled={!tpl && !slug}>Guardar</Button>
          <Button variant="secondary" onClick={doPreview}>Vista previa</Button>
          {tpl && <Button variant="ghost" onClick={remove}>Eliminar</Button>}
        </div>

        {preview && (
          <div className="mt-4 rounded-2xl border border-line bg-zinc-50 p-4">
            <p className="text-[11px] uppercase tracking-wider font-bold text-muted mb-1">Vista previa con datos de ejemplo</p>
            <p className="font-bold mb-2">{preview.subject_rendered}</p>
            <div className="bg-white rounded-xl border border-line p-4 text-sm" dangerouslySetInnerHTML={{ __html: preview.body_html_rendered }} />
          </div>
        )}
      </div>
    </div>
  );
}
