import { useEffect, useMemo, useState } from "react";
import {
  Loader2, Star, MapPin, List, Map as MapIcon, X,
  Phone, Mail, FileText, Calendar, Heart, CreditCard, Car,
} from "lucide-react";
import { MapContainer, Marker, Popup } from "react-leaflet";
import { BaseTileLayer } from "@/components/BaseTileLayer";
import { TileStyleSwitcher } from "@/components/TileStyleSwitcher";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { listAllDrivers, type DriverProfile } from "@/services/delivery";
import { formatCurrency, cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/api";

const DEFAULT_CENTER: [number, number] = [-12.0464, -77.0428];

function driverIcon(available: boolean) {
  const color = available ? "#10b981" : "#9ca3af";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
      <circle cx="18" cy="18" r="14" fill="${color}" stroke="white" stroke-width="3"/>
      <text x="18" y="23" text-anchor="middle" font-size="16">🛵</text>
    </svg>`;
  return L.divIcon({
    html: svg, className: "",
    iconSize: [36, 36], iconAnchor: [18, 18], popupAnchor: [0, -18],
  });
}

const VEHICLE_ICONS: Record<string, string> = {
  moto: "🏍️", bicicleta: "🚲", auto: "🚗",
};

export function AdminDriversPage() {
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"list" | "map">("list");
  const [selected, setSelected] = useState<DriverProfile | null>(null);

  useEffect(() => {
    listAllDrivers()
      .then(setDrivers)
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  const withLocation = useMemo(
    () =>
      drivers.filter(
        (d): d is DriverProfile & { latitude: number; longitude: number } =>
          d.latitude != null && d.longitude != null,
      ),
    [drivers],
  );

  const mapCenter: [number, number] =
    withLocation.length > 0
      ? [withLocation[0].latitude, withLocation[0].longitude]
      : DEFAULT_CENTER;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Repartidores</h1>
        <div className="inline-flex rounded-lg border border-neutral-200 bg-white p-1">
          <button onClick={() => setTab("list")}
                  className={cn("inline-flex items-center gap-1 rounded-md px-3 py-1 text-sm font-medium transition",
                                tab === "list" ? "bg-brand-500 text-white" : "text-neutral-600 hover:bg-neutral-100")}>
            <List className="h-4 w-4" /> Lista
          </button>
          <button onClick={() => setTab("map")}
                  className={cn("inline-flex items-center gap-1 rounded-md px-3 py-1 text-sm font-medium transition",
                                tab === "map" ? "bg-brand-500 text-white" : "text-neutral-600 hover:bg-neutral-100")}>
            <MapIcon className="h-4 w-4" /> Mapa
          </button>
        </div>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      ) : drivers.length === 0 ? (
        <div className="rounded-xl border border-dashed py-12 text-center text-neutral-500">
          No hay perfiles de repartidor todavía
        </div>
      ) : tab === "map" ? (
        withLocation.length === 0 ? (
          <div className="rounded-xl border border-dashed py-16 text-center text-neutral-500">
            <MapPin className="mx-auto h-10 w-10 text-neutral-300" />
            <p className="mt-2">Ningún repartidor ha reportado ubicación todavía.</p>
          </div>
        ) : (
          <div className="relative h-[500px] overflow-hidden rounded-xl border border-neutral-200">
            <MapContainer center={mapCenter} zoom={12} style={{ height: "100%", width: "100%" }}>
              <BaseTileLayer />
              {withLocation.map((d) => (
                <Marker key={d.id} position={[d.latitude, d.longitude]}
                        icon={driverIcon(d.is_available)}
                        eventHandlers={{ click: () => setSelected(d) }}>
                  <Popup>
                    <div className="text-sm">
                      <div className="font-bold">{d.full_name}</div>
                      <div className="text-xs text-neutral-500">{d.phone}</div>
                      <button onClick={() => setSelected(d)}
                              className="mt-1 text-xs text-brand-600 hover:underline">
                        Ver detalle →
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
            <TileStyleSwitcher className="left-2 top-2" />
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {drivers.map((d) => (
            <button
              key={d.id}
              onClick={() => setSelected(d)}
              className="card p-5 text-left transition hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-2xl">
                    {VEHICLE_ICONS[d.vehicle_type ?? ""] ?? "🛵"}
                  </div>
                  <div>
                    <h3 className="font-semibold">{d.full_name ?? "—"}</h3>
                    <p className="text-xs text-neutral-500">{d.phone ?? d.email}</p>
                  </div>
                </div>
                <span className={cn("badge",
                  d.is_available ? "bg-green-100 text-green-700" : "bg-neutral-200 text-neutral-700")}>
                  {d.is_available ? "Disponible" : "Offline"}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
                <div>
                  <div className="font-bold">{d.total_deliveries}</div>
                  <div className="text-xs text-neutral-500">Entregas</div>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-1 font-bold">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    {d.average_rating.toFixed(1)}
                  </div>
                  <div className="text-xs text-neutral-500">Rating</div>
                </div>
                <div>
                  <div className="font-bold">{formatCurrency(d.total_earnings)}</div>
                  <div className="text-xs text-neutral-500">Ganado</div>
                </div>
              </div>

              {d.vehicle_plate && (
                <div className="mt-3 flex items-center gap-1 text-xs text-neutral-500">
                  <Car className="h-3 w-3" />
                  {d.vehicle_brand} {d.vehicle_model} · {d.vehicle_plate}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ─── Modal de detalle ────────────────────────────── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4"
             onClick={() => setSelected(null)}>
          <div onClick={(e) => e.stopPropagation()}
               className="my-8 w-full max-w-3xl rounded-xl bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-neutral-200 p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 text-3xl">
                  {VEHICLE_ICONS[selected.vehicle_type ?? ""] ?? "🛵"}
                </div>
                <div>
                  <h2 className="text-xl font-bold">{selected.full_name}</h2>
                  <p className="text-sm text-neutral-500">{selected.email}</p>
                  <span className={cn("badge mt-1",
                    selected.is_available ? "bg-green-100 text-green-700" : "bg-neutral-200 text-neutral-700")}>
                    {selected.is_available ? "🟢 Disponible" : "⚫ Offline"}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelected(null)}
                      className="rounded-lg p-2 hover:bg-neutral-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-3 gap-4 border-b border-neutral-200 p-6">
              <Stat label="Entregas" value={selected.total_deliveries} />
              <Stat label="Rating"
                    value={
                      <span className="inline-flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        {selected.average_rating.toFixed(1)}
                      </span>
                    } />
              <Stat label="Ganado" value={formatCurrency(selected.total_earnings)} />
            </div>

            {/* Secciones */}
            <div className="space-y-6 p-6">
              <DetailSection title="Datos personales" icon={<FileText className="h-4 w-4" />}>
                <DetailRow icon={<Mail className="h-3.5 w-3.5" />} label="Email" value={selected.email} />
                <DetailRow icon={<Phone className="h-3.5 w-3.5" />} label="Teléfono" value={selected.phone} />
                <DetailRow icon={<FileText className="h-3.5 w-3.5" />} label="DNI" value={selected.document_id} />
                <DetailRow icon={<Calendar className="h-3.5 w-3.5" />} label="Nacimiento" value={selected.birth_date} />
                <DetailRow label="Género" value={selected.gender} />
                <DetailRow icon={<MapPin className="h-3.5 w-3.5" />} label="Dirección"
                          value={[selected.home_address, selected.home_district].filter(Boolean).join(", ")} />
              </DetailSection>

              <DetailSection title="Contacto de emergencia" icon={<Heart className="h-4 w-4" />}>
                <DetailRow label="Nombre" value={selected.emergency_contact_name} />
                <DetailRow icon={<Phone className="h-3.5 w-3.5" />} label="Teléfono" value={selected.emergency_contact_phone} />
                <DetailRow label="Relación" value={selected.emergency_contact_relation} />
              </DetailSection>

              <DetailSection title="Vehículo" icon={<Car className="h-4 w-4" />}>
                <DetailRow label="Tipo"
                          value={selected.vehicle_type && `${VEHICLE_ICONS[selected.vehicle_type] ?? ""} ${selected.vehicle_type}`} />
                <DetailRow label="Marca / Modelo"
                          value={[selected.vehicle_brand, selected.vehicle_model].filter(Boolean).join(" ")} />
                <DetailRow label="Año" value={selected.vehicle_year} />
                <DetailRow label="Color" value={selected.vehicle_color} />
                <DetailRow label="Placa"
                          value={selected.vehicle_plate}
                          valueClassName="font-mono font-bold uppercase" />
                <DetailRow label="Licencia"
                          value={[selected.license_number, selected.license_expiry && `vence ${selected.license_expiry}`].filter(Boolean).join(" — ")} />
                <DetailRow label="Seguro / SOAT"
                          value={[selected.insurance_number, selected.insurance_expiry && `vence ${selected.insurance_expiry}`].filter(Boolean).join(" — ")} />
              </DetailSection>

              <DetailSection title="Información bancaria" icon={<CreditCard className="h-4 w-4" />}>
                <DetailRow label="Banco" value={selected.bank_name} />
                <DetailRow label="Tipo de cuenta" value={selected.bank_account_type} />
                <DetailRow label="N° de cuenta" value={selected.bank_account} valueClassName="font-mono" />
                <DetailRow label="CCI" value={selected.bank_cci} valueClassName="font-mono" />
                <DetailRow label="Titular" value={selected.bank_account_holder} />
              </DetailSection>

              {selected.latitude != null && (
                <DetailSection title="Última ubicación" icon={<MapPin className="h-4 w-4" />}>
                  <DetailRow label="Zona" value={selected.current_zone} />
                  <DetailRow label="Coordenadas"
                            value={`${selected.latitude?.toFixed(6)}, ${selected.longitude?.toFixed(6)}`}
                            valueClassName="font-mono text-xs" />
                </DetailSection>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-neutral-200 p-4">
              <button onClick={() => setSelected(null)} className="btn-ghost">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-neutral-500">{label}</div>
    </div>
  );
}

function DetailSection({
  title, icon, children,
}: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-neutral-500">
        <span className="text-brand-500">{icon}</span>
        {title}
      </h3>
      <dl className="grid grid-cols-1 gap-1 sm:grid-cols-2">{children}</dl>
    </div>
  );
}

function DetailRow({
  icon, label, value, valueClassName,
}: {
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}) {
  const display = value === null || value === undefined || value === "" ? "—" : value;
  return (
    <div className="flex items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-neutral-50">
      {icon && <span className="mt-0.5 text-neutral-400">{icon}</span>}
      <dt className="min-w-[110px] text-xs text-neutral-500">{label}</dt>
      <dd className={cn("flex-1 text-sm", valueClassName, display === "—" && "text-neutral-300")}>
        {display}
      </dd>
    </div>
  );
}
