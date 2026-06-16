import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, Polyline, Popup, useMap } from "react-leaflet";
import { BaseTileLayer } from "@/components/BaseTileLayer";
import { TileStyleSwitcher } from "@/components/TileStyleSwitcher";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Loader2, Bike, MapPin, Clock, Route } from "lucide-react";
import { getOrderTracking, type OrderTracking } from "@/services/tracking";
import { searchAddress } from "@/services/geocoding";

// Velocidades promedio en ciudad (km/h) por tipo de vehículo.
const SPEEDS_KMH: Record<string, number> = {
  moto: 30,
  bicicleta: 15,
  auto: 25,
};
const DEFAULT_SPEED = 25;

function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const sa =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(sa));
}

function formatEta(minutes: number): string {
  if (minutes < 1) return "Llegando";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

function timeAgoSec(sec: number): string {
  if (sec < 5) return "ahora";
  if (sec < 60) return `hace ${Math.round(sec)}s`;
  const m = Math.floor(sec / 60);
  return `hace ${m} min`;
}

const COORDS_RE = /\((-?\d+\.\d+),\s*(-?\d+\.\d+)\)/;

/** Limpia la dirección de prefijos tipo `[Oficina] —` y sufijo de coords */
function cleanAddress(addr: string): string {
  return addr
    .replace(COORDS_RE, "")
    .replace(/\[[^\]]+\]\s*[—-]?\s*/g, "")
    .replace(/\s+—\s+/g, ", ")
    .trim();
}

// Iconos
const destinationIcon = L.divIcon({
  html: `
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="42" viewBox="0 0 30 42">
      <path fill="#f25f05" stroke="white" stroke-width="2" d="M15 0 C7 0 0 7 0 15 c0 11 15 27 15 27 s15-16 15-27 C30 7 23 0 15 0 z"/>
      <circle cx="15" cy="15" r="6" fill="white"/>
    </svg>`,
  className: "",
  iconSize: [36, 42],
  iconAnchor: [18, 42],
  popupAnchor: [0, -38],
});

const driverIcon = L.divIcon({
  html: `
    <div style="position:relative;width:46px;height:46px">
      <div style="position:absolute;inset:0;border-radius:50%;background:#3b82f6;opacity:0.25;animation:pulse 2s infinite"></div>
      <div style="position:absolute;top:5px;left:5px;width:36px;height:36px;border-radius:50%;background:#3b82f6;border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 6px rgba(0,0,0,0.3)">🛵</div>
    </div>
    <style>@keyframes pulse{0%{transform:scale(1);opacity:0.5}100%{transform:scale(1.8);opacity:0}}</style>`,
  className: "",
  iconSize: [46, 46],
  iconAnchor: [23, 23],
  popupAnchor: [0, -23],
});

interface Props {
  orderId: number;
  refreshSeconds?: number;
  height?: number | string;
}

export function LiveOrderMap({ orderId, refreshSeconds = 5, height = 320 }: Props) {
  const [data, setData] = useState<OrderTracking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [geocodedDest, setGeocodedDest] = useState<{ lat: number; lon: number } | null>(null);
  const [lastFetchAt, setLastFetchAt] = useState<number>(Date.now());
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchOnce = async () => {
      try {
        const d = await getOrderTracking(orderId);
        if (cancelled) return;
        setData(d);
        setLastFetchAt(Date.now());
        setError(null);
        // Si el pedido ya no está activo (entregado/cancelado), corta el polling
        // para no quemar red con un pedido cerrado.
        if (!d.is_active && intervalRef.current) {
          window.clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } catch {
        if (!cancelled) setError("No se pudo obtener seguimiento");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchOnce();
    intervalRef.current = window.setInterval(fetchOnce, refreshSeconds * 1000);
    return () => {
      cancelled = true;
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [orderId, refreshSeconds]);

  // Si delivery_address no trae coords embebidas, intenta geocodificar el texto.
  // Usamos data?.delivery_address como dependencia: como es un string primitivo,
  // el efecto sólo corre cuando la dirección cambia realmente (no en cada poll).
  useEffect(() => {
    const addr = data?.delivery_address;
    if (!addr) return;
    if (COORDS_RE.test(addr)) {
      // Coords embebidas: limpia cualquier geocode previo de una dirección distinta.
      setGeocodedDest((prev) => (prev === null ? prev : null));
      return;
    }
    const cleaned = cleanAddress(addr);
    if (cleaned.length < 4) return;
    const ctrl = new AbortController();
    let cancelled = false;
    searchAddress(cleaned, ctrl.signal)
      .then((results) => {
        if (cancelled) return;
        if (results[0]) setGeocodedDest({ lat: results[0].lat, lon: results[0].lon });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, [data?.delivery_address]);

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">
        {error ?? "Sin datos de seguimiento"}
      </div>
    );
  }

  // Destino: primero busca coords embebidas, sino usa el geocoding del texto.
  const m = data.delivery_address.match(COORDS_RE);
  const dest = m
    ? { lat: parseFloat(m[1]), lon: parseFloat(m[2]) }
    : geocodedDest;
  const driver =
    data.driver_latitude != null && data.driver_longitude != null
      ? { lat: data.driver_latitude, lon: data.driver_longitude }
      : null;

  const center: [number, number] =
    driver ? [driver.lat, driver.lon] : dest ? [dest.lat, dest.lon] : [-12.0464, -77.0428];

  return (
    <div className="space-y-2">
      <div style={{ height }} className="relative overflow-hidden rounded-xl border border-neutral-200">
        <MapContainer center={center} zoom={14} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
          <BaseTileLayer />
          <AutoFit dest={dest} driver={driver} />
          {dest && (
            <Marker position={[dest.lat, dest.lon]} icon={destinationIcon}>
              <Popup>📍 Destino de entrega</Popup>
            </Marker>
          )}
          {driver && (
            <Marker position={[driver.lat, driver.lon]} icon={driverIcon}>
              <Popup>
                🛵 {data.driver_name ?? "Repartidor"}
                {data.driver_phone && <><br />📞 {data.driver_phone}</>}
              </Popup>
            </Marker>
          )}
          {driver && dest && (
            <Polyline
              positions={[[driver.lat, driver.lon], [dest.lat, dest.lon]]}
              pathOptions={{ color: "#3b82f6", weight: 3, dashArray: "8 6", opacity: 0.7 }}
            />
          )}
        </MapContainer>

        {data.is_active && (
          <div className="absolute right-2 top-2 z-[1000] inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-xs font-semibold text-neutral-700 shadow">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-green-500" />
            En vivo
          </div>
        )}
        <TileStyleSwitcher className="left-2 top-2" />
      </div>

      {/* Banner de ETA / distancia */}
      <EtaBanner data={data} driver={driver} dest={dest} />

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-500">
        <span className="inline-flex items-center gap-1">
          <Bike className="h-3 w-3" />
          {data.driver_name ?? "Sin repartidor asignado"}
        </span>
        {data.driver_updated_at ? (
          <RefreshIndicator
            driverUpdatedAt={data.driver_updated_at}
            lastFetchAt={lastFetchAt}
            refreshSeconds={refreshSeconds}
          />
        ) : driver ? (
          <span>—</span>
        ) : (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" /> Esperando ubicación
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Componente aislado con su propio tick de 1s para mostrar el countdown.
 * Vive en su propio sub-tree para no forzar re-render del MapContainer.
 */
function RefreshIndicator({
  driverUpdatedAt,
  lastFetchAt,
  refreshSeconds,
}: {
  driverUpdatedAt: string;
  lastFetchAt: number;
  refreshSeconds: number;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const ageSec = (now - new Date(driverUpdatedAt).getTime()) / 1000;
  const countdown = Math.max(0, refreshSeconds - Math.floor((now - lastFetchAt) / 1000));
  return (
    <span>
      GPS del repartidor: {timeAgoSec(ageSec)}
      <span className="ml-1 text-neutral-300">·</span>
      <span className="ml-1">Actualiza en {countdown}s</span>
    </span>
  );
}

function EtaBanner({
  data,
  driver,
  dest,
}: {
  data: OrderTracking;
  driver: { lat: number; lon: number } | null;
  dest: { lat: number; lon: number } | null;
}) {
  const eta = useMemo(() => {
    if (!driver || !dest) return null;
    const km = haversineKm(driver, dest);
    const speed = SPEEDS_KMH[data.driver_vehicle_type ?? ""] ?? DEFAULT_SPEED;
    const minutes = (km / speed) * 60;
    return { km, minutes };
  }, [driver?.lat, driver?.lon, dest?.lat, dest?.lon, data.driver_vehicle_type]);

  if (!eta) {
    if (!data.is_active) return null;
    return (
      <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
        <Clock className="h-4 w-4" />
        <span>Esperando ubicación del repartidor para calcular ETA…</span>
      </div>
    );
  }

  // Color del banner según el estado
  const tone =
    data.status === "on_the_way"
      ? "border-green-200 bg-green-50 text-green-800"
      : data.status === "delivered"
      ? "border-neutral-200 bg-neutral-50 text-neutral-600"
      : "border-blue-200 bg-blue-50 text-blue-800";

  return (
    <div className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 ${tone}`}>
      <div className="flex items-center gap-2">
        <Clock className="h-5 w-5" />
        <div>
          <div className="text-xs uppercase tracking-wide opacity-70">
            {data.status === "on_the_way"
              ? "Llegada estimada"
              : data.status === "delivered"
              ? "Entregado"
              : "ETA aprox."}
          </div>
          <div className="text-lg font-bold leading-tight">
            {data.status === "delivered" ? "—" : formatEta(eta.minutes)}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 text-xs">
        <Route className="h-3.5 w-3.5" />
        {eta.km.toFixed(2)} km
      </div>
    </div>
  );
}

function isValidPoint(p: { lat: number; lon: number } | null | undefined): p is { lat: number; lon: number } {
  return !!p && Number.isFinite(p.lat) && Number.isFinite(p.lon);
}

function AutoFit({
  dest,
  driver,
}: {
  dest: { lat: number; lon: number } | null;
  driver: { lat: number; lon: number } | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const validDest = isValidPoint(dest) ? dest : null;
    const validDriver = isValidPoint(driver) ? driver : null;
    if (!validDest && !validDriver) return;

    try {
      if (validDest && validDriver) {
        // Si ambos puntos son básicamente el mismo, no usar bounds
        const same =
          Math.abs(validDest.lat - validDriver.lat) < 1e-6 &&
          Math.abs(validDest.lon - validDriver.lon) < 1e-6;
        if (same) {
          map.setView([validDriver.lat, validDriver.lon], 16);
        } else {
          map.fitBounds(
            [
              [validDest.lat, validDest.lon],
              [validDriver.lat, validDriver.lon],
            ],
            { padding: [50, 50], maxZoom: 16 },
          );
        }
      } else if (validDriver) {
        map.setView([validDriver.lat, validDriver.lon], 15);
      } else if (validDest) {
        map.setView([validDest.lat, validDest.lon], 15);
      }
    } catch (e) {
      // Evita crashear todo el mapa si Leaflet rechaza el input
      console.warn("AutoFit error:", e);
    }
  }, [dest?.lat, dest?.lon, driver?.lat, driver?.lon, map]);
  return null;
}
