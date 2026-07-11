import { useEffect, useRef, useState } from 'react';
import maplibregl, { LngLatBounds } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { RankedEvent } from '../../../../shared/models';
import { formatCost, formatEventDate } from './format';
import { api, type TravelMode } from '../../api/client';
import { CATEGORY_LABELS, type EventCategory } from '../../../../shared/models';

const KW_CENTRE: [number, number] = [-80.4925, 43.4516];
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
const CATEGORY_PIN_COLORS: Record<EventCategory, string> = {
  arts: '#a855f7',
  sports: '#2563eb',
  education: '#0891b2',
  social: '#db2777',
  health: '#dc2626',
  employment: '#4f46e5',
  family: '#ea580c',
  food: '#ca8a04',
  outdoors: '#16a34a',
  tech: '#475569',
};

export function EventsMap({ events, onOpen }: {
  events: RankedEvent[];
  onOpen: (eventId: string) => void;
}) {
  const mapElement = useRef<HTMLDivElement>(null);
  const onOpenRef = useRef(onOpen);
  const geolocateRef = useRef<maplibregl.GeolocateControl | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'locating' | 'ready' | 'denied' | 'error'>('idle');
  onOpenRef.current = onOpen;

  useEffect(() => {
    if (!mapElement.current) return;

    const map = new maplibregl.Map({
      container: mapElement.current,
      style: MAP_STYLE,
      center: KW_CENTRE,
      zoom: 12,
      pitch: 55,
      bearing: -18,
      maxPitch: 75,
      attributionControl: { compact: true },
    });
    map.scrollZoom.disable();
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
    map.addControl(new maplibregl.FullscreenControl(), 'top-right');

    let currentLocation: [number, number] | null = null;
    const routeButtons: HTMLButtonElement[] = [];
    const geolocate = new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      fitBoundsOptions: { maxZoom: 15 },
    });
    geolocateRef.current = geolocate;
    map.addControl(geolocate, 'top-right');
    geolocate.on('geolocate', (position) => {
      currentLocation = [position.coords.longitude, position.coords.latitude];
      setLocationStatus('ready');
      routeButtons.forEach((button) => {
        button.disabled = false;
        button.textContent = 'Show walking route';
      });
    });
    geolocate.on('error', (error) => {
      setLocationStatus(error.code === 1 ? 'denied' : 'error');
    });

    const bounds = new LngLatBounds();
    let pointCount = 0;

    // Markers at the same venue receive screen-pixel offsets in a ring. Their
    // geographic point remains unchanged, so directions still end at the venue.
    const locationGroups = new Map<string, RankedEvent[]>();
    events.forEach((event) => {
      if (event.location_lat == null || event.location_lng == null) return;
      const key = `${event.location_lat.toFixed(5)},${event.location_lng.toFixed(5)}`;
      locationGroups.set(key, [...(locationGroups.get(key) ?? []), event]);
    });

    events.forEach((event) => {
      if (event.location_lat == null || event.location_lng == null) return;
      const point: [number, number] = [event.location_lng, event.location_lat];
      const locationKey = `${event.location_lat.toFixed(5)},${event.location_lng.toFixed(5)}`;
      const group = locationGroups.get(locationKey) ?? [event];
      const groupIndex = group.findIndex((groupEvent) => groupEvent.id === event.id);
      const angle = (groupIndex / group.length) * Math.PI * 2 - Math.PI / 2;
      const radius = group.length > 1 ? Math.max(22, Math.min(34, group.length * 7)) : 0;
      const markerOffset: [number, number] = [Math.cos(angle) * radius, Math.sin(angle) * radius];
      bounds.extend(point);
      pointCount += 1;

      const popup = document.createElement('div');
      popup.className = 'min-w-[210px]';
      const title = document.createElement('strong');
      title.className = 'block text-sm leading-snug';
      title.textContent = event.title;
      const details = document.createElement('p');
      details.className = 'my-1 text-xs';
      details.textContent = `${formatEventDate(event.date_start, event.date_end)} · ${formatCost(event.cost, event.cost_amount)}`;
      const address = document.createElement('p');
      address.className = 'my-1 text-xs text-muted';
      address.textContent = event.location_address ?? 'Kitchener–Waterloo';
      const openButton = document.createElement('button');
      openButton.type = 'button';
      openButton.className = 'mt-2 rounded-lg bg-[#1f6f5c] px-3 py-2 text-xs font-semibold text-white';
      openButton.textContent = 'View event';
      openButton.addEventListener('click', () => onOpenRef.current(event.id));
      const routeButton = document.createElement('button');
      routeButton.type = 'button';
      routeButton.disabled = true;
      routeButton.className = 'ml-2 mt-2 rounded-lg border border-[#1f6f5c] px-3 py-2 text-xs font-semibold text-[#1f6f5c] disabled:cursor-not-allowed disabled:opacity-50';
      routeButton.textContent = 'Enable location to route';
      routeButtons.push(routeButton);
      const modeSelect = document.createElement('select');
      modeSelect.className = 'mt-2 min-h-[36px] rounded-lg border border-black/15 bg-white px-2 text-xs';
      modeSelect.setAttribute('aria-label', `Transportation mode to ${event.title}`);
      ([['walking', '🚶 Walking'], ['cycling', '🚲 Cycling'], ['driving', '🚗 Driving'], ['transit', '🚌 Transit']] as [TravelMode, string][])
        .forEach(([value, label]) => {
          const option = document.createElement('option');
          option.value = value;
          option.textContent = label;
          modeSelect.append(option);
        });
      routeButton.addEventListener('click', async () => {
        if (!currentLocation) return;
        const mode = modeSelect.value as TravelMode;
        if (mode === 'transit') {
          const origin = `${currentLocation[1]},${currentLocation[0]}`;
          const destination = `${event.location_lat},${event.location_lng}`;
          window.open(`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=transit`, '_blank', 'noopener,noreferrer');
          routeButton.textContent = 'Transit directions opened';
          return;
        }
        routeButton.disabled = true;
        routeButton.textContent = 'Finding route…';
        try {
          const route = await api.walkingRoute(currentLocation, point, mode);
          const sourceId = 'selected-walking-route';
          if (map.getLayer(sourceId)) map.removeLayer(sourceId);
          if (map.getSource(sourceId)) map.removeSource(sourceId);
          map.addSource(sourceId, {
            type: 'geojson',
            data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: route.coordinates } },
          });
          map.addLayer({
            id: sourceId,
            type: 'line',
            source: sourceId,
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: { 'line-color': '#7c3aed', 'line-width': 7, 'line-opacity': 0.9 },
          });
          const routeBounds = route.coordinates.reduce(
            (box, coordinate) => box.extend(coordinate), new LngLatBounds(currentLocation, currentLocation),
          );
          map.fitBounds(routeBounds, { padding: 70, maxZoom: 16, pitch: 45 });
          const label = mode === 'walking' ? 'walk' : mode === 'cycling' ? 'bike' : 'drive';
          routeButton.textContent = `${Math.max(1, Math.round(route.duration_s / 60))} min ${label}`;
        } catch {
          routeButton.textContent = 'Route unavailable — try again';
        } finally {
          routeButton.disabled = false;
        }
      });
      popup.append(title, details, address, document.createElement('br'), modeSelect, routeButton);

      const pin = document.createElement('button');
      pin.type = 'button';
      pin.className = 'event-map-pin';
      pin.setAttribute('aria-label', `${event.title} location`);
      pin.title = event.title;
      pin.style.backgroundColor = CATEGORY_PIN_COLORS[event.category[0] ?? 'social'];
      if (group.length > 1) {
        pin.setAttribute('aria-label', `${event.title} location; ${group.length} events share this venue`);
      }

      new maplibregl.Marker({ element: pin, anchor: 'bottom', offset: markerOffset })
        .setLngLat(point)
        .setPopup(new maplibregl.Popup({ offset: 32, closeButton: true }).setDOMContent(popup))
        .addTo(map);
    });

    if (pointCount > 1) {
      map.fitBounds(bounds, { padding: 55, maxZoom: 14, pitch: 55, bearing: -18, duration: 0 });
    } else if (pointCount === 1) {
      map.jumpTo({ center: bounds.getCenter(), zoom: 14, pitch: 55, bearing: -18 });
    }

    return () => {
      geolocateRef.current = null;
      map.remove();
    };
  }, [events]);

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationStatus('error');
      return;
    }
    setLocationStatus('locating');
    const triggered = geolocateRef.current?.trigger();
    if (!triggered) setLocationStatus('error');
  }

  const locationMessage = {
    idle: 'Your location is only used after you choose this.',
    locating: 'Waiting for your browser’s location…',
    ready: 'Your current location is shown in blue. Select an event pin to route there.',
    denied: 'Location access was denied. Allow it in your browser’s site settings and try again.',
    error: 'Your location could not be found. Location requires HTTPS or localhost.',
  }[locationStatus];

  return (
    <div className="relative">
      <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-black/10 bg-white p-3">
        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={locationStatus === 'locating'}
          className="min-h-[44px] rounded-lg bg-brand px-4 font-medium text-white hover:bg-brand-dark disabled:cursor-wait disabled:opacity-60"
        >
          {locationStatus === 'locating' ? 'Finding your location…' : locationStatus === 'ready' ? 'Update my location' : 'Use my current location'}
        </button>
        <p role="status" className={`m-0 text-sm ${locationStatus === 'denied' || locationStatus === 'error' ? 'text-red-700' : 'text-muted'}`}>
          {locationMessage}
        </p>
      </div>
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-2" aria-label="Event pin colour legend">
        {(Object.entries(CATEGORY_LABELS) as [EventCategory, string][]).map(([category, label]) => (
          <span key={category} className="inline-flex items-center gap-1.5 text-xs text-muted">
            <span
              aria-hidden
              className="h-3 w-3 rounded-full border border-black/10"
              style={{ backgroundColor: CATEGORY_PIN_COLORS[category] }}
            />
            {label}
          </span>
        ))}
      </div>
      <div
        ref={mapElement}
        role="region"
        aria-label={`3D map of ${events.length} events in Kitchener–Waterloo`}
        className="h-[560px] w-full overflow-hidden rounded-2xl border border-black/10 shadow-sm"
      />
    </div>
  );
}
