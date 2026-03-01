import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Maximize2, X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';


interface Place {
  latitude: number;
  longitude: number;
  name: string;
  link?: string | null;
}

function MapContent({ places, containerRef }: { places: Place[]; containerRef: React.RefObject<HTMLDivElement> }) {
  const mapInstanceRef = useRef<L.Map | null>(null);
  const placesKeyRef = useRef<string>('');

  useEffect(() => {
    if (!containerRef.current || places.length === 0) return;

    const newKey = places.map(p => `${p.latitude},${p.longitude}`).join('|');
    if (mapInstanceRef.current && newKey === placesKeyRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    placesKeyRef.current = newKey;

    const map = L.map(containerRef.current, {
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

    // Focus on Berlin places only
    const berlinBounds = L.latLngBounds(
      [52.33, 13.08], // SW corner of Berlin
      [52.68, 13.76], // NE corner of Berlin
    );
    const berlinPlaces = places.filter(
      p => p.latitude >= 52.33 && p.latitude <= 52.68 && p.longitude >= 13.08 && p.longitude <= 13.76
    );

    if (berlinPlaces.length > 1) {
      const berlinMarkers = berlinPlaces.map(p => L.marker([p.latitude, p.longitude]));
      const group = L.featureGroup(berlinMarkers);
      map.fitBounds(group.getBounds().pad(0.3));
    } else if (berlinPlaces.length === 1) {
      map.setView([berlinPlaces[0].latitude, berlinPlaces[0].longitude], 14);
    } else {
      map.fitBounds(berlinBounds);
    }
  }, [places, containerRef]);

  useEffect(() => {
    return () => {
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
      placesKeyRef.current = '';
    };
  }, []);

  return null;
}

export function PlacesMap({ places }: { places: Place[] }) {
  const inlineMapRef = useRef<HTMLDivElement>(null);
  const fullscreenMapRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <>
      <div className="relative w-full h-full">
        <div ref={inlineMapRef} className="w-full h-full" />
        <MapContent places={places} containerRef={inlineMapRef} />
        <button
          onClick={() => setIsFullscreen(true)}
          className="absolute bottom-2 right-2 z-[1000] bg-black text-white w-8 h-8 flex items-center justify-center shadow-lg"
          style={{ borderRadius: 4 }}
        >
          <Maximize2 size={14} />
        </button>
      </div>

      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent
          className="max-w-none w-screen h-screen p-0 border-none bg-black [&>button:last-child]:hidden"
          style={{ borderRadius: 0 }}
        >
          <div ref={fullscreenMapRef} className="w-full h-full" />
          {isFullscreen && <MapContent places={places} containerRef={fullscreenMapRef} />}
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-2 right-2 z-[1000] bg-black text-white w-8 h-8 flex items-center justify-center shadow-lg"
            style={{ borderRadius: 4 }}
          >
            <X size={14} />
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}
