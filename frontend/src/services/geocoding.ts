/**
 * Geocoding gratis usando Nominatim (OpenStreetMap).
 * Política de uso: máx 1 req/seg, User-Agent identificable, sin spam.
 * https://operations.osmfoundation.org/policies/nominatim/
 */

const NOMINATIM = "https://nominatim.openstreetmap.org";

export interface GeocodeResult {
  lat: number;
  lon: number;
  display_name: string;
  address?: {
    road?: string;
    house_number?: string;
    suburb?: string;
    neighbourhood?: string;
    city?: string;
    town?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
}

/** Buscar dirección por texto (forward geocoding). */
export async function searchAddress(query: string, signal?: AbortSignal): Promise<GeocodeResult[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const url = new URL(`${NOMINATIM}/search`);
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "5");
  // Sesgo hacia Perú; cambia o quita si quieres búsqueda global.
  url.searchParams.set("countrycodes", "pe");

  const res = await fetch(url.toString(), {
    headers: { "Accept-Language": "es" },
    signal,
  });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const json = (await res.json()) as Array<{
    lat: string;
    lon: string;
    display_name: string;
    address?: GeocodeResult["address"];
  }>;
  return json.map((r) => ({
    lat: parseFloat(r.lat),
    lon: parseFloat(r.lon),
    display_name: r.display_name,
    address: r.address,
  }));
}

/** Obtener dirección a partir de coordenadas (reverse geocoding). */
export async function reverseGeocode(lat: number, lon: number, signal?: AbortSignal): Promise<GeocodeResult | null> {
  const url = new URL(`${NOMINATIM}/reverse`);
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");

  const res = await fetch(url.toString(), {
    headers: { "Accept-Language": "es" },
    signal,
  });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    lat: string;
    lon: string;
    display_name: string;
    address?: GeocodeResult["address"];
  };
  if (!json?.display_name) return null;
  return {
    lat: parseFloat(json.lat),
    lon: parseFloat(json.lon),
    display_name: json.display_name,
    address: json.address,
  };
}

/** Formatea una dirección de forma compacta. */
export function formatShortAddress(r: GeocodeResult): string {
  const a = r.address;
  if (!a) return r.display_name;
  const street = [a.road, a.house_number].filter(Boolean).join(" ");
  const area = a.suburb || a.neighbourhood;
  const city = a.city || a.town;
  return [street, area, city].filter(Boolean).join(", ") || r.display_name;
}
