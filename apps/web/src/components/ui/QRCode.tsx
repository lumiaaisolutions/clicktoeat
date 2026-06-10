'use client';

import { useEffect, useRef, useState } from 'react';
import QRCodeLib from 'qrcode';
import { cn } from '@/lib/utils';

interface Props {
  /** URL o texto a codificar */
  value: string;
  /** Tamaño en px (lado, generamos un cuadrado). Default 256. */
  size?: number;
  /** Color principal del módulo (default ink #0B0B0F) */
  color?: string;
  /** Color de fondo (default blanco). Acepta "transparent". */
  background?: string;
  /** Mostrar contorno y radio en la card */
  framed?: boolean;
  className?: string;
}

/**
 * Renderiza un QR usando la librería `qrcode` (a canvas). Mantiene una
 * referencia que se puede usar para `toDataURL` y descarga.
 *
 * Patrón: el padre puede acceder al canvas vía un ref expuesto en `dataKey`.
 * Para descargar, usa la utility `downloadQR(value, filename)` que regenera
 * el QR fuera del DOM con resolución mayor (lo necesario para imprimir).
 */
export function QRCode({
  value, size = 256, color = '#0B0B0F', background = '#FFFFFF',
  framed = false, className,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError]   = useState<string | null>(null);
  const [ready, setReady]   = useState(false);

  useEffect(() => {
    if (! canvasRef.current) return;
    setReady(false);
    QRCodeLib.toCanvas(
      canvasRef.current,
      value,
      {
        width:  size,
        margin: 1,
        color: { dark: color, light: background === 'transparent' ? '#00000000' : background },
        errorCorrectionLevel: 'M',
      },
      (err) => {
        if (err) {
          setError(err.message);
        } else {
          setError(null);
          setReady(true);
        }
      },
    );
  }, [value, size, color, background]);

  return (
    <div
      className={cn(
        'inline-block',
        framed && 'p-3 rounded-2xl bg-white border border-line shadow-soft',
        className,
      )}
      style={{ background: background === 'transparent' && framed ? undefined : undefined }}
    >
      {error ? (
        <div
          className="grid place-items-center text-xs text-red-600 p-4"
          style={{ width: size, height: size }}
        >
          {error}
        </div>
      ) : (
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          className={cn('block', !ready && 'opacity-0')}
          style={{ width: size, height: size }}
        />
      )}
    </div>
  );
}

/**
 * Descarga un QR como archivo PNG con resolución alta. NO usa el canvas en
 * pantalla — genera uno fuera del DOM con `size` mayor para que se vea nítido
 * impreso.
 */
export async function downloadQR(
  value: string,
  filename = 'qr.png',
  opts: { size?: number; color?: string; background?: string } = {},
): Promise<void> {
  const size  = opts.size ?? 1024;
  const color = opts.color ?? '#0B0B0F';
  const bg    = opts.background ?? '#FFFFFF';

  const dataUrl = await QRCodeLib.toDataURL(value, {
    width:  size,
    margin: 2,
    color: { dark: color, light: bg },
    errorCorrectionLevel: 'M',
  });

  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
