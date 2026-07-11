import { Router } from 'express';
import { one } from '../db';
import type { Route } from '../../../shared/models';

export const routes = Router();

// GET /api/routes/walking?start_lng=...&start_lat=...&end_lng=...&end_lat=...
// Proxies the public OSRM walking-compatible route service so browser clients
// do not need to call a third-party API directly.
routes.get('/walking', async (req, res) => {
  const mode = typeof req.query.mode === 'string' ? req.query.mode : 'walking';
  const routers: Record<string, string> = {
    walking: 'routed-foot',
    cycling: 'routed-bike',
    driving: 'routed-car',
  };
  if (!routers[mode]) return res.status(400).json({ error: 'invalid_transport_mode' });
  const values = ['start_lng', 'start_lat', 'end_lng', 'end_lat'].map((key) => Number(req.query[key]));
  if (values.some((value) => !Number.isFinite(value))) {
    return res.status(400).json({ error: 'invalid_coordinates' });
  }
  const [startLng, startLat, endLng, endLat] = values;
  if ([startLat, endLat].some((lat) => Math.abs(lat) > 90)
      || [startLng, endLng].some((lng) => Math.abs(lng) > 180)) {
    return res.status(400).json({ error: 'invalid_coordinates' });
  }

  try {
    const url = `https://routing.openstreetmap.de/${routers[mode]}/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) return res.status(502).json({ error: 'routing_unavailable' });
    const data = await response.json() as {
      routes?: { geometry: { coordinates: [number, number][] }; distance: number; duration: number }[];
    };
    const route = data.routes?.[0];
    if (!route) return res.status(404).json({ error: 'no_route' });
    return res.json({ coordinates: route.geometry.coordinates, distance_m: route.distance, duration_s: route.duration, mode });
  } catch {
    return res.status(502).json({ error: 'routing_unavailable' });
  }
});

// GET /api/routes/:eventId  -> hand-authored route for that event, or 404.
routes.get('/:eventId', async (req, res) => {
  const route = await one<Route>(
    `SELECT * FROM routes WHERE event_id = $1 LIMIT 1`,
    [req.params.eventId],
  );
  if (!route) return res.status(404).json({ error: 'no_route' });
  res.json(route);
});
