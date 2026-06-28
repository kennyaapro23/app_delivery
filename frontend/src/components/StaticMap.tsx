import { useEffect, useState } from "react";
import { MapContainer, Marker, Popup, useMap } from "react-leaflet";
import { BaseTileLayer } from "@/components/BaseTileLayer";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getStoreConfig, type StoreConfig } from "@/services/storeConfig";
import { restaurantIcon } from "@/lib/restaurantMarker";

const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

export interface MapPin {
  lat: number;
  lon: number;
  label?: string;
  color?: "green" | "orange" | "red" | "blue";
}

function pinIcon(color: MapPin["color"]) {
  const hex = { green: "#10b981", orange: "#f97316", red: "#ef4444", blue: "#3b82f6" }[color ?? "orange"];
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="42" viewBox="0 0 30 42">
      <path fill="${hex}" stroke="white" stroke-width="2" d="M15 0 C7 0 0 7 0 15 c0 11 15 27 15 27 s15-16 15-27 C30 7 23 0 15 0 z"/>
      <circle cx="15" cy="15" r="6" fill="white"/>
    </svg>`;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [30, 42],
    iconAnchor: [15, 42],
    popupAnchor: [0, -38],
  });
}

interface Props {
  pins: MapPin[];
  height?: number | string;
  zoom?: number;
}

export function StaticMap({ pins, height = 240, zoom = 14 }: Props) {
  const center: [number, number] =
    pins.length > 0 ? [pins[0].lat, pins[0].lon] : [-12.0464, -77.0428];

  // Ubicación del restaurante (pin distintivo). Error silencioso: si no carga,
  // no se muestra el pin y los marcadores existentes siguen igual.
  const [store, setStore] = useState<StoreConfig | null>(null);
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

  return (
    <div style={{ height }} className="overflow-hidden rounded-xl border border-ink-200 shadow-card">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <BaseTileLayer />
        <FitBounds pins={pins} />
        {store && Number.isFinite(store.latitude) && Number.isFinite(store.longitude) && (
          <Marker position={[store.latitude, store.longitude]} icon={restaurantIcon}>
            <Popup>
              <span className="text-sm font-medium text-ink-900">
                🍗 {store.name}
              </span>
            </Popup>
          </Marker>
        )}
        {pins.map((p, i) => (
          <Marker key={`${p.lat}-${p.lon}-${i}`} position={[p.lat, p.lon]} icon={pinIcon(p.color)}>
            {p.label && (
              <Popup>
                <span className="text-sm font-medium text-ink-900">{p.label}</span>
              </Popup>
            )}
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

function FitBounds({ pins }: { pins: MapPin[] }) {
  const map = useMap();
  // Clave estable derivada del CONTENIDO de los pins (no de la referencia del
  // array). Muchos call-sites construyen `pins` nuevo en cada render del padre
  // (literal / `.map()`), por lo que usar `pins` como dependencia re-ejecutaba
  // fitBounds/setView en cada render, reseteando el zoom/encuadre y deshaciendo
  // el paneo o zoom manual del usuario. Con la clave por contenido el efecto
  // sólo corre cuando las coordenadas realmente cambian.
  const key = pins.map((p) => `${p.lat},${p.lon}`).join("|");
  useEffect(() => {
    if (pins.length === 0) return;
    if (pins.length === 1) {
      map.setView([pins[0].lat, pins[0].lon], 15);
      return;
    }
    const bounds = L.latLngBounds(pins.map((p) => [p.lat, p.lon] as [number, number]));
    map.fitBounds(bounds, { padding: [40, 40] });
    // `pins`/`map` se omiten a propósito: el reajuste debe dispararse sólo por
    // cambio de contenido (`key`), no por nueva referencia del array en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return null;
}
