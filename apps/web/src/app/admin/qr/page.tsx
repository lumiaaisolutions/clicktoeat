'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { LocalAdmin, Resource } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { QRCode, downloadQR } from '@/components/ui/QRCode';
import { Icon } from '@/components/ui/Icon';
import { toast } from '@/store/toast';

export default function QRPage() {
  const [local, setLocal] = useState<LocalAdmin | null>(null);
  const [tema,         setTema]         = useState<'marca' | 'mono' | 'custom'>('marca');
  const [customFg,     setCustomFg]     = useState('#0B0B0F');
  const [customBg,     setCustomBg]     = useState('#FFFFFF');

  useEffect(() => {
    api.get<Resource<LocalAdmin>>('/local').then(({ data }) => setLocal(data.data));
  }, []);

  if (!local) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-80" />
      </div>
    );
  }

  const url        = local.public_url;
  const colorPlot = tema === 'marca'  ? local.color_primario
                  : tema === 'custom' ? customFg
                  : '#0B0B0F';
  const bgPlot    = tema === 'marca'  ? local.color_fondo
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
      toast.success('Link copiado al portapapeles');
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tarjeta imprimible — esta es la que se ve y descarga */}
        <div className="lg:col-span-2">
          <p className="text-xs uppercase tracking-wider text-muted mb-2">Vista previa imprimible</p>

          <div
            id="qr-printable"
            className="rounded-3xl shadow-soft overflow-hidden mx-auto print:shadow-none print:border-0"
            style={{
              background: bgPlot,
              border: `1px solid ${colorPlot}33`,
              maxWidth: 420,
            }}
          >
            <div
              className="px-6 py-5 text-center"
              style={{
                background: colorPlot,
                color: '#FFFFFF',
              }}
            >
              <p className="ce-display text-2xl font-bold leading-tight">{local.nombre}</p>
              {local.tagline && <p className="text-xs opacity-90 mt-1 line-clamp-1">{local.tagline}</p>}
            </div>

            <div className="p-6 grid place-items-center">
              <QRCode
                value={url}
                size={280}
                color={colorPlot}
                background={bgPlot}
                framed
              />
            </div>

            <div className="px-6 pb-6 text-center">
              <p
                className="ce-display font-bold text-lg leading-tight"
                style={{ color: colorPlot }}
              >
                Escanea para pedir
              </p>
              <p className="text-xs mt-1 break-all opacity-70" style={{ color: colorPlot }}>
                {url.replace(/^https?:\/\//, '')}
              </p>
            </div>
          </div>
        </div>

        {/* Controles */}
        <aside className="space-y-4 print:hidden">
          <div className="rounded-2xl border border-line bg-white p-4">
            <p className="text-xs uppercase tracking-wider text-muted mb-3">Tema</p>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setTema('marca')}
                className={`px-2 py-2 rounded-xl text-xs font-medium border transition ${
                  tema === 'marca' ? 'bg-ink text-white border-transparent' : 'bg-white border-line hover:border-ink/40'
                }`}
              >
                Tu marca
              </button>
              <button
                onClick={() => setTema('mono')}
                className={`px-2 py-2 rounded-xl text-xs font-medium border transition ${
                  tema === 'mono' ? 'bg-ink text-white border-transparent' : 'bg-white border-line hover:border-ink/40'
                }`}
              >
                Blanco y negro
              </button>
              <button
                onClick={() => setTema('custom')}
                className={`px-2 py-2 rounded-xl text-xs font-medium border transition ${
                  tema === 'custom' ? 'bg-ink text-white border-transparent' : 'bg-white border-line hover:border-ink/40'
                }`}
              >
                Personalizado
              </button>
            </div>

            {tema === 'custom' && (
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
                      { fg: '#FF2D2D', bg: '#FFF7F4', name: 'Cálido' },
                      { fg: '#FFFFFF', bg: '#0B0B0F', name: 'Inverso' },
                      { fg: '#1A5D3A', bg: '#F0FAF5', name: 'Verde' },
                      { fg: '#1E3A8A', bg: '#EFF6FF', name: 'Azul' },
                      { fg: '#9333EA', bg: '#FAF5FF', name: 'Morado' },
                      { fg: '#D97706', bg: '#FFFBEB', name: 'Mostaza' },
                      { fg: '#831843', bg: '#FDF2F8', name: 'Vino' },
                    ].map((p) => (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => { setCustomFg(p.fg); setCustomBg(p.bg); }}
                        title={p.name}
                        className="aspect-square rounded-lg border border-line hover:border-ink/40 transition overflow-hidden grid grid-cols-2"
                      >
                        <span style={{ background: p.bg }} />
                        <span style={{ background: p.fg }} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <p className="text-xs text-muted mt-3">
              <strong>Tip:</strong> mantén buen contraste entre color y fondo. Los QR oscuros sobre claro escanean mejor.
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-white p-4">
            <p className="text-xs uppercase tracking-wider text-muted mb-2">Acciones</p>
            <div className="space-y-2">
              <Button onClick={handleDownload} className="w-full inline-flex items-center justify-center gap-2">
                <Icon name="download" size={16} />
                Descargar PNG ({1200}px)
              </Button>
              <Button variant="secondary" onClick={() => window.print()} className="w-full inline-flex items-center justify-center gap-2">
                <Icon name="qr-code" size={16} />
                Imprimir
              </Button>
              <Button variant="secondary" onClick={handleCopy} className="w-full inline-flex items-center justify-center gap-2">
                <Icon name="copy" size={16} />
                Copiar link
              </Button>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center px-4 py-2 rounded-xl border border-line text-sm hover:bg-line/30 inline-flex items-center justify-center gap-2"
              >
                <Icon name="arrow-up-right" size={16} />
                Abrir landing en otra pestaña
              </a>
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
