import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, Marker, Popup, useMap } from "react-leaflet";
import { BaseTileLayer } from "@/components/BaseTileLayer";
import { TileStyleSwitcher } from "@/components/TileStyleSwitcher";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Loader2, RefreshCw, Crosshair, MapPin, AlertCircle, Navigation, PackageOpen } from "lucide-react";
import { getNearbyOrders, acceptOrder, type NearbyOrder } from "@/services/delivery";
import { getStoreConfig, type StoreConfig } from "@/services/storeConfig";
import { restaurantIcon } from "@/lib/restaurantMarker";
import { formatCurrency } from "@/lib/utils";
import { getErrorMessage } from "@/lib/api";

// Acepta enteros y decimales opcionales (p.ej. "(-12, -77)" o "(-12.04,-77)").
// Antes exigía decimales en ambos números, lo que excluía silenciosamente
// pedidos con coords enteras o redondeadas por el backend.
const COORDS_RE = /\((-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\)/;
const DEFAULT_CENTER: [number, number] = [-12.0464, -77.0428];

interface OrderWithCoords extends NearbyOrder {
  lat: number;
  lon: number;
  distanceKm?: number;
}

// Distancia Haversine en km
function haversine(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const sa =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(sa));
}
function toRad(d: number) {
  return (d * Math.PI) / 180;
}

function urgencyColor(km: number): "green" | "orange" | "red" {
  if (km < 2) return "green";
  if (km < 5) return "orange";
  return "red";
}

function pinIcon(color: "green" | "orange" | "red" | "blue") {
  const hex = { green: "#10b981", orange: "#f97316", red: "#ef4444", blue: "#3b82f6" }[color];
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="34" height="46" viewBox="0 0 30 42">
      <path fill="${hex}" stroke="white" stroke-width="2" d="M15 0 C7 0 0 7 0 15 c0 11 15 27 15 27 s15-16 15-27 C30 7 23 0 15 0 z"/>
      <circle cx="15" cy="15" r="6" fill="white"/>
    </svg>`;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [34, 46],
    iconAnchor: [17, 46],
    popupAnchor: [0, -42],
  });
}

const meIcon = L.divIcon({
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#2563eb;border:3px solid white;box-shadow:0 0 0 4px rgba(37,99,235,0.3)"></div>`,
  className: "",
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

export function DriverMapPage() {
  const navigate = useNavigate();
  const [myPos, setMyPos] = useState<[number, number] | null>(null);
  const [orders, setOrders] = useState<OrderWithCoords[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [maxKm, setMaxKm] = useState(10);
  const [store, setStore] = useState<StoreConfig | null>(null);

  // Ubicación del restaurante para pintar su pin. Error silencioso: si no carga,
  // no mostramos el marcador y el resto del mapa sigue funcionando igual.
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getNearbyOrders();
      const parsed: OrderWithCoords[] = [];
      for (const o of list) {
        const m = o.delivery_address.match(COORDS_RE);
        if (!m) continue;
        const lat = parseFloat(m[1]);
        const lon = parseFloat(m[2]);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
        parsed.push({ ...o, lat, lon });
      }
      setOrders(parsed);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function locateMe() {
    if (!navigator.geolocation) {
      alert("Sin geolocalización en este navegador");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setMyPos([pos.coords.latitude, pos.coords.longitude]),
      (err) => alert(err.message),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function handleAccept(id: number) {
    setAccepting(id);
    try {
      await acceptOrder(id);
      navigate(`/delivery/my-orders/${id}`);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setAccepting(null);
    }
  }

  // Anota distancia y filtra por radio
  const annotated = orders.map((o) => ({
    ...o,
    distanceKm: myPos ? haversine(myPos, [o.lat, o.lon]) : undefined,
  }));
  const visible = myPos
    ? annotated.filter((o) => (o.distanceKm ?? 0) <= maxKm).sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0))
    : annotated;

  const initialCenter: [number, number] =
    myPos ?? (visible[0] ? [visible[0].lat, visible[0].lon] : DEFAULT_CENTER);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-ink-900">
            🗺️ Pedidos cerca
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            {myPos
              ? `${visible.length} ${visible.length === 1 ? "pedido" : "pedidos"} dentro de ${maxKm} km`
              : "Acepta el reparto más cercano a ti"}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button onClick={locateMe} className="btn-ghost !px-3" title="Mi ubicación">
            <Crosshair className="h-4 w-4" />
            <span className="hidden sm:inline">Ubicarme</span>
          </button>
          <button onClick={load} className="btn-ghost !px-3" title="Refrescar" disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refrescar</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-2 rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {myPos && (
        <div className="card mb-6 flex items-center gap-4 p-4">
          <span className="flex items-center gap-2 text-sm font-medium text-ink-700">
            <Navigation className="h-4 w-4 text-brand-500" />
            Radio
          </span>
          <input
            type="range"
            min={1}
            max={20}
            value={maxKm}
            onChange={(e) => setMaxKm(parseInt(e.target.value, 10))}
            className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-ink-100 accent-brand-500"
          />
          <span className="chip !px-3 !py-1 font-mono tabular-nums">{maxKm} km</span>
        </div>
      )}

      <div className="relative h-[440px] overflow-hidden rounded-2xl border border-ink-200 shadow-card">
        {loading ? (
          <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-white/70 backdrop-blur-sm">
            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
          </div>
        ) : null}
        <MapContainer center={initialCenter} zoom={13} style={{ height: "100%", width: "100%" }}>
          <BaseTileLayer />
          {/* Sólo volamos cuando el usuario obtiene su propia ubicación.
              Antes el mapa "saltaba" en cada refresh de pedidos cercanos. */}
          {myPos && <FlyToOnce position={myPos} />}
          {myPos && <Marker position={myPos} icon={meIcon} />}
          {store && Number.isFinite(store.latitude) && Number.isFinite(store.longitude) && (
            <Marker position={[store.latitude, store.longitude]} icon={restaurantIcon}>
              <Popup>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-1.5 font-display font-bold text-ink-900">
                    <span className="text-base">🍗</span>
                    {store.name}
                  </div>
                  {store.address && <div className="text-xs text-ink-500">{store.address}</div>}
                </div>
              </Popup>
            </Marker>
          )}
          {visible.map((o) => (
            <Marker
              key={o.id}
              position={[o.lat, o.lon]}
              icon={pinIcon(o.distanceKm !== undefined ? urgencyColor(o.distanceKm) : "blue")}
            >
              <Popup>
                <div className="space-y-1.5 text-sm">
                  <div className="font-display font-bold text-ink-900">Pedido {o.order_number}</div>
                  <div className="text-ink-700">{o.delivery_address.split(" — ")[0]}</div>
                  {o.distanceKm !== undefined && (
                    <div className="text-xs text-ink-500">{o.distanceKm.toFixed(2)} km de ti</div>
                  )}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="font-display text-lg font-bold text-brand-600">
                      {formatCurrency(o.delivery_fee)}
                    </span>
                    <button
                      disabled={accepting === o.id}
                      onClick={() => handleAccept(o.id)}
                      className="btn-primary !py-1 !text-xs"
                    >
                      {accepting === o.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Aceptar"}
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
          <TileStyleSwitcher className="left-2 top-2" />
        </MapContainer>
      </div>

      {!myPos && (
        <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-ink-500">
          <Crosshair className="h-3.5 w-3.5 text-brand-500" />
          Activa "Ubicarme" para ver distancia y filtrar por radio
        </p>
      )}

      <div className="mt-6 space-y-3">
        <h2 className="section-title">📦 Disponibles</h2>

        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card flex items-center justify-between p-4">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="skeleton h-4 w-32 rounded" />
                  <div className="skeleton h-3 w-48 rounded" />
                </div>
                <div className="skeleton h-8 w-20 rounded-lg" />
              </div>
            ))}
          </div>
        )}

        {!loading && visible.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-300 bg-surface-muted px-6 py-16 text-center">
            <PackageOpen className="h-12 w-12 text-ink-300" />
            <h3 className="mt-4 font-display text-lg font-bold text-ink-800">
              No hay pedidos {myPos ? `dentro de ${maxKm} km` : "disponibles"}
            </h3>
            <p className="mt-1 text-sm text-ink-500">
              {myPos ? "Amplía el radio o vuelve a intentar más tarde." : "Vuelve a revisar en unos minutos."}
            </p>
            <button onClick={load} className="btn-secondary mt-5">
              <RefreshCw className="h-4 w-4" /> Refrescar
            </button>
          </div>
        )}

        {!loading &&
          visible.slice(0, 5).map((o) => (
            <article key={o.id} className="card-hover flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-bold text-ink-900">
                  {o.order_number}
                  {o.distanceKm !== undefined && (
                    <span className="badge badge-info">{o.distanceKm.toFixed(2)} km</span>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-1.5 truncate text-xs text-ink-500">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-ink-400" />
                  <span className="truncate">{o.delivery_address.split(" — ")[0]}</span>
                </div>
              </div>
              <button
                disabled={accepting === o.id}
                onClick={() => handleAccept(o.id)}
                className="btn-primary shrink-0 !py-1.5 !text-xs"
              >
                {accepting === o.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : formatCurrency(o.delivery_fee)}
              </button>
            </article>
          ))}
      </div>
    </div>
  );
}

/**
 * Vuela hacia `position` solo cuando cambia de forma significativa (>50m).
 * Evita reposicionar el mapa con cada poll de "pedidos cercanos" que reordena
 * `visible[0]` y antes generaba un salto visual al usuario.
 */
function FlyToOnce({ position }: { position: [number, number] }) {
  const map = useMap();
  const lastRef = useRef<[number, number] | null>(null);
  useEffect(() => {
    const prev = lastRef.current;
    if (
      prev &&
      Math.abs(prev[0] - position[0]) < 5e-4 &&
      Math.abs(prev[1] - position[1]) < 5e-4
    ) {
      return;
    }
    lastRef.current = position;
    map.flyTo(position, map.getZoom(), { duration: 0.6 });
  }, [position[0], position[1]]);
  return null;
}
