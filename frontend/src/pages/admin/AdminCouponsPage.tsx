import { useEffect, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { listCoupons, createCoupon, type Coupon } from "@/services/coupons";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/api";

type FormState = {
  code: string;
  description: string;
  discount_percent: string;
  discount_amount: string;
  min_order_amount: string;
  max_uses: string;
};

const EMPTY: FormState = {
  code: "",
  description: "",
  discount_percent: "",
  discount_amount: "",
  min_order_amount: "0",
  max_uses: "100",
};

export function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    listCoupons()
      .then(setCoupons)
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    try {
      await createCoupon({
        code: form.code.toUpperCase().trim(),
        description: form.description || undefined,
        discount_percent: form.discount_percent ? parseFloat(form.discount_percent) : undefined,
        discount_amount: form.discount_amount ? parseFloat(form.discount_amount) : undefined,
        min_order_amount: parseFloat(form.min_order_amount || "0"),
        max_uses: parseInt(form.max_uses || "1", 10),
      });
      setForm(null);
      load();
    } catch (e2) {
      setError(getErrorMessage(e2));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Cupones</h1>
        <button onClick={() => setForm(EMPTY)} className="btn-primary">
          <Plus className="h-4 w-4" /> Nuevo cupón
        </button>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      ) : coupons.length === 0 ? (
        <div className="rounded-xl border border-dashed py-12 text-center text-neutral-500">
          No hay cupones activos
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {coupons.map((c) => (
            <div key={c.id} className="card p-5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-lg font-bold text-brand-600">{c.code}</span>
                <span className={cn(
                  "badge",
                  c.is_active ? "bg-green-100 text-green-700" : "bg-neutral-200 text-neutral-700",
                )}>
                  {c.is_active ? "Activo" : "Inactivo"}
                </span>
              </div>
              {c.description && <p className="mt-1 text-sm text-neutral-500">{c.description}</p>}
              <div className="mt-3 text-2xl font-bold">
                {c.discount_percent ? `${c.discount_percent}%` : formatCurrency(c.discount_amount ?? 0)} off
              </div>
              <dl className="mt-3 space-y-1 text-xs text-neutral-500">
                <div>Mínimo: {formatCurrency(c.min_order_amount)}</div>
                <div>Usos: {c.current_uses} / {c.max_uses}</div>
                {c.expires_at && <div>Expira: {formatDate(c.expires_at)}</div>}
              </dl>
            </div>
          ))}
        </div>
      )}

      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={handleCreate} className="w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Nuevo cupón</h2>
              <button type="button" onClick={() => setForm(null)} className="rounded-lg p-2 hover:bg-neutral-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <Field label="Código (ej: WELCOME20)">
              <input required className="input-base uppercase" value={form.code}
                     onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </Field>
            <Field label="Descripción (opcional)">
              <input className="input-base" value={form.description}
                     onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="% descuento">
                <input type="number" step="0.01" className="input-base" value={form.discount_percent}
                       onChange={(e) => setForm({ ...form, discount_percent: e.target.value, discount_amount: "" })} />
              </Field>
              <Field label="o S/ fijo">
                <input type="number" step="0.01" className="input-base" value={form.discount_amount}
                       onChange={(e) => setForm({ ...form, discount_amount: e.target.value, discount_percent: "" })} />
              </Field>
              <Field label="Mínimo de orden">
                <input type="number" step="0.01" className="input-base" value={form.min_order_amount}
                       onChange={(e) => setForm({ ...form, min_order_amount: e.target.value })} />
              </Field>
              <Field label="Usos máximos">
                <input type="number" className="input-base" value={form.max_uses}
                       onChange={(e) => setForm({ ...form, max_uses: e.target.value })} />
              </Field>
            </div>
            <div className="flex justify-end gap-2">
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-neutral-600">{label}</label>
      {children}
    </div>
  );
}
