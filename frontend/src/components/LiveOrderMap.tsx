import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, Polyline, Popup, useMap } from "react-leaflet";
import { BaseTileLayer } from "@/components/BaseTileLayer";
import { TileStyleSwitcher } from "@/components/TileStyleSwitcher";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Loader2, Bike, MapPin, Clock, Route } from "lucide-react";
import { getOrderTracking, type OrderTracking } from "@/services/tracking";
import { searchAddress } from "@/services/geocoding";
import { getStoreConfig, type StoreConfig } from "@/services/storeConfig";
import { restaurantIcon } from "@/lib/restaurantMarker";

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
  // Si el reloj del cliente va por detrás del timestamp del servidor (sec < 0),
  // tratamos como "ahora" en vez de mostrar tiempos negativos.
  if (sec < 5) return "ahora";
  if (sec < 60) return `hace ${Math.round(sec)}s`;
  const m = Math.floor(sec / 60);
  return `hace ${m} min`;
}

/**
 * Parsea un timestamp ISO-8601 a epoch ms. Si el backend serializa timestamps
 * "naive" (sin sufijo `Z` ni offset, p.ej. `2026-06-28T15:00:00`), el navegador
 * los interpretaría en zona LOCAL en vez de UTC, desfasando las fechas horas.
 * Para timestamps naive asumimos UTC añadiendo `Z` antes de parsear.
 */
function parseServerTimestamp(value: string): number {
  const hasZone = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(value.trim());
  const normalized = hasZone ? value : `${value}Z`;
  return new Date(normalized).getTime();
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
  const [store, setStore] = useState<StoreConfig | null>(null);
  const intervalRef = useRef<number | null>(null);

  // Ubicación del restaurante para pintar su pin. Error silencioso: si no carga,
  // simplemente no mostramos el marcador y el resto del mapa sigue funcionando.
  useEffect(() => {
    let cancelled = false;
    getStoreConfig()
      .then((cfg) => {
        if (!cancelled) setStore(cfg);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    // Función auxiliar para detener el polling de forma idempotente. No depende
    // del orden de asignación de `intervalRef.current`.
    const stopPolling = () => {
      if (intervalRef.current != null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const tick = async () => {
      try {
        const d = await getOrderTracking(orderId);
        if (cancelled) return;
        setData(d);
        setLastFetchAt(Date.now());
        setError(null);
        // Si el pedido ya no está activo (entregado/cancelado), corta el polling
        // para no quemar red con un pedido cerrado. Llamamos a `stopPolling`
        // siempre que `is_active` sea false: aunque el primer `tick()` resuelva
        // ANTES de crear el intervalo, este efecto ya habrá ejecutado la línea
        // del setInterval cuando el microtask de la promesa corra, así que
        // `intervalRef.current` apuntará al intervalo y se cancelará bien.
        if (!d.is_active) stopPolling();
      } catch {
        if (!cancelled) setError("No se pudo obtener seguimiento");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    // Creamos el intervalo ANTES de disparar el primer fetch para que, si la
    // primera respuesta llega con is_active=false, `stopPolling` ya tenga el id
    // del intervalo que cancelar (evita el polling huérfano contra un pedido
    // cerrado).
    intervalRef.current = window.setInterval(tick, refreshSeconds * 1000);
    tick();
    return () => {
      cancelled = true;
      stopPolling();
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
      <div
        style={{ height }}
        className="flex flex-col items-center justify-center gap-2 rounded-xl border border-ink-200 bg-surface-muted text-sm text-ink-500"
      >
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        <span>Cargando seguimiento…</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        style={{ height }}
        className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-ink-300 bg-surface-muted px-6 text-center text-sm text-ink-500"
      >
        <MapPin className="h-6 w-6 text-ink-400" />
        <span>{error ?? "Sin datos de seguimiento"}</span>
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
      <div style={{ height }} className="relative overflow-hidden rounded-xl border border-ink-200 shadow-card">
        <MapContainer center={center} zoom={14} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
          <BaseTileLayer />
          <AutoFit dest={dest} driver={driver} />
          {store && Number.isFinite(store.latitude) && Number.isFinite(store.longitude) && (
            <Marker position={[store.latitude, store.longitude]} icon={restaurantIcon}>
              <Popup>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 font-semibold text-ink-900">
                    <span className="text-base">🍗</span>
                    {store.name}
                  </div>
                  {store.address && (
                    <div className="text-xs text-ink-500">{store.address}</div>
                  )}
                </div>
              </Popup>
            </Marker>
          )}
          {dest && (
            <Marker position={[dest.lat, dest.lon]} icon={destinationIcon}>
              <Popup>
                <div className="flex items-center gap-1.5 font-semibold text-ink-900">
                  <span className="text-base">📍</span> Destino de entrega
                </div>
              </Popup>
            </Marker>
          )}
          {driver && (
            <Marker position={[driver.lat, driver.lon]} icon={driverIcon}>
              <Popup>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 font-semibold text-ink-900">
                    <span className="text-base">🛵</span>
                    {data.driver_name ?? "Repartidor"}
                  </div>
                  {data.driver_phone && (
                    <a
                      href={`tel:${data.driver_phone}`}
                      className="flex items-center gap-1.5 text-info-700 hover:underline"
                    >
                      <span>📞</span> {data.driver_phone}
                    </a>
                  )}
                </div>
              </Popup>
            </Marker>
          )}
          {driver && dest && (
            <Polyline
              positions={[[driver.lat, driver.lon], [dest.lat, dest.lon]]}
              pathOptions={{ color: "#1570ef", weight: 4, dashArray: "8 6", opacity: 0.75 }}
            />
          )}
        </MapContainer>

        {data.is_active && (
          <div className="absolute right-2 top-2 z-[1000] inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-ink-700 shadow-pop backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success-500" />
            </span>
            En vivo
          </div>
        )}
        <TileStyleSwitcher className="left-2 top-2" />
      </div>

      {/* Banner de ETA / distancia */}
      <EtaBanner data={data} driver={driver} dest={dest} />

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-500">
        <span className="inline-flex items-center gap-1.5 font-medium text-ink-600">
          <Bike className="h-3.5 w-3.5 text-ink-400" />
          {data.driver_name ?? "Sin repartidor asignado"}
        </span>
        {data.driver_updated_at ? (
          <RefreshIndicator
            driverUpdatedAt={data.driver_updated_at}
            lastFetchAt={lastFetchAt}
            refreshSeconds={refreshSeconds}
          />
        ) : driver ? (
          <span className="text-ink-400">—</span>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-ink-400" /> Esperando ubicación
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
  const ageSec = (now - parseServerTimestamp(driverUpdatedAt)) / 1000;
  const countdown = Math.max(0, refreshSeconds - Math.floor((now - lastFetchAt) / 1000));
  return (
    <span className="inline-flex items-center gap-1.5">
      <span>GPS del repartidor: {timeAgoSec(ageSec)}</span>
      <span className="text-ink-300">·</span>
      <span className="inline-flex items-center gap-1 text-ink-400">
        <Clock className="h-3 w-3" />
        Actualiza en {countdown}s
      </span>
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
      <div className="flex items-center gap-2 rounded-lg border border-warn-200 bg-warn-50 px-3 py-2 text-sm text-warn-700">
        <Clock className="h-4 w-4 shrink-0" />
        <span>Esperando ubicación del repartidor para calcular ETA…</span>
      </div>
    );
  }

  // Color del banner según el estado
  const tone =
    data.status === "on_the_way"
      ? "border-success-200 bg-success-50 text-success-700"
      : data.status === "delivered"
      ? "border-ink-200 bg-surface-muted text-ink-600"
      : "border-info-200 bg-info-50 text-info-700";

  return (
    <div className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 shadow-card ${tone}`}>
      <div className="flex items-center gap-2.5">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/70">
          <Clock className="h-5 w-5" />
        </span>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide opacity-70">
            {data.status === "on_the_way"
              ? "Llegada estimada"
              : data.status === "delivered"
              ? "Entregado"
              : "ETA aprox."}
          </div>
          <div className="font-display text-lg font-bold leading-tight">
            {data.status === "delivered" ? "—" : formatEta(eta.minutes)}
          </div>
        </div>
      </div>
      <div className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2.5 py-1 text-xs font-semibold">
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
