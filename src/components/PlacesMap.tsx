import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Place {
  latitude: number;
  longitude: number;
  name: string;
  link?: string | null;
}

export function PlacesMap({ places }: { places: Place[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || places.length === 0) return;

    // Clean up previous instance
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
    });
    mapInstanceRef.current = map;

    // Satellite tiles
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 18 }
    ).addTo(map);

    // City/road labels overlay
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 18, pane: 'overlayPane' }
    ).addTo(map);

    // Green pin marker (same color as "Eintrag hinzufügen") with exact tip anchor
    const icon = L.divIcon({
      className: '',
      html: `
        <div style="position:relative;width:20px;height:30px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.35));">
          <div style="position:absolute;left:0;top:0;width:20px;height:20px;background:#5AD940;border:2px solid white;border-radius:9999px;"></div>
          <div style="position:absolute;left:8px;top:18px;width:0;height:0;border-left:2px solid transparent;border-right:2px solid transparent;border-top:10px solid #5AD940;"></div>
        </div>
      `,
      iconSize: [20, 30],
      iconAnchor: [10, 30],
    });

    const markers = places.map(p => {
      const marker = L.marker([p.latitude, p.longitude], { icon }).addTo(map);
      const url = p.link || `https://www.google.com/maps/search/?api=1&query=${p.latitude},${p.longitude}`;
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
  }, [places]);

  return <div ref={mapRef} className="w-full h-full" />;
}
