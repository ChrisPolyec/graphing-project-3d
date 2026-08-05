/**
 * Equipo 4: Manejo de red y API GPS
 * Extrae la altitud sobre el nivel del mar usando Open-Elevation.
 */

export interface ElevationResponse {
  results: {
    latitude: number;
    longitude: number;
    elevation: number;
  }[];
}

/**
 * Consulta la elevación de unas coordenadas dadas.
 * Si ocurre algún error (sin internet, timeout, caída del servicio),
 * se reporta silenciosamente y devuelve 0.
 *
 * @param lat Latitud real.
 * @param lng Longitud real.
 * @param timeoutMs Tiempo máximo de espera en milisegundos (por defecto 5 segundos).
 * @returns Promesa con la elevación en metros (o 0 si falla).
 */
export async function fetchElevation(lat: number, lng: number, timeoutMs: number = 5000): Promise<number> {
  const url = `https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lng}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    
    if (!response.ok) {
      throw new Error(`Open-Elevation respondió con error HTTP: ${response.status}`);
    }

    const data = (await response.json()) as ElevationResponse;

    if (data && data.results && data.results.length > 0) {
      return data.results[0].elevation;
    }
    
    return 0;
  } catch (error) {
    // Si la promesa es abortada por timeout u ocurre un error de red
    const isTimeout = error instanceof Error && error.name === 'AbortError';
    console.warn(`[Equipo 4] Error al obtener elevación. ${isTimeout ? 'Timeout de la API' : error}. Usando altitud 0 por defecto.`);
    return 0;
  } finally {
    clearTimeout(timeoutId);
  }
}
