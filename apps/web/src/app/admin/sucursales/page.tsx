'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { toast } from '@/store/toast';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Field, Textarea } from '@/components/ui/FormField';

/**
 * F100e — Sucursales (multi-local). Feature del plan Premium.
 *
 * El alta de sucursales se hace con apoyo de soporte. El CTA "Abrir solicitud
 * de soporte" ahora CREA un ticket real (POST /soporte/tickets) que el super
 * admin ve en /admin/tickets (+ push), en vez de solo mandar al centro de ayuda.
 */
export default function SucursalesPage() {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        kicker="Sucursales"
        kickerIcon="store"
        title="Tu cadena,"
        titleAccent="bajo un mismo panel."
        description="Administra múltiples ubicaciones del mismo negocio sin abrir cuentas separadas. Cada sucursal tiene su propio menú, horarios e inventario, pero compartes reportes y branding."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Benefit
          icon="storefront"
          title="Una cuenta, varias sucursales"
          desc="Cambia entre ubicaciones desde el switcher arriba del sidebar, sin re-loguearte."
        />
        <Benefit
          icon="chart"
          title="Reportes consolidados"
          desc="Ve ventas totales de toda la cadena o por sucursal individual."
        />
        <Benefit
          icon="palette"
          title="Branding heredado"
          desc="Define la identidad de tu marca una vez y cada sucursal la hereda."
        />
      </div>

      <div className="rounded-2xl border border-line bg-white p-6">
        <h2 className="ce-display font-bold text-xl mb-2">¿Cómo agrego una sucursal nueva?</h2>
        <p className="text-sm text-muted mb-4">
          Por ahora, el alta de sucursales se hace con apoyo del equipo de
          soporte. Envía la solicitud con el nombre, dirección y WhatsApp
          de la nueva sucursal y la dejamos lista en menos de 24h.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => setOpen(true)}>
            <Icon name="message-circle" size={16} />
            Abrir solicitud de soporte
          </Button>
          <a
            href="https://wa.me/525555555555?text=Hola%2C%20quiero%20dar%20de%20alta%20una%20sucursal%20nueva%20a%20mi%20cuenta%20ClickToEat."
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="secondary">
              <Icon name="whatsapp" size={16} />
              Escribir por WhatsApp
            </Button>
          </a>
        </div>
      </div>

      <SolicitudSucursalModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

function SolicitudSucursalModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [nombre, setNombre] = useState('');
  const [direccion, setDireccion] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [notas, setNotas] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const mensaje =
        `Solicitud de alta de sucursal nueva:\n\n` +
        `• Nombre: ${nombre}\n` +
        `• Dirección: ${direccion}\n` +
        `• WhatsApp: ${whatsapp}` +
        (notas ? `\n• Notas: ${notas}` : '');
      await api.post('/soporte/tickets', {
        asunto: `Alta de sucursal: ${nombre}`,
        categoria: 'sucursal',
        prioridad: 'normal',
        mensaje,
      });
      toast.success('Solicitud enviada al equipo. Te contactamos en menos de 24h.');
      setNombre(''); setDireccion(''); setWhatsapp(''); setNotas('');
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'No se pudo enviar la solicitud');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Solicitar alta de sucursal">
      <form onSubmit={submit} className="space-y-4">
        <div className="rounded-xl bg-[color:var(--ce-accent,#F26A1F)]/8 border border-[color:var(--ce-accent,#F26A1F)]/20 p-3 text-sm text-ink/80 flex items-start gap-2">
          <Icon name="sparkles" size={15} className="mt-0.5 shrink-0 text-[color:var(--ce-accent,#F26A1F)]" />
          <span>Esto crea una solicitud que le llega directo a nuestro equipo. La verás en <strong>Soporte</strong> y te respondemos ahí mismo.</span>
        </div>

        <Field label="Nombre de la sucursal" required value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Sucursal Centro" />
        <Field label="Dirección" required value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Calle, número, colonia, ciudad" />
        <Field label="WhatsApp de la sucursal" required value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} hint="Con LADA, sólo dígitos (ej. 5215512345678)" />
        <Textarea label="Notas (opcional)" value={notas} onChange={(e) => setNotas(e.target.value)} maxLength={500} hint="Horario, menú a copiar de otra sucursal, lo que quieras aclarar." />

        <div className="flex justify-end gap-2 pt-3 border-t border-line">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={saving}>
            <Icon name="message-circle" size={15} />
            Enviar solicitud
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function Benefit({ icon, title, desc }: { icon: 'storefront' | 'chart' | 'palette'; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <div className="w-10 h-10 rounded-xl bg-emerald-50 grid place-items-center text-emerald-700 mb-3">
        <Icon name={icon} size={18} />
      </div>
      <h3 className="font-bold text-base">{title}</h3>
      <p className="text-sm text-muted mt-1">{desc}</p>
    </div>
  );
}
