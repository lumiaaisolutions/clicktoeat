'use client';

import Link from 'next/link';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';

/**
 * F100e — Sucursales (multi-local). Feature del plan Premium.
 *
 * Por ahora es una página informativa: en Premium el owner puede agregar
 * sucursales adicionales a su cuenta principal y administrarlas desde un
 * mismo panel con switcher. El backend ya soporta multi-local nativamente
 * (cada Local es independiente), lo que falta es la UI para que el owner
 * cree/dé alta sucursales sin pasar por el super_admin.
 *
 * Hasta que esa UI exista, mostramos esta pantalla con qué obtienes,
 * cómo solicitar el alta de una sucursal, y un CTA al soporte.
 */
export default function SucursalesPage() {
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
          soporte. Mándanos un mensaje con el nombre, dirección y WhatsApp
          de la nueva sucursal y la dejamos lista en menos de 24h.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/ayuda">
            <Button variant="primary">
              <Icon name="message-circle" size={16} />
              Abrir solicitud de soporte
            </Button>
          </Link>
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
    </div>
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
