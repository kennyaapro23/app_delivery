import { useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Star,
  Home,
  Loader2,
  X,
  MapPin,
  AlertCircle,
} from "lucide-react";
import {
  listAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  type Address,
} from "@/services/addresses";
import { LocationPicker, type Location } from "@/components/LocationPicker";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/api";

interface FormState {
  id?: number;
  label: string;
  full_address: string;
  reference: string;
  district: string;
  city: string;
  latitude?: number;
  longitude?: number;
  is_default: boolean;
}

const EMPTY: FormState = {
  label: "Casa",
  full_address: "",
  reference: "",
  district: "",
  city: "Lima",
  is_default: false,
};

const LABEL_ICONS: Record<string, string> = {
  Casa: "🏠",
  Trabajo: "💼",
  Familia: "👨‍👩‍👧",
  Otro: "📍",
};

export function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    listAddresses()
      .then(setAddresses)
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  function openCreate() {
    setForm({ ...EMPTY });
  }

  function openEdit(a: Address) {
    setForm({
      id: a.id,
      label: a.label,
      full_address: a.full_address,
      reference: a.reference ?? "",
      district: a.district ?? "",
      city: a.city ?? "",
      latitude: a.latitude ?? undefined,
      longitude: a.longitude ?? undefined,
      is_default: a.is_default,
    });
  }

  function onMapPick(loc: Location) {
    setForm((f) =>
      f
        ? { ...f, full_address: loc.address, latitude: loc.lat, longitude: loc.lon }
        : f,
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    try {
      const payload = {
        label: form.label,
        full_address: form.full_address,
        reference: form.reference || undefined,
        district: form.district || undefined,
        city: form.city || undefined,
        latitude: form.latitude,
        longitude: form.longitude,
        is_default: form.is_default,
      };
      if (form.id) {
        await updateAddress(form.id, payload);
      } else {
        await createAddress(payload);
      }
      setForm(null);
      load();
    } catch (e2) {
      setError(getErrorMessage(e2));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(a: Address) {
    if (!confirm(`¿Eliminar "${a.label}"?`)) return;
    try {
      await deleteAddress(a.id);
      load();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  async function makeDefault(a: Address) {
    try {
      await updateAddress(a.id, { is_default: true });
      load();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <MapPin className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-ink-900">
              Mis direcciones
            </h1>
            <p className="mt-0.5 text-sm text-ink-500">
              Gestiona dónde quieres recibir tus pedidos
            </p>
          </div>
        </div>
        <button onClick={openCreate} className="btn-primary shrink-0">
          <Plus className="h-4 w-4" /> Nueva dirección
        </button>
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-2 rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-5">
              <div className="flex items-center gap-2">
                <div className="skeleton h-8 w-8 rounded-full" />
                <div className="skeleton h-4 w-24 rounded" />
              </div>
              <div className="mt-4 space-y-2">
                <div className="skeleton h-3 w-full rounded" />
                <div className="skeleton h-3 w-2/3 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : addresses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-300 bg-surface-muted px-6 py-16 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-50">
            <Home className="h-10 w-10 text-brand-400" />
          </div>
          <h3 className="mt-5 font-display text-lg font-bold text-ink-800">
            Aún no has guardado direcciones
          </h3>
          <p className="mt-1 max-w-sm text-sm text-ink-500">
            Añade una dirección para que tus pedidos lleguen al lugar correcto.
          </p>
          <button onClick={openCreate} className="btn-secondary mt-5">
            <Plus className="h-4 w-4" /> Añadir primera dirección
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {addresses.map((a) => (
            <article
              key={a.id}
              className={cn(
                "card-hover flex flex-col p-5",
                a.is_default && "ring-1 ring-brand-200",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-lg">
                    {LABEL_ICONS[a.label] ?? "📍"}
                  </span>
                  <h2 className="truncate font-semibold text-ink-900">
                    {a.label}
                  </h2>
                  {a.is_default && (
                    <span className="badge badge-warn shrink-0">
                      <Star className="h-3 w-3 fill-current" /> Predeterminada
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => openEdit(a)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 transition hover:bg-ink-50 hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(a)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 transition hover:bg-danger-50 hover:text-danger-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-300"
                    title="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="mt-3 text-sm text-ink-700">{a.full_address}</p>
              {a.reference && (
                <p className="mt-1 text-xs text-ink-500">{a.reference}</p>
              )}
              {(a.district || a.city) && (
                <p className="mt-1 text-xs text-ink-400">
                  {[a.district, a.city].filter(Boolean).join(", ")}
                </p>
              )}
              {!a.is_default && (
                <button
                  onClick={() => makeDefault(a)}
                  className="mt-4 inline-flex items-center gap-1 self-start text-xs font-semibold text-brand-600 transition hover:text-brand-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-1"
                >
                  <Star className="h-3 w-3" /> Marcar como predeterminada
                </button>
              )}
            </article>
          ))}
        </div>
      )}

      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink-900/50 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSubmit}
            className="my-8 w-full max-w-2xl space-y-4 rounded-2xl border border-ink-200 bg-white p-6 shadow-pop"
          >
            <div className="flex items-center justify-between">
              <h2 className="section-title">
                {form.id ? "Editar dirección" : "Nueva dirección"}
              </h2>
              <button
                type="button"
                onClick={() => setForm(null)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 transition hover:bg-ink-50 hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
                title="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="label">Tipo</label>
                <div className="flex flex-wrap gap-2">
                  {["Casa", "Trabajo", "Familia", "Otro"].map((lbl) => (
                    <button
                      type="button"
                      key={lbl}
                      onClick={() => setForm({ ...form, label: lbl })}
                      className={cn(
                        "flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300",
                        form.label === lbl
                          ? "border-brand-500 bg-brand-50 text-brand-700"
                          : "border-ink-200 text-ink-700 hover:border-ink-300 hover:bg-ink-50",
                      )}
                    >
                      <span>{LABEL_ICONS[lbl]}</span> {lbl}
                    </button>
                  ))}
                </div>
              </div>

              <div className="col-span-2">
                <label className="label">Ubicación en el mapa</label>
                <ErrorBoundary>
                  <LocationPicker
                    value={
                      form.latitude && form.longitude
                        ? {
                            lat: form.latitude,
                            lon: form.longitude,
                            address: form.full_address,
                          }
                        : null
                    }
                    onChange={onMapPick}
                  />
                </ErrorBoundary>
              </div>

              <div>
                <label className="label">Distrito</label>
                <input
                  className="input-base"
                  value={form.district}
                  onChange={(e) => setForm({ ...form, district: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Ciudad</label>
                <input
                  className="input-base"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </div>

              <div className="col-span-2">
                <label className="label">
                  Referencia (Dpto, piso, color de puerta...)
                </label>
                <input
                  className="input-base"
                  value={form.reference}
                  onChange={(e) => setForm({ ...form, reference: e.target.value })}
                />
              </div>

              <label className="col-span-2 flex cursor-pointer items-center gap-2 text-sm text-ink-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-ink-300 text-brand-500 focus:ring-brand-300"
                  checked={form.is_default}
                  onChange={(e) =>
                    setForm({ ...form, is_default: e.target.checked })
                  }
                />
                Establecer como predeterminada
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t border-ink-100 pt-4">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setForm(null)}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving || !form.full_address}
                className="btn-primary"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {form.id ? "Guardar cambios" : "Guardar dirección"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
