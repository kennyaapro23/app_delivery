import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, Marker, Popup, useMap } from "react-leaflet";
import { BaseTileLayer } from "@/components/BaseTileLayer";
import { TileStyleSwitcher } from "@/components/TileStyleSwitcher";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Loader2, RefreshCw, Crosshair, MapPin } from "lucide-react";
import { getNearbyOrders, acceptOrder, type NearbyOrder } from "@/services/delivery";
import { formatCurrency } from "@/lib/utils";
import { getErrorMessage } from "@/lib/api";

const COORDS_RE = /\((-?\d+\.\d+),\s*(-?\d+\.\d+)\)/;
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getNearbyOrders();
      const parsed: OrderWithCoords[] = [];
      for (const o of list) {
        const m = o.delivery_address.match(COORDS_RE);
        if (m) parsed.push({ ...o, lat: parseFloat(m[1]), lon: parseFloat(m[2]) });
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
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-xl font-bold">🗺️ Pedidos cerca</h1>
        <div className="flex gap-1">
          <button onClick={locateMe} className="btn-ghost !px-2" title="Mi ubicación">
            <Crosshair className="h-4 w-4" />
          </button>
          <button onClick={load} className="btn-ghost !px-2" title="Refrescar">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {error && <div className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</div>}

      {myPos && (
        <div className="mb-3 flex items-center gap-3 rounded-lg bg-white p-3 text-sm shadow-sm">
          <span className="font-medium">Radio:</span>
          <input
            type="range"
            min={1}
            max={20}
            value={maxKm}
            onChange={(e) => setMaxKm(parseInt(e.target.value, 10))}
            className="flex-1"
          />
          <span className="w-12 text-right font-mono">{maxKm} km</span>
        </div>
      )}

      <div className="relative h-[420px] overflow-hidden rounded-xl border border-neutral-200">
        {loading ? (
          <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-white/70">
            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
          </div>
        ) : null}
        <MapContainer center={initialCenter} zoom={13} style={{ height: "100%", width: "100%" }}>
          <BaseTileLayer />
          {/* Sólo volamos cuando el usuario obtiene su propia ubicación.
              Antes el mapa "saltaba" en cada refresh de pedidos cercanos. */}
          {myPos && <FlyToOnce position={myPos} />}
          {myPos && <Marker position={myPos} icon={meIcon} />}
          {visible.map((o) => (
            <Marker
              key={o.id}
              position={[o.lat, o.lon]}
              icon={pinIcon(o.distanceKm !== undefined ? urgencyColor(o.distanceKm) : "blue")}
            >
              <Popup>
                <div className="space-y-1 text-sm">
                  <div className="font-bold">Pedido {o.order_number}</div>
                  <div>{o.delivery_address.split(" — ")[0]}</div>
                  {o.distanceKm !== undefined && (
                    <div className="text-xs text-neutral-500">{o.distanceKm.toFixed(2)} km</div>
                  )}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="font-bold text-brand-600">{formatCurrency(o.delivery_fee)}</span>
                    <button
                      disabled={accepting === o.id}
                      onClick={() => handleAccept(o.id)}
                      className="btn-primary !py-1 !text-xs"
                    >
                      Aceptar
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
        <p className="mt-3 text-center text-xs text-neutral-500">
          💡 Activa "Mi ubicación" para ver distancia y filtrar por radio
        </p>
      )}

      <div className="mt-4 space-y-2">
        {visible.length === 0 && !loading && (
          <div className="rounded-xl border border-dashed py-8 text-center text-sm text-neutral-500">
            No hay pedidos {myPos ? `dentro de ${maxKm} km` : "disponibles"}
          </div>
        )}
        {visible.slice(0, 5).map((o) => (
          <article key={o.id} className="card flex items-center justify-between p-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-bold">
                {o.order_number}
                {o.distanceKm !== undefined && (
                  <span className="text-xs font-normal text-neutral-500">
                    · {o.distanceKm.toFixed(2)} km
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 truncate text-xs text-neutral-500">
                <MapPin className="h-3 w-3" />
                {o.delivery_address.split(" — ")[0]}
              </div>
            </div>
            <button
              disabled={accepting === o.id}
              onClick={() => handleAccept(o.id)}
              className="btn-primary !py-1.5 !text-xs"
            >
              {accepting === o.id ? <Loader2 className="h-3 w-3 animate-spin" /> : formatCurrency(o.delivery_fee)}
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
