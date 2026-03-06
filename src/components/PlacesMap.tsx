import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Maximize2, X, LocateFixed } from 'lucide-react';
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
  const userMarkerRef = useRef<L.Marker | null>(null);

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
      const berlinBounds = L.latLngBounds([52.33, 13.08], [52.68, 13.76]);
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

  // Expose map instance for external use
  (containerRef as any).__mapInstance = mapInstanceRef;
  (containerRef as any).__userMarker = userMarkerRef;

  return null;
}

function useLocateUser(containerRef: React.RefObject<HTMLDivElement>) {
  const [locating, setLocating] = useState(false);

  const locate = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const mapRef = (containerRef as any).__mapInstance as React.MutableRefObject<L.Map | null> | undefined;
        const userMarkerRef = (containerRef as any).__userMarker as React.MutableRefObject<L.Marker | null> | undefined;
        const map = mapRef?.current;
        if (map) {
          map.setView([latitude, longitude], 15);
          if (userMarkerRef) {
            if (userMarkerRef.current) {
              userMarkerRef.current.setLatLng([latitude, longitude]);
            } else {
              const userIcon = L.divIcon({
                className: '',
                html: '<div style="width:14px;height:14px;background:#4A90D9;border:2px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.5)"></div>',
                iconSize: [14, 14],
                iconAnchor: [7, 7],
              });
              userMarkerRef.current = L.marker([latitude, longitude], { icon: userIcon }).addTo(map);
            }
          }
        }
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [containerRef]);

  return { locate, locating };
}

export function PlacesMap({ places }: { places: Place[] }) {
  const inlineMapRef = useRef<HTMLDivElement>(null);
  const fullscreenMapRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { locate: locateInline, locating: locatingInline } = useLocateUser(inlineMapRef);
  const { locate: locateFullscreen, locating: locatingFullscreen } = useLocateUser(fullscreenMapRef);

  const btnStyle = "absolute z-[1000] bg-black text-white w-8 h-8 flex items-center justify-center shadow-lg";

  return (
    <>
      <div className="relative w-full h-full">
        <div ref={inlineMapRef} className="w-full h-full" />
        <MapContent places={places} containerRef={inlineMapRef} />
        <button
          onClick={locateInline}
          className={btnStyle}
          style={{ borderRadius: 4, bottom: 8, right: 44 }}
          disabled={locatingInline}
        >
          <LocateFixed size={14} className={locatingInline ? 'animate-pulse' : ''} />
        </button>
        <button
          onClick={() => setIsFullscreen(true)}
          className={btnStyle}
          style={{ borderRadius: 4, bottom: 8, right: 8 }}
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
            onClick={locateFullscreen}
            className={btnStyle}
            style={{ borderRadius: 4, top: 8, right: 44 }}
            disabled={locatingFullscreen}
          >
            <LocateFixed size={14} className={locatingFullscreen ? 'animate-pulse' : ''} />
          </button>
          <button
            onClick={() => setIsFullscreen(false)}
            className={btnStyle}
            style={{ borderRadius: 4, top: 8, right: 8 }}
          >
            <X size={14} />
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}
