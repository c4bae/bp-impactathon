import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { RouteStep } from '../../../../shared/models';
// Fix Leaflet's default icon paths under Vite:
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

// Leaflet's Icon.Default resolves icon paths from the stylesheet URL, which
// breaks under Vite; drop that resolver so the bundled URLs above are used.
delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl: iconRetina, shadowUrl });

// Renders the hand-authored route on an OSM map. Supplementary visual only —
// the ordered step list on the page is the accessible source of truth, so
// this container is a single labelled image stop for screen readers.
export function RouteMap({ steps }: { steps: RouteStep[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const pts = steps
      .filter((s) => s.lat != null && s.lng != null)
      .map((s) => [s.lat!, s.lng!] as [number, number]);
    if (!ref.current || pts.length === 0) return;

    const map = L.map(ref.current).setView(pts[0], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);
    L.polyline(pts, { weight: 5 }).addTo(map);
    pts.forEach((p, i) => L.marker(p).addTo(map).bindPopup(`Step ${i + 1}`));
    map.fitBounds(L.latLngBounds(pts), { padding: [30, 30] });

    return () => { map.remove(); };
  }, [steps]);

  const hasPoints = steps.some((s) => s.lat != null && s.lng != null);
  if (!hasPoints) return null;

  return (
    <div
      ref={ref}
      role="img"
      aria-label="Map of the route. Step-by-step directions are listed below."
      style={{ height: 300 }}
      className="rounded-xl overflow-hidden border border-black/10"
    />
  );
}
