import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Maximize2, X } from 'lucide-react';

interface Place {
  latitude: number;
  longitude: number;
  name: string;
  link?: string | null;
}

export function PlacesMap({ places }: { places: Place[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!mapRef.current || places.length === 0) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
    });
    mapInstanceRef.current = map;

    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 18 }
    ).addTo(map);

    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png',
      { maxZoom: 18, subdomains: 'abcd', pane: 'overlayPane' }
    ).addTo(map);

    const icon = L.divIcon({
      className: '',
      html: '<div style="width:12px;height:12px;background:#5AD940;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.5)"></div>',
      iconSize: [12, 12],
      iconAnchor: [6, 6],
    });

    const markers = places.map(p => {
      const marker = L.marker([p.latitude, p.longitude], { icon }).addTo(map);
      const url = `https://www.google.com/maps/search/?api=1&query=${p.latitude},${p.longitude}`;
      marker.on('click', () => window.open(url, '_blank'));
      return marker;
    });

    if (places.length === 1) {
      map.setView([places[0].latitude, places[0].longitude], 14);
    } else {
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.3));
    }

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [places, isFullscreen]);

  // Invalidate map size after fullscreen transition
  useEffect(() => {
    if (mapInstanceRef.current) {
      setTimeout(() => mapInstanceRef.current?.invalidateSize(), 50);
    }
  }, [isFullscreen]);

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black">
        <div ref={mapRef} className="w-full h-full" />
        <button
          onClick={() => setIsFullscreen(false)}
          className="absolute top-4 right-4 z-[10000] bg-black text-white w-8 h-8 flex items-center justify-center shadow-lg"
          style={{ borderRadius: 4 }}
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />
      <button
        onClick={() => setIsFullscreen(true)}
        className="absolute bottom-2 right-2 z-[1000] bg-black text-white w-8 h-8 flex items-center justify-center shadow-lg"
        style={{ borderRadius: 4 }}
      >
        <Maximize2 size={14} />
      </button>
    </div>
  );
}
