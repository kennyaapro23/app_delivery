import { useEffect } from "react";
import { MapContainer, Marker, Popup, useMap } from "react-leaflet";
import { BaseTileLayer } from "@/components/BaseTileLayer";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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

  return (
    <div style={{ height }} className="overflow-hidden rounded-xl border border-neutral-200">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <BaseTileLayer />
        <FitBounds pins={pins} />
        {pins.map((p, i) => (
          <Marker key={`${p.lat}-${p.lon}-${i}`} position={[p.lat, p.lon]} icon={pinIcon(p.color)}>
            {p.label && <Popup>{p.label}</Popup>}
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

function FitBounds({ pins }: { pins: MapPin[] }) {
  const map = useMap();
  useEffect(() => {
    if (pins.length === 0) return;
    if (pins.length === 1) {
      map.setView([pins[0].lat, pins[0].lon], 15);
      return;
    }
    const bounds = L.latLngBounds(pins.map((p) => [p.lat, p.lon] as [number, number]));
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [pins, map]);
  return null;
}
