'use client';

import { useEffect, useRef } from 'react';

interface Props {
  lat: number | null;
  lng: number | null;
  onMapClick: (lat: number, lng: number) => void;
  initialCenter?: { lat: number; lng: number };
}

export default function LeafletMap({ lat, lng, onMapClick, initialCenter }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    // Importar leaflet solo en browser
    import('leaflet').then((L) => {
      if (cancelled || !containerRef.current) return;

      // React StrictMode en dev monta dos veces → si el container ya tiene
      // `_leaflet_id` de un mount previo, limpiamos esa marca para evitar
      // "Map container is already initialized."
      const el = containerRef.current as any;
      if (el._leaflet_id) {
        try { delete el._leaflet_id; } catch { el._leaflet_id = undefined; }
      }

      const icon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      const fallback = initialCenter ?? { lat: 19.4326, lng: -99.1332 };
      const center: [number, number] = lat && lng ? [lat, lng] : [fallback.lat, fallback.lng];
      const zoom = lat && lng ? 16 : initialCenter ? 15 : 12;

      const map = L.map(containerRef.current!, { scrollWheelZoom: false }).setView(center, zoom);
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      if (lat && lng) {
        const marker = L.marker([lat, lng], { icon, draggable: true }).addTo(map);
        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          onMapClick(pos.lat, pos.lng);
        });
        markerRef.current = marker;
      }

      map.on('click', (e: any) => {
        const { lat: clickLat, lng: clickLng } = e.latlng;
        if (markerRef.current) {
          markerRef.current.setLatLng([clickLat, clickLng]);
        } else {
          markerRef.current = L.marker([clickLat, clickLng], { icon, draggable: true }).addTo(map);
          markerRef.current.on('dragend', () => {
            const pos = markerRef.current.getLatLng();
            onMapClick(pos.lat, pos.lng);
          });
        }
        onMapClick(clickLat, clickLng);
      });
    });

    return () => {
      cancelled = true;
      try {
        mapRef.current?.off();
        mapRef.current?.remove();
      } catch { /* ignore */ }
      mapRef.current = null;
      markerRef.current = null;
      // Limpiamos la marca _leaflet_id que deja Leaflet en el div
      if (containerRef.current) {
        const el = containerRef.current as any;
        if (el._leaflet_id) {
          try { delete el._leaflet_id; } catch { el._leaflet_id = undefined; }
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Actualizar o crear marker cuando cambian lat/lng desde fuera
  useEffect(() => {
    if (!mapRef.current || !lat || !lng) return;

    import('leaflet').then((L) => {
      const icon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = L.marker([lat, lng], { icon, draggable: true }).addTo(mapRef.current);
        markerRef.current.on('dragend', () => {
          const pos = markerRef.current.getLatLng();
          onMapClick(pos.lat, pos.lng);
        });
      }
      mapRef.current.setView([lat, lng], 16);
    });
  }, [lat, lng]);

  return <div ref={containerRef} className="h-full w-full" />;
}
