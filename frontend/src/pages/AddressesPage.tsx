import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Star, Home, Loader2, X } from "lucide-react";
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
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">📍 Mis direcciones</h1>
        <button onClick={openCreate} className="btn-primary">
          <Plus className="h-4 w-4" /> Nueva dirección
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      ) : addresses.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center">
          <Home className="mx-auto h-12 w-12 text-neutral-300" />
          <p className="mt-3 text-neutral-500">Aún no has guardado direcciones</p>
          <button onClick={openCreate} className="btn-primary mt-4">
            Añadir primera dirección
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {addresses.map((a) => (
            <article key={a.id} className="card p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{LABEL_ICONS[a.label] ?? "📍"}</span>
                  <h2 className="font-semibold">{a.label}</h2>
                  {a.is_default && (
                    <span className="badge bg-brand-50 text-brand-700">
                      <Star className="h-3 w-3 fill-current" /> Predeterminada
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(a)} className="rounded-lg p-1.5 hover:bg-neutral-100" title="Editar">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDelete(a)} className="rounded-lg p-1.5 text-red-600 hover:bg-red-50" title="Eliminar">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="mt-3 text-sm">{a.full_address}</p>
              {a.reference && <p className="mt-1 text-xs text-neutral-500">{a.reference}</p>}
              {(a.district || a.city) && (
                <p className="mt-1 text-xs text-neutral-400">
                  {[a.district, a.city].filter(Boolean).join(", ")}
                </p>
              )}
              {!a.is_default && (
                <button
                  onClick={() => makeDefault(a)}
                  className="mt-3 text-xs font-medium text-brand-600 hover:underline"
                >
                  Marcar como predeterminada
                </button>
              )}
            </article>
          ))}
        </div>
      )}

      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
          <form onSubmit={handleSubmit} className="my-8 w-full max-w-2xl space-y-4 rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {form.id ? "Editar dirección" : "Nueva dirección"}
              </h2>
              <button type="button" onClick={() => setForm(null)} className="rounded-lg p-2 hover:bg-neutral-100">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-neutral-600">Tipo</label>
                <div className="flex gap-2">
                  {["Casa", "Trabajo", "Familia", "Otro"].map((lbl) => (
                    <button
                      type="button"
                      key={lbl}
                      onClick={() => setForm({ ...form, label: lbl })}
                      className={cn(
                        "flex flex-1 items-center justify-center gap-1 rounded-lg border px-3 py-2 text-sm font-medium",
                        form.label === lbl
                          ? "border-brand-500 bg-brand-50 text-brand-700"
                          : "border-neutral-200 hover:border-neutral-300",
                      )}
                    >
                      <span>{LABEL_ICONS[lbl]}</span> {lbl}
                    </button>
                  ))}
                </div>
              </div>

              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-neutral-600">
                  Ubicación en el mapa
                </label>
                <ErrorBoundary>
                  <LocationPicker
                    value={form.latitude && form.longitude ? {
                      lat: form.latitude, lon: form.longitude, address: form.full_address,
                    } : null}
                    onChange={onMapPick}
                  />
                </ErrorBoundary>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">Distrito</label>
                <input className="input-base" value={form.district}
                       onChange={(e) => setForm({ ...form, district: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">Ciudad</label>
                <input className="input-base" value={form.city}
                       onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>

              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-neutral-600">
                  Referencia (Dpto, piso, color de puerta...)
                </label>
                <input className="input-base" value={form.reference}
                       onChange={(e) => setForm({ ...form, reference: e.target.value })} />
              </div>

              <label className="col-span-2 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.is_default}
                       onChange={(e) => setForm({ ...form, is_default: e.target.checked })} />
                Establecer como predeterminada
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={() => setForm(null)}>Cancelar</button>
              <button type="submit" disabled={saving || !form.full_address} className="btn-primary">
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
