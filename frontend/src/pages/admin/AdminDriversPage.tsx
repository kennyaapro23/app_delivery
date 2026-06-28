import { useEffect, useMemo, useState } from "react";
import {
  Star, MapPin, List, Map as MapIcon, X,
  Phone, Mail, FileText, Calendar, Heart, CreditCard, Car,
  AlertCircle, Bike,
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
  const color = available ? "#12b76a" : "#a8a097";
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
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-ink-900">
            Repartidores
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Consulta el equipo de reparto y su ubicación en tiempo real.
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-ink-200 bg-white p-1 shadow-card">
          <button onClick={() => setTab("list")}
                  className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300",
                                tab === "list" ? "bg-brand-500 text-white shadow-card" : "text-ink-600 hover:bg-ink-50")}>
            <List className="h-4 w-4" /> Lista
          </button>
          <button onClick={() => setTab("map")}
                  className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300",
                                tab === "map" ? "bg-brand-500 text-white shadow-card" : "text-ink-600 hover:bg-ink-50")}>
            <MapIcon className="h-4 w-4" /> Mapa
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-2 rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card space-y-4 p-5">
              <div className="flex items-center gap-3">
                <div className="skeleton h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-2/3 rounded" />
                  <div className="skeleton h-3 w-1/2 rounded" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="skeleton h-10 rounded-lg" />
                <div className="skeleton h-10 rounded-lg" />
                <div className="skeleton h-10 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : drivers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-300 bg-surface-muted px-6 py-16 text-center">
          <Bike className="h-12 w-12 text-ink-300" />
          <h3 className="mt-4 font-display text-lg font-bold text-ink-800">Aún no hay repartidores</h3>
          <p className="mt-1 text-sm text-ink-500">No hay perfiles de repartidor registrados todavía.</p>
        </div>
      ) : tab === "map" ? (
        withLocation.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-300 bg-surface-muted px-6 py-16 text-center">
            <MapPin className="h-12 w-12 text-ink-300" />
            <h3 className="mt-4 font-display text-lg font-bold text-ink-800">Sin ubicaciones</h3>
            <p className="mt-1 text-sm text-ink-500">Ningún repartidor ha reportado su ubicación todavía.</p>
          </div>
        ) : (
          <div className="relative h-[500px] overflow-hidden rounded-2xl border border-ink-200 shadow-card">
            <MapContainer center={mapCenter} zoom={12} style={{ height: "100%", width: "100%" }}>
              <BaseTileLayer />
              {withLocation.map((d) => (
                <Marker key={d.id} position={[d.latitude, d.longitude]}
                        icon={driverIcon(d.is_available)}
                        eventHandlers={{ click: () => setSelected(d) }}>
                  <Popup>
                    <div className="text-sm">
                      <div className="font-bold text-ink-900">{d.full_name}</div>
                      <div className="text-xs text-ink-500">{d.phone}</div>
                      <button onClick={() => setSelected(d)}
                              className="mt-1 text-xs font-semibold text-brand-600 hover:underline">
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
              className="card-hover group p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-brand-50 to-brand-100 text-2xl">
                    {VEHICLE_ICONS[d.vehicle_type ?? ""] ?? "🛵"}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold leading-tight text-ink-900 transition group-hover:text-brand-600">
                      {d.full_name ?? "—"}
                    </h3>
                    <p className="text-xs text-ink-500">{d.phone ?? d.email}</p>
                  </div>
                </div>
                <span className={cn("badge", d.is_available ? "badge-success" : "bg-ink-100 text-ink-600")}>
                  {d.is_available ? "Disponible" : "Offline"}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-surface-muted p-3 text-center text-sm">
                <div>
                  <div className="font-display text-lg font-bold text-ink-900">{d.total_deliveries ?? 0}</div>
                  <div className="text-xs text-ink-500">Entregas</div>
                </div>
                <div className="border-x border-ink-200">
                  <div className="flex items-center justify-center gap-1 font-display text-lg font-bold text-ink-900">
                    <Star className="h-3.5 w-3.5 fill-warn-400 text-warn-400" />
                    {(d.average_rating ?? 0).toFixed(1)}
                  </div>
                  <div className="text-xs text-ink-500">Rating</div>
                </div>
                <div>
                  <div className="font-display text-lg font-bold text-brand-600">{formatCurrency(d.total_earnings ?? 0)}</div>
                  <div className="text-xs text-ink-500">Ganado</div>
                </div>
              </div>

              {d.vehicle_plate && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-ink-500">
                  <Car className="h-3.5 w-3.5" />
                  {d.vehicle_brand} {d.vehicle_model} · {d.vehicle_plate}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ─── Modal de detalle ────────────────────────────── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/50 p-4 backdrop-blur-sm"
             onClick={() => setSelected(null)}>
          <div onClick={(e) => e.stopPropagation()}
               className="my-8 w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-pop">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 border-b border-ink-200 p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand-50 to-brand-100 text-3xl">
                  {VEHICLE_ICONS[selected.vehicle_type ?? ""] ?? "🛵"}
                </div>
                <div>
                  <h2 className="font-display text-xl font-bold text-ink-900">{selected.full_name}</h2>
                  <p className="text-sm text-ink-500">{selected.email}</p>
                  <span className={cn("badge mt-1.5", selected.is_available ? "badge-success" : "bg-ink-100 text-ink-600")}>
                    {selected.is_available ? "🟢 Disponible" : "⚫ Offline"}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelected(null)}
                      className="rounded-lg p-2 text-ink-500 transition hover:bg-ink-100 hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-3 gap-4 border-b border-ink-200 bg-surface-muted p-6">
              <Stat label="Entregas" value={selected.total_deliveries ?? 0} />
              <Stat label="Rating"
                    value={
                      <span className="inline-flex items-center gap-1">
                        <Star className="h-4 w-4 fill-warn-400 text-warn-400" />
                        {(selected.average_rating ?? 0).toFixed(1)}
                      </span>
                    } />
              <Stat label="Ganado" value={formatCurrency(selected.total_earnings ?? 0)} />
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

            <div className="flex justify-end gap-2 border-t border-ink-200 p-4">
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
      <div className="font-display text-2xl font-bold text-ink-900">{value}</div>
      <div className="text-xs text-ink-500">{label}</div>
    </div>
  );
}

function DetailSection({
  title, icon, children,
}: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ink-500">
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
    <div className="flex items-start gap-2 rounded-lg px-2 py-1.5 transition hover:bg-ink-50">
      {icon && <span className="mt-0.5 text-ink-400">{icon}</span>}
      <dt className="min-w-[110px] text-xs text-ink-500">{label}</dt>
      <dd className={cn("flex-1 text-sm text-ink-800", valueClassName, display === "—" && "text-ink-300")}>
        {display}
      </dd>
    </div>
  );
}
