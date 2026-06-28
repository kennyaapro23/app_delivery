import { useEffect, useState } from "react";
import {
  Loader2,
  AlertCircle,
  CheckCircle,
  Store,
  MapPin,
  Phone,
  Building2,
} from "lucide-react";
import { LocationPicker, type Location } from "@/components/LocationPicker";
import {
  getStoreConfig,
  updateStoreConfig,
  type StoreConfig,
} from "@/services/storeConfig";
import { getErrorMessage } from "@/lib/api";

interface FormState {
  name: string;
  address: string;
  phone: string;
  latitude: number;
  longitude: number;
}

export function AdminStoreConfigPage() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    getStoreConfig()
      .then((cfg: StoreConfig) => {
        if (cancelled) return;
        setForm({
          name: cfg.name ?? "",
          address: cfg.address ?? "",
          phone: cfg.phone ?? "",
          latitude: cfg.latitude,
          longitude: cfg.longitude,
        });
      })
      .catch((e) => {
        if (!cancelled) setLoadError(getErrorMessage(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // El LocationPicker entrega lat/lon y una dirección sugerida por el reverse
  // geocoding. La dirección debe SEGUIR al pin: si el geocoding devuelve algo,
  // actualizamos el texto (así no queda una dirección vieja de otra ciudad
  // cuando se mueve el pin). Si el geocoding falla (vacío), conservamos la
  // dirección previa para no perder texto.
  function handleLocationChange(loc: Location) {
    setForm((prev) =>
      prev
        ? {
            ...prev,
            latitude: loc.lat,
            longitude: loc.lon,
            address: loc.address.trim() ? loc.address : prev.address,
          }
        : prev,
    );
    setSuccess(false);
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    setSuccess(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setError(null);
    setSuccess(false);

    if (!form.name.trim()) {
      setError("El nombre del restaurante es obligatorio.");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateStoreConfig({
        name: form.name.trim(),
        address: form.address.trim() || null,
        phone: form.phone.trim() || null,
        latitude: form.latitude,
        longitude: form.longitude,
      });
      setForm({
        name: updated.name ?? "",
        address: updated.address ?? "",
        phone: updated.phone ?? "",
        latitude: updated.latitude,
        longitude: updated.longitude,
      });
      setSuccess(true);
    } catch (e2) {
      setError(getErrorMessage(e2));
    } finally {
      setSaving(false);
    }
  }

  const pickerValue: Location | null = form
    ? { lat: form.latitude, lon: form.longitude, address: form.address }
    : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-start gap-3">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <Store className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-ink-900">
            Ubicación del restaurante
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Fija en el mapa dónde se encuentra tu local. Este pin se mostrará en
            los mapas de clientes y repartidores.
          </p>
        </div>
      </div>

      {loadError && (
        <div className="mb-6 flex items-start gap-2 rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {loadError}
        </div>
      )}

      {loading ? (
        <StoreConfigSkeleton />
      ) : form ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </div>
          )}
          {success && (
            <div className="flex items-start gap-2 rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
              Ubicación del restaurante guardada correctamente.
            </div>
          )}

          {/* Datos del local */}
          <section className="card p-6">
            <h2 className="section-title mb-4">Datos del local</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label flex items-center gap-1.5" htmlFor="store-name">
                  <Building2 className="h-3.5 w-3.5 text-ink-400" />
                  Nombre del restaurante
                </label>
                <input
                  id="store-name"
                  className="input-base"
                  placeholder="Chikenhot"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label flex items-center gap-1.5" htmlFor="store-address">
                  <MapPin className="h-3.5 w-3.5 text-ink-400" />
                  Dirección
                </label>
                <input
                  id="store-address"
                  className="input-base"
                  placeholder="Av. Larco 123, Miraflores"
                  value={form.address}
                  onChange={(e) => update("address", e.target.value)}
                />
                <p className="mt-1 text-xs text-ink-400">
                  Se sugiere automáticamente al mover el pin si está vacía.
                </p>
              </div>
              <div className="sm:col-span-2">
                <label className="label flex items-center gap-1.5" htmlFor="store-phone">
                  <Phone className="h-3.5 w-3.5 text-ink-400" />
                  Teléfono
                </label>
                <input
                  id="store-phone"
                  type="tel"
                  className="input-base"
                  placeholder="+51 999 999 999"
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* Ubicación en el mapa */}
          <section className="card p-6">
            <div className="mb-4">
              <h2 className="section-title">Posición en el mapa</h2>
              <p className="mt-1 text-sm text-ink-500">
                Busca tu dirección, toca o arrastra el pin para ajustar la
                ubicación exacta del local.
              </p>
            </div>
            <LocationPicker value={pickerValue} onChange={handleLocationChange} />
          </section>

          <div className="flex items-center justify-end gap-3">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? "Guardando…" : "Guardar ubicación"}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

function StoreConfigSkeleton() {
  return (
    <div className="space-y-6">
      <div className="card space-y-4 p-6">
        <div className="skeleton h-5 w-40 rounded" />
        <div className="space-y-2">
          <div className="skeleton h-4 w-32 rounded" />
          <div className="skeleton h-10 w-full rounded-lg" />
        </div>
        <div className="space-y-2">
          <div className="skeleton h-4 w-24 rounded" />
          <div className="skeleton h-10 w-full rounded-lg" />
        </div>
        <div className="space-y-2">
          <div className="skeleton h-4 w-20 rounded" />
          <div className="skeleton h-10 w-full rounded-lg" />
        </div>
      </div>
      <div className="card space-y-4 p-6">
        <div className="skeleton h-5 w-48 rounded" />
        <div className="skeleton h-10 w-full rounded-lg" />
        <div className="skeleton h-72 w-full rounded-xl" />
        <div className="skeleton h-14 w-full rounded-xl" />
      </div>
      <div className="flex justify-end">
        <div className="skeleton h-10 w-44 rounded-lg" />
      </div>
    </div>
  );
}
