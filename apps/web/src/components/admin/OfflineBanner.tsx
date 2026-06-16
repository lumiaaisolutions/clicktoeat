'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { count, flushPending } from '@/lib/pos-offline';
import { toast } from '@/store/toast';

/**
 * Banner persistente que avisa cuando la caja está offline o cuando
 * tiene pedidos pendientes de sincronizar. Cuando vuelve internet,
 * intenta despacharlos automáticamente.
 */
export function OfflineBanner({ onSynced }: { onSynced?: () => void }) {
  const [online,  setOnline]  = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pending, setPending] = useState<number>(0);
  const [syncing, setSyncing] = useState(false);

  // Listeners de online/offline
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online',  up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online',  up);
      window.removeEventListener('offline', down);
    };
  }, []);

  // Polling del contador local cada 2s
  useEffect(() => {
    const tick = () => setPending(count());
    tick();
    const id = setInterval(tick, 2000);
    return () => clearInterval(id);
  }, []);

  // Auto-sync cuando vuelve internet o cambia el contador y hay conexión
  useEffect(() => {
    if (!online || pending === 0 || syncing) return;
    void doSync();
  }, [online, pending]); // eslint-disable-line

  const doSync = async () => {
    setSyncing(true);
    try {
      const { ok, failed } = await flushPending();
      if (ok > 0) toast.success(`Sincronizados ${ok} pedidos`);
      failed.forEach((f) => toast.error(`Pedido pendiente: ${f.error}`));
      onSynced?.();
    } finally {
      setSyncing(false);
      setPending(count());
    }
  };

  if (online && pending === 0) return null;

  return (
    <div className={`mb-4 rounded-2xl border px-4 py-3 flex items-center gap-3 ${
      online ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-red-300 bg-red-50 text-red-900'
    }`}>
      <span className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${
        online ? 'bg-amber-200 text-amber-800' : 'bg-red-200 text-red-800'
      }`}>
        <Icon name={online ? 'sparkles' : 'alert-triangle'} size={16} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold">
          {online ? `${pending} pedido(s) pendientes de sincronizar` : 'Sin conexión — modo offline'}
        </p>
        <p className="text-xs opacity-80">
          {online
            ? 'Tus cobros se mandan al servidor al instante.'
            : 'Puedes seguir cobrando: tus pedidos se guardan localmente y se mandan cuando vuelva la conexión.'}
        </p>
      </div>
      {online && pending > 0 && (
        <button
          type="button"
          onClick={doSync}
          disabled={syncing}
          className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 disabled:opacity-50"
        >
          {syncing ? 'Enviando…' : 'Sincronizar ahora'}
        </button>
      )}
    </div>
  );
}
