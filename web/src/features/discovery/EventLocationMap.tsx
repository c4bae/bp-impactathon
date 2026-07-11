import { useEffect, useRef, useState } from 'react';
import maplibregl, { LngLatBounds } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { EventDetail, TravelMode } from '../../api/client';
import { api } from '../../api/client';

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

export function EventLocationMap({ event }: { event: EventDetail }) {
  const elementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const [status, setStatus] = useState<'idle' | 'locating' | 'routing' | 'ready' | 'denied' | 'error'>('idle');
  const [summary, setSummary] = useState('');
  const [travelMode, setTravelMode] = useState<TravelMode>('walking');

  useEffect(() => {
    if (!elementRef.current || event.location_lat == null || event.location_lng == null) return;
    const map = new maplibregl.Map({
      container: elementRef.current,
      style: MAP_STYLE,
      center: [event.location_lng, event.location_lat],
      zoom: 15,
      pitch: 42,
      bearing: -12,
      attributionControl: { compact: true },
    });
    map.scrollZoom.disable();
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    const pin = document.createElement('div');
    pin.className = 'event-map-pin';
    pin.setAttribute('role', 'img');
    pin.setAttribute('aria-label', `${event.title} location`);
    new maplibregl.Marker({ element: pin, anchor: 'bottom' })
      .setLngLat([event.location_lng, event.location_lat])
      .addTo(map);
    mapRef.current = map;

    return () => {
      mapRef.current = null;
      userMarkerRef.current = null;
      map.remove();
    };
  }, [event.id, event.location_lat, event.location_lng, event.title]);

  if (event.location_lat == null || event.location_lng == null) return null;

  function findRoute() {
    if (travelMode === 'transit') {
      const destination = `${event.location_lat},${event.location_lng}`;
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=transit`, '_blank', 'noopener,noreferrer');
      setSummary('Transit directions opened in Google Maps.');
      setStatus('ready');
      return;
    }
    if (!navigator.geolocation) { setStatus('error'); return; }
    setStatus('locating');
    setSummary('');
    navigator.geolocation.getCurrentPosition(async (position) => {
      const map = mapRef.current;
      if (!map) return;
      const start: [number, number] = [position.coords.longitude, position.coords.latitude];
      const end: [number, number] = [event.location_lng!, event.location_lat!];
      userMarkerRef.current?.remove();
      userMarkerRef.current = new maplibregl.Marker({ color: '#2563eb' }).setLngLat(start).addTo(map);
      setStatus('routing');
      try {
        const route = await api.walkingRoute(start, end, travelMode);
        if (!map.loaded()) await new Promise<void>((resolve) => map.once('load', () => resolve()));
        if (map.getLayer('sidebar-walking-route')) map.removeLayer('sidebar-walking-route');
        if (map.getSource('sidebar-walking-route')) map.removeSource('sidebar-walking-route');
        map.addSource('sidebar-walking-route', {
          type: 'geojson',
          data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: route.coordinates } },
        });
        map.addLayer({
          id: 'sidebar-walking-route', type: 'line', source: 'sidebar-walking-route',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#7c3aed', 'line-width': 6, 'line-opacity': 0.9 },
        });
        const bounds = route.coordinates.reduce(
          (box, coordinate) => box.extend(coordinate), new LngLatBounds(start, start),
        );
        map.fitBounds(bounds, { padding: 45, maxZoom: 16, pitch: 35 });
        const minutes = Math.max(1, Math.round(route.duration_s / 60));
        const distance = route.distance_m < 1000
          ? `${Math.round(route.distance_m)} m`
          : `${(route.distance_m / 1000).toFixed(1)} km`;
        const modeLabel = travelMode === 'walking' ? 'walk' : travelMode === 'cycling' ? 'bike ride' : 'drive';
        setSummary(`${minutes} min ${modeLabel} · ${distance}`);
        setStatus('ready');
      } catch {
        setStatus('error');
      }
    }, (error) => setStatus(error.code === error.PERMISSION_DENIED ? 'denied' : 'error'), {
      enableHighAccuracy: true, timeout: 12_000, maximumAge: 30_000,
    });
  }

  const statusText = status === 'denied'
    ? 'Location permission was denied. Allow it in your browser settings and try again.'
    : status === 'error'
      ? 'A route could not be found. Location requires HTTPS or localhost.'
      : summary;

  return (
    <section aria-labelledby="event-location-heading">
      <h3 id="event-location-heading" className="text-sm font-semibold uppercase tracking-wide text-muted mb-2">
        Location
      </h3>
      <div
        ref={elementRef}
        role="region"
        aria-label={`Map showing ${event.title} at ${event.location_address ?? 'the event location'}`}
        className="h-56 w-full overflow-hidden rounded-2xl border border-black/10"
      />
      <fieldset className="mt-3">
        <legend className="mb-2 text-sm font-medium">Travel by</legend>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {([['walking', 'Walking'], ['cycling', 'Cycling'], ['driving', 'Driving'], ['transit', 'Transit']] as [TravelMode, string][]).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              aria-pressed={travelMode === mode}
              onClick={() => { setTravelMode(mode); setSummary(''); }}
              className={`min-h-[40px] rounded-lg border px-2 text-sm font-medium ${travelMode === mode ? 'border-brand bg-brand-light text-brand-dark' : 'border-black/10 bg-white text-muted'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>
      <button
        type="button"
        onClick={findRoute}
        disabled={status === 'locating' || status === 'routing'}
        className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-brand-light px-5 font-display font-medium text-brand-dark hover:bg-[#d6e9e2] disabled:cursor-wait disabled:opacity-60"
      >
        {status === 'locating' ? 'Finding your location…' : status === 'routing' ? 'Finding a route…' : 'Find a route from my location'}
      </button>
      {statusText && (
        <p role="status" className={`mt-2 text-sm ${status === 'denied' || status === 'error' ? 'text-red-700' : 'font-medium text-brand-dark'}`}>
          {statusText}
        </p>
      )}
    </section>
  );
}
