export interface PlaceSearchResult {
  id: string;
  name: string;
  subtitle: string;
  lat: number;
  lng: number;
}

const RECENT_PLACES_KEY = 'planealo_recent_places';
const MAX_RECENT_PLACES = 4;

/**
 * Detecta coordenadas directas ("8.9824, -79.5199") o enlaces de Google Maps / Apple Maps.
 */
export function parseDirectLocationInput(raw: string): PlaceSearchResult | null {
  const input = raw.trim();
  if (!input) return null;

  // 1. Coordenadas directas: "8.9824, -79.5199" o "8.9824 -79.5199"
  const directMatch = input.match(
    /^(-?\d{1,2}(?:\.\d+)?)\s*[,\s]\s*(-?\d{1,3}(?:\.\d+)?)$/
  );
  if (directMatch) {
    const lat = parseFloat(directMatch[1]);
    const lng = parseFloat(directMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return {
        id: `coords_${lat}_${lng}`,
        name: `Punto (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        subtitle: 'Coordenadas exactas',
        lat,
        lng,
      };
    }
  }

  // 2. URL con @lat,lng (Google Maps estándar)
  const atMatch = input.match(/@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/);
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lng = parseFloat(atMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return {
        id: `gmaps_${lat}_${lng}`,
        name: 'Ubicación de Maps',
        subtitle: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        lat,
        lng,
      };
    }
  }

  // 3. URL con !3dLAT!4dLNG (Google Maps embed / lugar)
  const pbMatch = input.match(/!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/);
  if (pbMatch) {
    const lat = parseFloat(pbMatch[1]);
    const lng = parseFloat(pbMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return {
        id: `gmaps_pb_${lat}_${lng}`,
        name: 'Lugar de Maps',
        subtitle: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        lat,
        lng,
      };
    }
  }

  // 4. URL con ?q=lat,lng o ?ll=lat,lng
  const queryMatch = input.match(/[?&](?:q|ll|query)=(-?\d{1,2}\.\d+)(?:,|%2C)(-?\d{1,3}\.\d+)/i);
  if (queryMatch) {
    const lat = parseFloat(queryMatch[1]);
    const lng = parseFloat(queryMatch[2]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return {
        id: `url_q_${lat}_${lng}`,
        name: 'Ubicación compartida',
        subtitle: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        lat,
        lng,
      };
    }
  }

  return null;
}

/**
 * Busca lugares usando Photon (OpenStreetMap) sesgado a la posición actual,
 * con fallback automático a Nominatim si es necesario.
 */
export async function searchPlaces(
  query: string,
  biasCoords?: [number, number],
  signal?: AbortSignal
): Promise<PlaceSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const direct = parseDirectLocationInput(trimmed);
  if (direct) return [direct];

  // Intento 1: Photon (rápido, sin key, con sesgo geográfico)
  try {
    const params = new URLSearchParams({
      q: trimmed,
      limit: '5',
      lang: 'es',
    });
    if (biasCoords) {
      params.set('lat', biasCoords[0].toFixed(5));
      params.set('lon', biasCoords[1].toFixed(5));
    }

    const res = await fetch(`https://photon.komoot.io/api/?${params.toString()}`, {
      signal,
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.features) && data.features.length > 0) {
        return data.features
          .filter(
            (f: any) =>
              Array.isArray(f?.geometry?.coordinates) && f.geometry.coordinates.length >= 2
          )
          .map((f: any, idx: number) => {
            const [lng, lat] = f.geometry.coordinates as [number, number];
            const props = f.properties || {};
            const mainName =
              props.name ||
              props.street ||
              props.district ||
              props.city ||
              trimmed;
            const subParts = [props.street, props.district, props.city, props.country]
              .filter((v: unknown): v is string => typeof v === 'string' && v.trim().length > 0 && v !== mainName);
            const subtitle = subParts.slice(0, 3).join(', ') || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
            return {
              id: `photon_${props.osm_id || idx}_${lat.toFixed(4)}`,
              name: String(mainName),
              subtitle,
              lat,
              lng,
            };
          });
      }
    }
  } catch (err: any) {
    if (err?.name === 'AbortError') return [];
  }

  // Intento 2: Nominatim OpenStreetMap fallback
  try {
    const params = new URLSearchParams({
      q: trimmed,
      format: 'jsonv2',
      limit: '5',
      addressdetails: '1',
    });
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      signal,
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const items = await res.json();
      if (Array.isArray(items)) {
        return items.map((item: any, idx: number) => {
          const lat = parseFloat(item.lat);
          const lng = parseFloat(item.lon);
          const displayParts = String(item.display_name || trimmed).split(',').map((s) => s.trim());
          return {
            id: `nom_${item.place_id || idx}`,
            name: displayParts[0] || trimmed,
            subtitle: displayParts.slice(1, 3).join(', ') || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
            lat,
            lng,
          };
        });
      }
    }
  } catch {
    // fallback silencioso
  }

  return [];
}

export function getRecentPlaces(): PlaceSearchResult[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECENT_PLACES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p) =>
        p &&
        typeof p.name === 'string' &&
        typeof p.lat === 'number' &&
        typeof p.lng === 'number'
    );
  } catch {
    return [];
  }
}

export function saveRecentPlace(place: PlaceSearchResult): PlaceSearchResult[] {
  if (typeof window === 'undefined') return [];
  try {
    const current = getRecentPlaces();
    const deduped = current.filter(
      (item) =>
        Math.abs(item.lat - place.lat) > 0.0004 ||
        Math.abs(item.lng - place.lng) > 0.0004
    );
    const updated = [place, ...deduped].slice(0, MAX_RECENT_PLACES);
    localStorage.setItem(RECENT_PLACES_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}
