export const GEOFENCE_RADIUS_METERS = 50;
export const DEFAULT_MEETING_POINT: [number, number] = [8.9824, -79.5199]; // Casco Antiguo, Panamá

/**
  * Calcula la distancia ortodrómica en metros entre dos coordenadas geográficas (fórmula de Haversine).
  */
export function calculateHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Radio de la Tierra en metros
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
  * Formatea la distancia y el tiempo estimado caminando (~80m por minuto)
  */
export function formatDistanceETA(distanceMeters: number): {
  distanceLabel: string;
  etaLabel: string;
  isInside: boolean;
} {
  const isInside = distanceMeters <= GEOFENCE_RADIUS_METERS;

  if (isInside) {
    return {
      distanceLabel: `${distanceMeters}m`,
      etaLabel: '¡Estás en el punto!',
      isInside: true,
    };
  }

  const walkingMinutes = Math.max(1, Math.ceil(distanceMeters / 80));
  const distanceFormatted =
    distanceMeters >= 1000
      ? `${(distanceMeters / 1000).toFixed(1)} km`
      : `${distanceMeters}m`;

  return {
    distanceLabel: distanceFormatted,
    etaLabel: `~${walkingMinutes} min a pie`,
    isInside: false,
  };
}
