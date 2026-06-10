'use client';

import { useRef, useState } from 'react';
import { api } from '@/lib/api';
import type { UploadResult, Resource } from '@/lib/types';
import { toast } from '@/store/toast';
import { cn } from '@/lib/utils';

interface Props {
  value: string | null;            // URL actual
  publicId?: string | null;        // public_id actual (para auditoría)
  folder?: 'productos' | 'logos' | 'banners' | 'locales';
  aspect?: 'square' | 'wide' | 'tall';
  onChange: (next: { url: string | null; public_id: string | null }) => void;
}

export function ImageUpload({
  value, publicId, folder = 'productos', aspect = 'square', onChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  const aspectClass = {
    square: 'aspect-square',
    wide:   'aspect-[16/9]',
    tall:   'aspect-[3/4]',
  }[aspect];

  const handleFile = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen no puede pesar más de 5 MB.');
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      fd.append('folder', folder);
      // No fijes Content-Type aquí: axios + el browser lo arman con el
      // boundary correcto a partir del FormData. Forzarlo a "multipart/form-data"
      // sin boundary hace que Laravel no parsee el body y devuelva 422.
      const { data } = await api.post<Resource<UploadResult>>('/uploads/image', fd);
      onChange({ url: data.data.url, public_id: data.data.public_id });
      toast.success('Imagen subida');
    } catch (err: any) {
      const msg = err?.response?.data?.errors?.image?.[0] ?? err?.response?.data?.message ?? 'No se pudo subir';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div
        className={cn(
          'relative w-full rounded-2xl border-2 border-dashed border-line bg-white overflow-hidden',
          aspectClass,
        )}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
        onDragOver={(e) => e.preventDefault()}
      >
        {value ? (
          <>
            <img src={value} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onChange({ url: null, public_id: null })}
              className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-8 h-8"
              aria-label="Quitar imagen"
            >
              ✕
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={loading}
            className="absolute inset-0 grid place-items-center text-sm text-muted hover:bg-line/30 transition"
          >
            {loading ? 'Subiendo…' : 'Arrastra o haz clic para subir'}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />
      {publicId && (
        <p className="text-[10px] text-muted mt-1 font-mono truncate">{publicId}</p>
      )}
    </div>
  );
}
