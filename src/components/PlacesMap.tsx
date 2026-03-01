import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Maximize2 } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';


interface Place {
  latitude: number;
  longitude: number;
  name: string;
  link?: string | null;
}

function MapContent({ places, containerRef }: { places: Place[]; containerRef: React.RefObject<HTMLDivElement> }) {
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || places.length === 0) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

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
  }, [places, containerRef]);

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
          className="max-w-none w-screen h-screen p-0 border-none bg-black"
          style={{ borderRadius: 0 }}
        >
          <div ref={fullscreenMapRef} className="w-full h-full" />
          {isFullscreen && <MapContent places={places} containerRef={fullscreenMapRef} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
