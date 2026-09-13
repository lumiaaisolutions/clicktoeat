'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { api } from '@/lib/api';
import type { LocalAdmin, Resource } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { QRCode, downloadQR } from '@/components/ui/QRCode';
import { Icon } from '@/components/ui/Icon';
import { toast } from '@/store/toast';
import { cn } from '@/lib/utils';

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

const TEMAS = [
  { key: 'marca', label: 'Tu marca' },
  { key: 'mono', label: 'Blanco y negro' },
  { key: 'custom', label: 'Personalizado' },
] as const;

export default function QRPage() {
  const [local, setLocal] = useState<LocalAdmin | null>(null);
  const [tema,         setTema]         = useState<'marca' | 'mono' | 'custom'>('marca');
  const [customFg,     setCustomFg]     = useState('#0B0B0F');
  const [customBg,     setCustomBg]     = useState('#FFFFFF');
  const [copied,       setCopied]       = useState(false);
  const reduce = useReducedMotion();
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    api.get<Resource<LocalAdmin>>('/local').then(({ data }) => setLocal(data.data));
  }, []);
  useEffect(() => () => { if (copyTimer.current) clearTimeout(copyTimer.current); }, []);

  if (!local) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-80" />
      </div>
    );
  }

  const url        = local.public_url;
  const prettyUrl  = url.replace(/^https?:\/\//, '');
  const colorPlot  = tema === 'marca'  ? local.color_primario
                   : tema === 'custom' ? customFg
                   : '#0B0B0F';
  const bgPlot     = tema === 'marca'  ? local.color_fondo
                   : tema === 'custom' ? customBg
                   : '#FFFFFF';
  const filename   = `qr-${local.slug}.png`;

  const handleDownload = async () => {
    try {
      await downloadQR(url, filename, { size: 1200, color: colorPlot, background: bgPlot });
      toast.success(`QR descargado como ${filename}`);
    } catch {
      toast.error('No se pudo generar el archivo');
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error('No se pudo copiar el link');
    }
  };

  return (
    <div>
      <AdminPageHeader
        kicker="Código QR"
        kickerIcon="qr-code"
        title="Tu QR para"
        titleAccent="imprimir y pegar."
        description="Tus clientes lo escanean con la cámara del celular y van directo a tu menú."
        tourSlug="qr"
      />

      {/* Tarjeta de link — protagonista, con copiar animado */}
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-[#FFFBF7] to-white p-4 sm:p-5 mb-6 print:hidden"
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="shrink-0 grid place-items-center w-11 h-11 rounded-xl bg-[color:var(--ce-accent,#F26A1F)]/12 text-[color:var(--ce-accent,#F26A1F)]">
            <Icon name="arrow-up-right" size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-wider text-muted">El link de tu local</p>
            <a href={url} target="_blank" rel="noopener noreferrer"
              className="block text-lg font-semibold text-ink truncate hover:text-[color:var(--ce-accent,#F26A1F)] transition-colors">
              {prettyUrl}
            </a>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <motion.button
              type="button"
              onClick={handleCopy}
              whileTap={reduce ? undefined : { scale: 0.96 }}
              aria-label="Copiar link"
              className={cn(
                'relative inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold min-w-[120px] transition-colors outline-none',
                'focus-visible:ring-2 focus-visible:ring-[color:var(--ce-accent,#F26A1F)] focus-visible:ring-offset-2',
                copied ? 'bg-emerald-600 text-white' : 'bg-ink text-white hover:bg-ink/90',
              )}
            >
              {copied ? (
                <motion.span key="ok" className="inline-flex items-center gap-1.5"
                  initial={reduce ? false : { scale: 0.8 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 18 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" {...S}><path d="M20 6 9 17l-5-5" /></svg>
                  ¡Copiado!
                </motion.span>
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <Icon name="copy" size={16} />
                  Copiar
                </span>
              )}
            </motion.button>
            <a href={url} target="_blank" rel="noopener noreferrer"
              aria-label="Abrir landing"
              className="inline-grid place-items-center w-11 h-11 rounded-xl border border-line text-ink/70 hover:text-ink hover:border-ink/25 transition-colors">
              <Icon name="arrow-up-right" size={18} />
            </a>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tarjeta imprimible — esta es la que se ve y descarga */}
        <div className="lg:col-span-2">
          <p className="text-xs uppercase tracking-wider text-muted mb-2">Vista previa imprimible</p>

          <motion.div
            id="qr-printable"
            data-tour="qr-preview"
            initial={reduce ? false : { opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-3xl shadow-soft overflow-hidden mx-auto print:shadow-none print:border-0"
            style={{
              background: bgPlot,
              border: `1px solid ${colorPlot}33`,
              maxWidth: 420,
            }}
          >
            <div
              className="px-6 py-5 text-center"
              style={{ background: colorPlot, color: '#FFFFFF' }}
            >
              <p className="ce-display text-2xl font-bold leading-tight">{local.nombre}</p>
              {local.tagline && <p className="text-xs opacity-90 mt-1 line-clamp-1">{local.tagline}</p>}
            </div>

            <div className="p-6 grid place-items-center">
              {/* el QR se re-anima al cambiar de tema/color */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${colorPlot}-${bgPlot}`}
                  initial={reduce ? false : { opacity: 0, scale: 0.9, rotate: -3 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                >
                  <QRCode value={url} size={280} color={colorPlot} background={bgPlot} framed />
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="px-6 pb-6 text-center">
              <p className="ce-display font-bold text-lg leading-tight" style={{ color: colorPlot }}>
                Escanea para pedir
              </p>
              <p className="text-xs mt-1 break-all opacity-70" style={{ color: colorPlot }}>
                {prettyUrl}
              </p>
            </div>
          </motion.div>
        </div>

        {/* Controles */}
        <aside className="space-y-4 print:hidden">
          <div className="rounded-2xl border border-line bg-white p-4">
            <p className="text-xs uppercase tracking-wider text-muted mb-3">Tema</p>

            {/* segmented control con indicador que se desliza */}
            <div data-tour="qr-tema" className="relative grid grid-cols-3 gap-1 p-1 rounded-2xl bg-line/30">
              {TEMAS.map((t) => {
                const active = tema === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTema(t.key)}
                    aria-pressed={active}
                    className={cn(
                      'relative isolate px-2 py-2 rounded-xl text-xs font-semibold transition-colors min-h-[40px]',
                      active ? 'text-white' : 'text-ink/70 hover:text-ink',
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="qr-tema-active"
                        transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 480, damping: 38 }}
                        className="absolute inset-0 -z-10 rounded-xl bg-ink shadow-sm"
                      />
                    )}
                    {t.label}
                  </button>
                );
              })}
            </div>

            <AnimatePresence initial={false}>
              {tema === 'custom' && (
                <motion.div
                  initial={reduce ? false : { height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-muted block mb-1.5">Color del QR</label>
                      <div className="flex gap-2">
                        <input type="color" value={customFg} onChange={(e) => setCustomFg(e.target.value)} className="h-10 w-12 rounded-xl border border-line cursor-pointer" />
                        <input type="text" value={customFg} onChange={(e) => setCustomFg(e.target.value)} maxLength={7} className="flex-1 px-3 rounded-xl border border-line text-sm" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted block mb-1.5">Color de fondo</label>
                      <div className="flex gap-2">
                        <input type="color" value={customBg} onChange={(e) => setCustomBg(e.target.value)} className="h-10 w-12 rounded-xl border border-line cursor-pointer" />
                        <input type="text" value={customBg} onChange={(e) => setCustomBg(e.target.value)} maxLength={7} className="flex-1 px-3 rounded-xl border border-line text-sm" />
                      </div>
                    </div>

                    {/* Paletas sugeridas */}
                    <div>
                      <label className="text-xs font-semibold text-muted block mb-1.5">Sugerencias</label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          { fg: '#0B0B0F', bg: '#FFFFFF', name: 'Clásico' },
                          { fg: '#F26A1F', bg: '#FFF7F4', name: 'Cálido' },
                          { fg: '#FFFFFF', bg: '#0B0B0F', name: 'Inverso' },
                          { fg: '#1A5D3A', bg: '#F0FAF5', name: 'Verde' },
                          { fg: '#1E3A8A', bg: '#EFF6FF', name: 'Azul' },
                          { fg: '#9333EA', bg: '#FAF5FF', name: 'Morado' },
                          { fg: '#D97706', bg: '#FFFBEB', name: 'Mostaza' },
                          { fg: '#831843', bg: '#FDF2F8', name: 'Vino' },
                        ].map((p) => (
                          <motion.button
                            key={p.name}
                            type="button"
                            whileHover={reduce ? undefined : { scale: 1.08 }}
                            whileTap={{ scale: 0.94 }}
                            onClick={() => { setCustomFg(p.fg); setCustomBg(p.bg); }}
                            title={p.name}
                            className="aspect-square rounded-lg border border-line hover:border-ink/40 transition overflow-hidden grid grid-cols-2"
                          >
                            <span style={{ background: p.bg }} />
                            <span style={{ background: p.fg }} />
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <p className="text-xs text-muted mt-3">
              <strong>Tip:</strong> mantén buen contraste entre color y fondo. Los QR oscuros sobre claro escanean mejor.
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-white p-4">
            <p className="text-xs uppercase tracking-wider text-muted mb-2">Acciones</p>
            <div className="space-y-2">
              <Button data-tour="qr-descargar" onClick={handleDownload} className="w-full inline-flex items-center justify-center gap-2">
                <Icon name="download" size={16} />
                Descargar PNG ({1200}px)
              </Button>
              <Button data-tour="qr-imprimir" variant="secondary" onClick={() => window.print()} className="w-full inline-flex items-center justify-center gap-2">
                <Icon name="qr-code" size={16} />
                Imprimir
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-line/20 p-4 text-xs text-muted">
            <p className="font-medium text-ink mb-1">¿Cómo lo uso?</p>
            <ol className="list-decimal pl-4 space-y-1">
              <li>Descarga el PNG o imprime esta página.</li>
              <li>Pega el cartel en tu mostrador, mesa o ventana.</li>
              <li>El cliente escanea con la cámara y abre tu menú al instante.</li>
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
}
