'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

interface DetallePedido {
  id: number;
  producto_nombre: string;
  cantidad: number;
  notas: string | null;
  extras_seleccionados?: Array<{ group: string; item: string }> | null;
}

interface Pedido {
  id: number;
  codigo: string;
  mesa?: { etiqueta: string } | null;
  detalles: DetallePedido[];
  created_at: string;
  notas: string | null;
}

/**
 * Comanda imprimible vía navegador (Ctrl+P / window.print()) — sin
 * integración ESC/POS de hardware, ver plan-499-operacion-salon-implementacion.md.
 * Cualquier impresora con driver del sistema operativo funciona.
 */
export default function ComandaPage() {
  const params = useParams<{ id: string }>();
  const [pedido, setPedido] = useState<Pedido | null>(null);

  useEffect(() => {
    api.get<{ data: Pedido }>(`/pedidos/${params.id}`).then(({ data }) => setPedido(data.data));
  }, [params.id]);

  if (!pedido) {
    return <div className="p-6"><Skeleton className="h-64" /></div>;
  }

  return (
    <div className="max-w-sm mx-auto p-6 print:p-0">
      <div className="print:hidden mb-4 flex justify-end">
        <Button onClick={() => window.print()}>Imprimir</Button>
      </div>
      <div className="font-mono text-sm border border-dashed border-line p-4 print:border-0">
        <p className="text-center font-bold text-base mb-2">COMANDA</p>
        <p className="text-center mb-2">{pedido.mesa?.etiqueta ?? pedido.codigo}</p>
        <p className="text-center text-xs mb-3">{new Date(pedido.created_at).toLocaleString('es-MX')}</p>
        <hr className="border-dashed my-2" />
        {pedido.detalles.map((d) => (
          <div key={d.id} className="mb-2">
            <p>{d.cantidad}x {d.producto_nombre}</p>
            {d.extras_seleccionados?.map((e, i) => (
              <p key={i} className="text-xs pl-3">+ {e.item}</p>
            ))}
            {d.notas && <p className="text-xs pl-3 italic">"{d.notas}"</p>}
          </div>
        ))}
        {pedido.notas && (
          <>
            <hr className="border-dashed my-2" />
            <p className="text-xs">Nota general: {pedido.notas}</p>
          </>
        )}
      </div>
    </div>
  );
}
