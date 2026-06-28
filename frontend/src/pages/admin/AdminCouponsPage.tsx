import { useEffect, useState } from "react";
import { Loader2, Plus, X, AlertCircle, Ticket, Percent, BadgeDollarSign, Clock, CalendarClock } from "lucide-react";
import { listCoupons, createCoupon, type Coupon } from "@/services/coupons";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/api";

// Modo de vencimiento elegido en el formulario.
type ExpiryMode = "none" | "24h" | "7d" | "30d" | "custom";

type FormState = {
  code: string;
  description: string;
  discount_percent: string;
  discount_amount: string;
  min_order_amount: string;
  max_uses: string;
  // Vencimiento: modo rápido (chips) o fecha/hora exacta (datetime-local).
  expiry_mode: ExpiryMode;
  expires_at_local: string;
};

const DEFAULT_MAX_USES = "100";

const EMPTY: FormState = {
  code: "",
  description: "",
  discount_percent: "",
  discount_amount: "",
  min_order_amount: "0",
  max_uses: DEFAULT_MAX_USES,
  expiry_mode: "none",
  expires_at_local: "",
};

// Accesos rápidos de duración. Cada uno suma su duración a "ahora".
const EXPIRY_PRESETS: { mode: ExpiryMode; label: string; ms: number | null }[] = [
  { mode: "24h", label: "24 horas", ms: 24 * 60 * 60 * 1000 },
  { mode: "7d", label: "7 días", ms: 7 * 24 * 60 * 60 * 1000 },
  { mode: "30d", label: "30 días", ms: 30 * 24 * 60 * 60 * 1000 },
  { mode: "none", label: "Sin vencimiento", ms: null },
];

/**
 * Resuelve la selección de vencimiento del formulario a un ISO string (o undefined
 * para "sin vencimiento"). Devuelve un error de validación si la fecha exacta no es futura.
 */
function resolveExpiresAt(form: FormState): { iso?: string; error?: string } {
  const preset = EXPIRY_PRESETS.find((p) => p.mode === form.expiry_mode);
  if (preset) {
    if (preset.ms === null) return {}; // Sin vencimiento.
    return { iso: new Date(Date.now() + preset.ms).toISOString() };
  }
  // Modo "custom": fecha/hora exacta desde el datetime-local.
  if (!form.expires_at_local) {
    return { error: "Elige una fecha y hora de vencimiento o selecciona “Sin vencimiento”." };
  }
  const date = new Date(form.expires_at_local);
  if (Number.isNaN(date.getTime())) {
    return { error: "La fecha de vencimiento no es válida." };
  }
  if (date.getTime() <= Date.now()) {
    return { error: "La fecha de vencimiento debe ser futura." };
  }
  return { iso: date.toISOString() };
}

export function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  // Error de validación local del formulario (independiente del banner global).
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    setError(null);
    listCoupons()
      .then(setCoupons)
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  function openForm() {
    setFormError(null);
    setForm(EMPTY);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;

    // Reset de errores antes de validar/enviar.
    setError(null);
    setFormError(null);

    const code = form.code.toUpperCase().trim();
    const percent = form.discount_percent ? parseFloat(form.discount_percent) : undefined;
    const amount = form.discount_amount ? parseFloat(form.discount_amount) : undefined;

    // Validación: exactamente UNO de los descuentos debe estar definido y > 0.
    const hasPercent = percent !== undefined && !Number.isNaN(percent) && percent > 0;
    const hasAmount = amount !== undefined && !Number.isNaN(amount) && amount > 0;
    if (!code) {
      setFormError("El código es obligatorio.");
      return;
    }
    if (hasPercent === hasAmount) {
      setFormError(
        hasPercent
          ? "Define solo un tipo de descuento: porcentaje o monto fijo, no ambos."
          : "Define un descuento: porcentaje (%) o monto fijo (S/), mayor a 0.",
      );
      return;
    }

    // Resuelve el vencimiento (chips o fecha exacta). Valida que sea futura si es exacta.
    const { iso: expiresAt, error: expiryError } = resolveExpiresAt(form);
    if (expiryError) {
      setFormError(expiryError);
      return;
    }

    setSaving(true);
    try {
      await createCoupon({
        code,
        description: form.description || undefined,
        discount_percent: hasPercent ? percent : undefined,
        discount_amount: hasAmount ? amount : undefined,
        min_order_amount: parseFloat(form.min_order_amount || "0"),
        // Alinea el fallback con el default del formulario.
        max_uses: parseInt(form.max_uses || DEFAULT_MAX_USES, 10),
        // Si es "sin vencimiento", expiresAt es undefined y no se envía.
        expires_at: expiresAt,
      });
      setForm(null);
      load();
    } catch (e2) {
      setFormError(getErrorMessage(e2));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-ink-900">
            Cupones
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Crea y gestiona códigos de descuento para tus clientes.
          </p>
        </div>
        <button onClick={openForm} className="btn-primary">
          <Plus className="h-4 w-4" /> Nuevo cupón
        </button>
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-2 rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card space-y-3 p-5">
              <div className="flex items-center justify-between">
                <div className="skeleton h-5 w-24 rounded" />
                <div className="skeleton h-5 w-16 rounded-full" />
              </div>
              <div className="skeleton h-8 w-20 rounded" />
              <div className="skeleton h-3 w-full rounded" />
              <div className="skeleton h-3 w-2/3 rounded" />
            </div>
          ))}
        </div>
      ) : coupons.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-300 bg-surface-muted px-6 py-16 text-center">
          <Ticket className="h-12 w-12 text-ink-300" />
          <h3 className="mt-4 font-display text-lg font-bold text-ink-800">No hay cupones activos</h3>
          <p className="mt-1 text-sm text-ink-500">Crea tu primer cupón para impulsar las ventas.</p>
          <button onClick={openForm} className="btn-secondary mt-5">
            <Plus className="h-4 w-4" /> Nuevo cupón
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {coupons.map((c) => {
            const usagePct = c.max_uses > 0 ? Math.min(100, (c.current_uses / c.max_uses) * 100) : 0;
            return (
              <div key={c.id} className="card-hover p-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-brand-300 bg-brand-50 px-2.5 py-1 font-mono text-base font-bold tracking-wide text-brand-700">
                    <Ticket className="h-3.5 w-3.5" /> {c.code}
                  </span>
                  <span className={cn("badge", c.is_active ? "badge-success" : "bg-ink-100 text-ink-600")}>
                    {c.is_active ? "Activo" : "Inactivo"}
                  </span>
                </div>
                {c.description && <p className="mt-2 text-sm text-ink-500">{c.description}</p>}
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="font-display text-2xl font-bold text-ink-900">
                    {c.discount_percent ? `${c.discount_percent}%` : formatCurrency(c.discount_amount ?? 0)}
                  </span>
                  <span className="text-sm font-medium text-ink-500">de descuento</span>
                </div>
                <dl className="mt-4 space-y-2 text-xs text-ink-500">
                  <div className="flex items-center justify-between">
                    <dt>Pedido mínimo</dt>
                    <dd className="font-medium text-ink-700">{formatCurrency(c.min_order_amount)}</dd>
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <dt>Usos</dt>
                      <dd className="font-medium text-ink-700">{c.current_uses} / {c.max_uses}</dd>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
                      <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${usagePct}%` }} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt>Vencimiento</dt>
                    <dd>
                      <CouponCountdown expiresAt={c.expires_at ?? null} />
                    </dd>
                  </div>
                </dl>
              </div>
            );
          })}
        </div>
      )}

      {form && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/50 p-4 backdrop-blur-sm">
          <form onSubmit={handleCreate} className="my-8 w-full max-w-md space-y-5 rounded-2xl bg-white p-6 shadow-pop">
            <div className="flex items-center justify-between">
              <h2 className="section-title">Nuevo cupón</h2>
              <button
                type="button"
                onClick={() => setForm(null)}
                className="rounded-lg p-2 text-ink-500 transition hover:bg-ink-100 hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {formError && (
              <div className="flex items-start gap-2 rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {formError}
              </div>
            )}

            <Field label="Código (ej: WELCOME20)">
              <input
                required
                className="input-base font-mono uppercase tracking-wide"
                value={form.code}
                // Normaliza en cada cambio para que lo enviado coincida con lo mostrado.
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().trimStart() })}
              />
            </Field>
            <Field label="Descripción (opcional)">
              <input className="input-base" value={form.description}
                     onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="% descuento" icon={<Percent className="h-3.5 w-3.5" />}>
                <input type="number" step="0.01" min="0" className="input-base" value={form.discount_percent}
                       onChange={(e) => setForm({ ...form, discount_percent: e.target.value, discount_amount: "" })} />
              </Field>
              <Field label="o S/ fijo" icon={<BadgeDollarSign className="h-3.5 w-3.5" />}>
                <input type="number" step="0.01" min="0" className="input-base" value={form.discount_amount}
                       onChange={(e) => setForm({ ...form, discount_amount: e.target.value, discount_percent: "" })} />
              </Field>
              <Field label="Mínimo de orden">
                <input type="number" step="0.01" min="0" className="input-base" value={form.min_order_amount}
                       onChange={(e) => setForm({ ...form, min_order_amount: e.target.value })} />
              </Field>
              <Field label="Usos máximos">
                <input type="number" min="1" className="input-base" value={form.max_uses}
                       onChange={(e) => setForm({ ...form, max_uses: e.target.value })} />
              </Field>
            </div>
            <p className="text-xs text-ink-400">
              Define <span className="font-medium text-ink-500">solo uno</span>: porcentaje o monto fijo.
            </p>

            {/* ===== VENCIMIENTO ===== */}
            <div className="space-y-2 border-t border-ink-100 pt-4">
              <label className="label flex items-center gap-1.5">
                <span className="text-ink-400">
                  <Clock className="h-3.5 w-3.5" />
                </span>
                Vencimiento (cupón por tiempo limitado)
              </label>
              <div className="flex flex-wrap gap-2">
                {EXPIRY_PRESETS.map((p) => {
                  const active = form.expiry_mode === p.mode;
                  return (
                    <button
                      key={p.mode}
                      type="button"
                      onClick={() =>
                        setForm({ ...form, expiry_mode: p.mode, expires_at_local: "" })
                      }
                      className={cn(
                        "chip !px-3 !py-1.5 !text-xs",
                        active && "border-brand-500 bg-brand-500 text-white hover:border-brand-500 hover:bg-brand-600",
                      )}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
              <div>
                <label className="label flex items-center gap-1.5 text-xs">
                  <span className="text-ink-400">
                    <CalendarClock className="h-3.5 w-3.5" />
                  </span>
                  O fecha y hora exacta
                </label>
                <input
                  type="datetime-local"
                  className="input-base"
                  value={form.expires_at_local}
                  // Al escribir una fecha exacta, el modo pasa a "custom".
                  onChange={(e) =>
                    setForm({ ...form, expiry_mode: "custom", expires_at_local: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-ink-100 pt-4">
              <button type="button" className="btn-ghost" onClick={() => setForm(null)}>Cancelar</button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Crear cupón
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Field({ label, children, icon }: { label: string; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div>
      <label className="label flex items-center gap-1.5">
        {icon && <span className="text-ink-400">{icon}</span>}
        {label}
      </label>
      {children}
    </div>
  );
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** Texto legible del tiempo restante ("3d 4h", "5h 12m", "8m", "Vence hoy"). */
function formatRemaining(ms: number): string {
  const days = Math.floor(ms / DAY_MS);
  const hours = Math.floor((ms % DAY_MS) / HOUR_MS);
  const minutes = Math.floor((ms % HOUR_MS) / (60 * 1000));
  if (days > 0) return `Vence en ${days}d ${hours}h`;
  if (hours > 0) return `Vence en ${hours}h ${minutes}m`;
  if (minutes > 0) return `Vence en ${minutes}m`;
  return "Vence hoy";
}

/**
 * Cuenta regresiva en vivo del vencimiento de un cupón. Se actualiza cada segundo
 * con setInterval (limpiado en cleanup). Color de advertencia cuando quedan <24h.
 */
function CouponCountdown({ expiresAt }: { expiresAt: string | null }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    // Sin vencimiento: no hace falta el temporizador.
    if (!expiresAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  if (!expiresAt) {
    return <span className="badge bg-ink-100 text-ink-600">Sin vencimiento</span>;
  }

  const target = new Date(expiresAt).getTime();
  if (Number.isNaN(target)) {
    return <span className="badge bg-ink-100 text-ink-600">Sin vencimiento</span>;
  }

  const remaining = target - now;

  if (remaining <= 0) {
    return (
      <span className="badge badge-danger" title={formatDate(expiresAt)}>
        Vencido
      </span>
    );
  }

  // Advertencia cuando queda menos de 24h.
  const urgent = remaining < DAY_MS;
  return (
    <span className={cn("badge", urgent ? "badge-warn" : "badge-success")} title={formatDate(expiresAt)}>
      {formatRemaining(remaining)}
    </span>
  );
}
