'use client';

import { useRef, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { createPortal } from 'react-dom';
import 'leaflet/dist/leaflet.css';

export interface LocationValue {
  direccion: string;
  lat: number | null;
  lng: number | null;
}

interface Props {
  value: LocationValue;
  onChange: (v: LocationValue) => void;
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
}

const LeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => <div className="h-52 rounded-xl border border-line bg-line/30 animate-pulse" />,
});

export function LocationPicker({ value, onChange }: Props) {
  const [query, setQuery] = useState(value.direccion ?? '');
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [open, setOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = (q: string) => {
    if (q.length < 3) { setSuggestions([]); setOpen(false); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&accept-language=es`,
        );
        const data: NominatimResult[] = await res.json();
        setSuggestions(data);
        if (data.length > 0 && inputRef.current) {
          setRect(inputRef.current.getBoundingClientRect());
          setOpen(true);
        }
      } catch { /* ignore */ }
    }, 400);
  };

  const pick = (item: NominatimResult) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    setQuery(item.display_name);
    setSuggestions([]);
    setOpen(false);
    onChange({ direccion: item.display_name, lat, lng });
  };

  const handleMapClick = (lat: number, lng: number) => {
    onChange({ ...value, lat, lng });
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=es`)
      .then((r) => r.json())
      .then((data) => {
        const dir = data.display_name ?? '';
        setQuery(dir);
        onChange({ direccion: dir, lat, lng });
      })
      .catch(() => {});
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handleMapClick(pos.coords.latitude, pos.coords.longitude);
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 8000 },
    );
  };

  // Actualiza rect si la ventana cambia de tamaño con el dropdown abierto
  useEffect(() => {
    if (!open) return;
    const update = () => {
      if (inputRef.current) setRect(inputRef.current.getBoundingClientRect());
    };
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open]);

  const dropdown = open && suggestions.length > 0 && rect ? createPortal(
    <ul
      style={{
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 99999,
        maxHeight: '13rem',
        overflowY: 'auto',
      }}
      className="bg-white border border-line rounded-xl shadow-xl"
    >
      {suggestions.map((s, i) => (
        <li
          key={i}
          onMouseDown={(e) => { e.preventDefault(); pick(s); }}
          className="px-3 py-2 text-sm cursor-pointer hover:bg-amber-50 border-b border-line last:border-0"
        >
          {s.display_name}
        </li>
      ))}
    </ul>,
    document.body,
  ) : null;

  return (
    <div className="space-y-3">
      {/* Buscador */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); search(e.target.value); }}
          onFocus={() => {
            if (suggestions.length > 0 && inputRef.current) {
              setRect(inputRef.current.getBoundingClientRect());
              setOpen(true);
            }
          }}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder="Coloca tu dirección completa..."
          className="w-full px-3 py-2 border border-line rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        {dropdown}
      </div>

      {/* Botón ubicación */}
      <button
        type="button"
        onClick={useMyLocation}
        disabled={locating}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-line text-sm text-muted hover:bg-line/30 disabled:opacity-50"
      >
        {locating ? '⏳ Obteniendo ubicación...' : '📍 Usar mi ubicación aproximada'}
      </button>
      <p className="text-xs text-muted">Ajusta el punto en el mapa para mayor precisión.</p>

      {/* Mapa */}
      <div className="h-52 rounded-xl overflow-hidden border border-line">
        <LeafletMap lat={value.lat} lng={value.lng} onMapClick={handleMapClick} />
      </div>

      {value.lat && value.lng && (
        <p className="text-[11px] text-muted font-mono">
          {value.lat.toFixed(6)}, {value.lng.toFixed(6)}
        </p>
      )}
    </div>
  );
}
