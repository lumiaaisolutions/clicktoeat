export function formatMoney(value: number, currency = 'MXN'): string {
  try {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(Number(value));
  } catch {
    return `$${Number(value).toFixed(2)}`;
  }
}

export function formatRelativeTime(iso: string): string {
  const d = new Date(iso);
  const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diffSec < 60) return 'ahora';
  if (diffSec < 3600) return `hace ${Math.floor(diffSec / 60)}m`;
  if (diffSec < 86400) return `hace ${Math.floor(diffSec / 3600)}h`;
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
}
