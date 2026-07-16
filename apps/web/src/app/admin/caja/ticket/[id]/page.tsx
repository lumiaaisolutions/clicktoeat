'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

interface Pedido {
  id: number;
  detalles: Array<{ id: number; producto_nombre: string; cantidad: number; precio_unitario: string }>;
}

interface Pago {
  id: number;
  monto: string;
  metodo_pago: string;
}

interface Cuenta {
  id: number;
  mesa: { etiqueta: string } | null;
  subtotal: string;
  descuento_gift_card: string;
  propina_total: string;
  total: string;
  estado: string;
  pedidos: Pedido[];
  pagos: Pago[];
}

/** Ticket de cuenta imprimible vía navegador — ver comanda/[id]/page.tsx. */
export default function TicketPage() {
  const params = useParams<{ id: string }>();
  const [cuenta, setCuenta] = useState<Cuenta | null>(null);

  useEffect(() => {
    api.get<{ data: Cuenta }>(`/cuentas-mesa/${params.id}`).then(({ data }) => setCuenta(data.data));
  }, [params.id]);

  if (!cuenta) {
    return <div className="p-6"><Skeleton className="h-64" /></div>;
  }

  const items = cuenta.pedidos.flatMap((p) => p.detalles);

  return (
    <div className="max-w-sm mx-auto p-6 print:p-0">
      <div className="print:hidden mb-4 flex justify-end">
        <Button onClick={() => window.print()}>Imprimir</Button>
      </div>
      <div className="font-mono text-sm border border-dashed border-line p-4 print:border-0">
        <p className="text-center font-bold text-base mb-2">CUENTA</p>
        <p className="text-center mb-3">{cuenta.mesa?.etiqueta ?? `Cuenta #${cuenta.id}`}</p>
        <hr className="border-dashed my-2" />
        {items.map((d) => (
          <div key={d.id} className="flex justify-between">
            <span>{d.cantidad}x {d.producto_nombre}</span>
            <span>${d.precio_unitario}</span>
          </div>
        ))}
        <hr className="border-dashed my-2" />
        <div className="flex justify-between"><span>Subtotal</span><span>${cuenta.subtotal}</span></div>
        {Number(cuenta.descuento_gift_card) > 0 && (
          <div className="flex justify-between"><span>Gift card</span><span>-${cuenta.descuento_gift_card}</span></div>
        )}
        {Number(cuenta.propina_total) > 0 && (
          <div className="flex justify-between"><span>Propina</span><span>${cuenta.propina_total}</span></div>
        )}
        <div className="flex justify-between font-bold text-base mt-1"><span>Total</span><span>${cuenta.total}</span></div>
        {cuenta.pagos.length > 0 && (
          <>
            <hr className="border-dashed my-2" />
            <p className="text-xs mb-1">Pagos:</p>
            {cuenta.pagos.map((p) => (
              <div key={p.id} className="flex justify-between text-xs">
                <span className="capitalize">{p.metodo_pago}</span>
                <span>${p.monto}</span>
              </div>
            ))}
          </>
        )}
        <p className="text-center text-xs mt-4">¡Gracias por tu visita!</p>
      </div>
    </div>
  );
}
