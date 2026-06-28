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

  // Auto-detectar GPS al montar si no hay ubicación previa.
  useEffect(() => {
    if (value) return;
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setPosition([pos.coords.latitude, pos.coords.longitude]),
      () => {}, // si falla, queda en Lima Centro
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

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
          // Emitir SIEMPRE las coordenadas reales del pin (no las del geocoder,
          // que las "encaja" al objeto más cercano). El reverse solo sirve para
          // sugerir la dirección; si falla, igual conservamos lat/lon correctas.
          onChange({
            lat: position[0],
            lon: position[1],
            address: r ? formatShortAddress(r) : "",
          });
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
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input
          className="input-base pl-10 pr-10"
          placeholder="Buscar dirección (ej: Av. Larco 123, Miraflores)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-brand-500" />
        )}
        {results.length > 0 && (
          <ul className="absolute z-[1000] mt-1.5 max-h-60 w-full overflow-auto rounded-xl border border-ink-200 bg-white p-1 shadow-pop">
            {results.map((r, i) => (
              <li key={`${r.lat}-${r.lon}-${i}`}>
                <button
                  type="button"
                  className="flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
                  onClick={() => pickResult(r)}
                >
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-ink-900">{formatShortAddress(r)}</span>
                    <span className="block truncate text-xs text-ink-500">{r.display_name}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Mapa */}
      <div className="relative h-72 overflow-hidden rounded-xl border border-ink-200 shadow-card">
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
          className="absolute right-3 top-3 z-[1000] inline-flex items-center gap-1.5 rounded-lg bg-white/90 px-3 py-1.5 text-xs font-semibold text-ink-700 shadow-pop backdrop-blur transition hover:bg-white active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          title="Usar mi ubicación"
        >
          {locating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-500" />
          ) : (
            <Crosshair className="h-3.5 w-3.5 text-brand-500" />
          )}
          {locating ? "Ubicando…" : "Mi ubicación"}
        </button>

        {/* Hint de interacción */}
        <div className="pointer-events-none absolute bottom-3 left-3 z-[1000] inline-flex items-center gap-1.5 rounded-lg bg-white/90 px-2.5 py-1 text-[11px] font-medium text-ink-600 shadow-card backdrop-blur">
          <MapPin className="h-3 w-3 text-brand-500" />
          Toca o arrastra el pin para ajustar
        </div>
      </div>

      {/* Dirección resuelta */}
      <div className="rounded-xl border border-ink-200 bg-surface-muted px-3 py-2.5 text-sm shadow-card">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50">
            <MapPin className="h-4 w-4 text-brand-500" />
          </span>
          <div className="min-w-0 flex-1">
            {resolving && !value ? (
              <span className="inline-flex items-center gap-1.5 text-ink-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Resolviendo dirección…
              </span>
            ) : value ? (
              <>
                <p className="font-medium text-ink-900">{value.address}</p>
                <p className="text-xs text-ink-500">
                  {value.lat.toFixed(6)}, {value.lon.toFixed(6)}
                </p>
              </>
            ) : (
              <span className="text-ink-400">
                Haz click en el mapa o busca tu dirección
              </span>
            )}
          </div>
          {resolving && value && <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-brand-500" />}
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
