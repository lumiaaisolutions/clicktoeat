'use client';

import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';

interface Pin {
  id: number;
  nombre: string;
  ciudad: string | null;
  estado: string | null;
  lat: number;
  lng: number;
  ventas_mes: number;
  pedidos_mes: number;
}

interface Props { pins: Pin[]; }

/**
 * Mapa multi-pin para super_admin /admin/zonas. Pinta cada local con un círculo
 * cuyo radio crece con el volumen de ventas del mes. Cluster simple por ciudad
 * vía color hash.
 */
export default function ZonasMap({ pins }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layerRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    import('leaflet').then((L) => {
      if (cancelled || !containerRef.current) return;

      const el = containerRef.current as any;
      if (el._leaflet_id) { try { delete el._leaflet_id; } catch { el._leaflet_id = undefined; } }

      const map = L.map(containerRef.current!, { scrollWheelZoom: true })
        .setView([23.6345, -102.5528], 5); // Centro de México
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 18,
      }).addTo(map);

      drawPins(L, map, pins);
      layerRef.current = (map as any)._layerGroup ?? null;

      // Fix Leaflet inside flex/grid containers: el tamaño real del div se mide
      // después del primer paint. Sin esto la grilla de tiles queda cortada.
      const fixSize = () => map.invalidateSize();
      setTimeout(fixSize, 0);
      setTimeout(fixSize, 200);
      setTimeout(fixSize, 600);

      // También al cambiar el viewport
      const ro = new ResizeObserver(() => map.invalidateSize());
      ro.observe(containerRef.current!);
      (map as any)._roClickToEat = ro;
    });

    return () => {
      cancelled = true;
      try {
        (mapRef.current as any)?._roClickToEat?.disconnect?.();
        mapRef.current?.off();
        mapRef.current?.remove();
      } catch {}
      mapRef.current = null;
      layerRef.current = null;
      if (containerRef.current) {
        const el = containerRef.current as any;
        if (el._leaflet_id) { try { delete el._leaflet_id; } catch { el._leaflet_id = undefined; } }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redibujar al cambiar pins
  useEffect(() => {
    if (!mapRef.current) return;
    import('leaflet').then((L) => drawPins(L, mapRef.current, pins));
  }, [pins]);

  return <div ref={containerRef} className="h-full w-full rounded-2xl overflow-hidden" />;
}

function drawPins(L: any, map: any, pins: Pin[]) {
  // Limpiar capas previas
  map.eachLayer((layer: any) => {
    if (layer instanceof L.CircleMarker) map.removeLayer(layer);
  });

  if (pins.length === 0) return;
  const max = Math.max(...pins.map((p) => p.ventas_mes), 1);

  const bounds = L.latLngBounds([]);
  for (const p of pins) {
    const radius = 8 + Math.sqrt(p.ventas_mes / max) * 22;
    const color  = colorFor(p.ciudad ?? p.estado ?? '');
    const m = L.circleMarker([p.lat, p.lng], {
      radius, color, weight: 2, fillColor: color, fillOpacity: 0.4,
    }).addTo(map);
    m.bindPopup(
      `<div style="min-width:180px">
        <strong>${escapeHtml(p.nombre)}</strong><br/>
        <small style="opacity:0.7">${escapeHtml(p.ciudad ?? '')}${p.estado ? ', ' + escapeHtml(p.estado) : ''}</small><br/>
        <div style="margin-top:6px">
          <strong>$${p.ventas_mes.toLocaleString('es-MX')}</strong> MXN<br/>
          <small>${p.pedidos_mes} pedidos este mes</small>
        </div>
      </div>`,
    );
    bounds.extend([p.lat, p.lng]);
  }

  try { map.fitBounds(bounds.pad(0.2), { maxZoom: 11 }); } catch {}
}

function colorFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `hsl(${hue},65%,45%)`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c));
}
