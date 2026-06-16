import { useEffect, useRef, useState } from "react";
import { MapContainer, Marker, useMap, useMapEvents } from "react-leaflet";
import { BaseTileLayer } from "@/components/BaseTileLayer";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Crosshair, Loader2, MapPin, Search } from "lucide-react";
import {
  reverseGeocode,
  searchAddress,
  formatShortAddress,
  type GeocodeResult,
} from "@/services/geocoding";

// Fix iconos de Leaflet en bundlers (Vite no resuelve las URLs por defecto).
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Lima centro por defecto.
const DEFAULT_CENTER: [number, number] = [-12.0464, -77.0428];

export interface Location {
  lat: number;
  lon: number;
  address: string;
}

interface Props {
  value?: Location | null;
  onChange: (loc: Location) => void;
}

export function LocationPicker({ value, onChange }: Props) {
  const [position, setPosition] = useState<[number, number]>(
    value ? [value.lat, value.lon] : DEFAULT_CENTER,
  );
  const [resolving, setResolving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<number | null>(null);

  // Sincroniza la posición interna cuando el padre cambia `value` (p.ej. al
  // abrir el formulario "Editar dirección" con lat/lon previas). Sin esto,
  // `position` queda fijado en DEFAULT_CENTER y el reverseGeocode pisaría la
  // dirección real con la de Lima centro.
  useEffect(() => {
    if (!value) return;
    setPosition((prev) => {
      if (
        Math.abs(prev[0] - value.lat) < 1e-6 &&
        Math.abs(prev[1] - value.lon) < 1e-6
      ) {
        return prev;
      }
      return [value.lat, value.lon];
    });
  }, [value?.lat, value?.lon]);

  // Resolver dirección al cambiar la posición. Debounce 500ms para no martillar
  // a Nominatim (límite 1 req/seg) en drags/clicks rápidos del usuario.
  useEffect(() => {
    const controller = new AbortController();
    setResolving(true);
    const handle = window.setTimeout(() => {
      reverseGeocode(position[0], position[1], controller.signal)
        .then((r) => {
          if (r) onChange({ lat: r.lat, lon: r.lon, address: formatShortAddress(r) });
        })
        .catch(() => {})
        .finally(() => setResolving(false));
    }, 500);
    return () => {
      controller.abort();
      window.clearTimeout(handle);
    };
  }, [position[0], position[1]]);

  function handleUseMyLocation() {
    if (!navigator.geolocation) {
      alert("Tu navegador no soporta geolocalización");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition([pos.coords.latitude, pos.coords.longitude]);
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        alert(`No se pudo obtener tu ubicación: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  // Búsqueda con debounce.
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (search.trim().length < 3) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    debounceRef.current = window.setTimeout(() => {
      setSearching(true);
      searchAddress(search, controller.signal)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 400);
    return () => {
      controller.abort();
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [search]);

  function pickResult(r: GeocodeResult) {
    setPosition([r.lat, r.lon]);
    setSearch("");
    setResults([]);
  }

  return (
    <div className="space-y-3">
      {/* Buscador */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <input
          className="input-base pl-10"
          placeholder="Buscar dirección (ej: Av. Larco 123, Miraflores)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-neutral-400" />
        )}
        {results.length > 0 && (
          <ul className="absolute z-[1000] mt-1 max-h-60 w-full overflow-auto rounded-lg border border-neutral-200 bg-white shadow-lg">
            {results.map((r, i) => (
              <li key={`${r.lat}-${r.lon}-${i}`}>
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-neutral-50"
                  onClick={() => pickResult(r)}
                >
                  <div className="font-medium">{formatShortAddress(r)}</div>
                  <div className="truncate text-xs text-neutral-500">{r.display_name}</div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Mapa */}
      <div className="relative h-72 overflow-hidden rounded-xl border border-neutral-200">
        <MapContainer
          center={position}
          zoom={16}
          scrollWheelZoom
          style={{ height: "100%", width: "100%" }}
        >
          <BaseTileLayer />
          <MarkerLayer position={position} onChange={setPosition} />
          <Recenter position={position} />
        </MapContainer>

        <button
          type="button"
          onClick={handleUseMyLocation}
          disabled={locating}
          className="absolute right-3 top-3 z-[1000] inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold shadow hover:bg-neutral-50 disabled:opacity-50"
          title="Usar mi ubicación"
        >
          {locating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Crosshair className="h-3.5 w-3.5" />
          )}
          Mi ubicación
        </button>
      </div>

      {/* Dirección resuelta */}
      <div className="rounded-lg bg-neutral-50 px-3 py-2 text-sm">
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
          <div className="flex-1">
            {resolving && !value ? (
              <span className="text-neutral-400">Resolviendo dirección…</span>
            ) : value ? (
              <>
                <p className="font-medium">{value.address}</p>
                <p className="text-xs text-neutral-500">
                  {value.lat.toFixed(6)}, {value.lon.toFixed(6)}
                </p>
              </>
            ) : (
              <span className="text-neutral-400">
                Haz click en el mapa o busca tu dirección
              </span>
            )}
          </div>
          {resolving && value && <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />}
        </div>
      </div>
    </div>
  );
}

function MarkerLayer({
  position,
  onChange,
}: {
  position: [number, number];
  onChange: (p: [number, number]) => void;
}) {
  useMapEvents({
    click(e) {
      onChange([e.latlng.lat, e.latlng.lng]);
    },
  });
  return (
    <Marker
      position={position}
      draggable
      eventHandlers={{
        dragend: (e) => {
          const m = e.target as L.Marker;
          const { lat, lng } = m.getLatLng();
          onChange([lat, lng]);
        },
      }}
    />
  );
}

function Recenter({ position }: { position: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(position, map.getZoom(), { duration: 0.6 });
  }, [position[0], position[1]]);
  return null;
}
